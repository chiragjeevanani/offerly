import BlueTickSettings from '../../admin/models/BlueTickSettings.js';
import Merchant from '../models/Merchant.js';
import Redemption from '../../booking/models/Redemption.js';
import WalkinOrder from '../../booking/models/WalkinOrder.js';
import { notifyMerchant } from '../../user/services/notificationService.js';
import { invalidateFeedCache } from '../../../utils/feedCache.js';

// The blue tick ("Offerly verified seller") is Merchant.verified. It is earned,
// not granted: a store has it while it meets every rule below that applies to
// it, and loses it when it stops. Checked hourly by the cron, when an admin
// saves the rules, and whenever the merchant opens their Blue Tick page.
//
// Rule 3 is measured on delivery orders only - pickup / dine-in passes have no
// "ready" step (the customer just shows the QR at the counter).

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const READY_WINDOW_MS = 30 * DAY_MS;

export const getBlueTickSettings = async () => (await BlueTickSettings.findOne()) || BlueTickSettings.create({});

export const shapeBlueTickSettings = (s) => ({
  enabled: s.enabled !== false,
  minRating: s.minRating,
  minReviews: s.minReviews,
  minWalkinsPerWeek: s.minWalkinsPerWeek,
  readyWithinMinutes: s.readyWithinMinutes,
  minOnTimePercent: s.minOnTimePercent,
  maxRejectionsPerWeek: s.maxRejectionsPerWeek,
  updatedAt: s.updatedAt || null,
});

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// Returns { verified, checks: [...] } for one store. `merchant` needs
// _id, status, avgRating, totalReviews, deliveryOnly.
export const evaluateBlueTick = async (merchant, settings, now = new Date()) => {
  const merchantId = merchant._id;
  const weekAgo = new Date(now.getTime() - WEEK_MS);
  const monthAgo = new Date(now.getTime() - READY_WINDOW_MS);
  const readyMs = settings.readyWithinMinutes * 60 * 1000;

  const [walkins, usedDelivery, accepted, rejections] = await Promise.all([
    merchant.deliveryOnly ? 0 : WalkinOrder.countDocuments({ merchantId, createdAt: { $gte: weekAgo } }),
    Redemption.exists({ merchantId, fulfillment: 'delivery', 'delivery.placedAt': { $gte: monthAgo } }),
    // Accepted long enough ago that the ready deadline has passed (or already
    // marked ready). Orders cancelled before they were ready aren't judged here.
    Redemption.find({
      merchantId,
      fulfillment: 'delivery',
      'delivery.acceptedAt': { $gte: monthAgo },
      $or: [
        { 'delivery.readyAt': { $exists: true } },
        { 'delivery.acceptedAt': { $lte: new Date(now.getTime() - readyMs) }, 'delivery.status': { $ne: 'cancelled' } },
      ],
    })
      .select('delivery.acceptedAt delivery.readyAt')
      .lean(),
    // Declined by the store, or placed and left unanswered until it lapsed.
    Redemption.countDocuments({
      merchantId,
      fulfillment: 'delivery',
      'delivery.cancelledAt': { $gte: weekAgo },
      $or: [
        { 'delivery.cancelledBy': 'store' },
        { 'delivery.cancelledBy': 'system', 'delivery.placedAt': { $exists: true }, 'delivery.acceptedAt': { $exists: false } },
      ],
    }),
  ]);

  const rating = round1(merchant.avgRating);
  const reviews = merchant.totalReviews || 0;
  const onTime = accepted.filter(
    (o) => o.delivery?.readyAt && new Date(o.delivery.readyAt) - new Date(o.delivery.acceptedAt) <= readyMs
  ).length;
  const onTimePercent = accepted.length ? Math.round((onTime / accepted.length) * 100) : 0;

  const checks = [
    {
      key: 'rating',
      title: `Rating of ${settings.minRating}★ or more`,
      detail: `From at least ${settings.minReviews} customer review${settings.minReviews === 1 ? '' : 's'} (pickup and delivery).`,
      applies: true,
      passed: reviews >= settings.minReviews && rating >= settings.minRating,
      current: reviews ? `${rating}★ from ${reviews} review${reviews === 1 ? '' : 's'}` : 'No reviews yet',
    },
    {
      key: 'walkins',
      title: `${settings.minWalkinsPerWeek} walk-in sale${settings.minWalkinsPerWeek === 1 ? '' : 's'} a week`,
      detail: 'Ring up counter sales in Walk-in Sale. Counted over the last 7 days.',
      applies: !merchant.deliveryOnly,
      passed: walkins >= settings.minWalkinsPerWeek,
      current: `${walkins} in the last 7 days`,
      progress: settings.minWalkinsPerWeek ? Math.min(1, walkins / settings.minWalkinsPerWeek) : 1,
      notApplicable: 'Delivery-only stores skip this.',
    },
    {
      key: 'ready',
      title: `Mark orders ready (Packed) within ${settings.readyWithinMinutes} min`,
      detail: `At least ${settings.minOnTimePercent}% of accepted delivery orders marked Packed on time after you accept them. Last 30 days.`,
      applies: accepted.length > 0,
      passed: onTimePercent >= settings.minOnTimePercent,
      current: `${onTimePercent}% on time (${onTime} of ${accepted.length})`,
      progress: settings.minOnTimePercent ? Math.min(1, onTimePercent / settings.minOnTimePercent) : 1,
      notApplicable: 'Counts once you accept delivery orders.',
    },
    {
      key: 'rejections',
      title: `No more than ${settings.maxRejectionsPerWeek} rejected order${settings.maxRejectionsPerWeek === 1 ? '' : 's'} a week`,
      detail: 'Delivery orders you declined, or left unanswered until they lapsed. Last 7 days.',
      applies: Boolean(usedDelivery),
      passed: rejections <= settings.maxRejectionsPerWeek,
      current: `${rejections} in the last 7 days`,
      notApplicable: 'Counts once you get delivery orders.',
    },
  ];

  const verified =
    settings.enabled !== false &&
    merchant.status === 'approved' &&
    checks.every((c) => !c.applies || c.passed);

  return { verified, checks };
};

// Saves a changed result: feed cache for the store's city, and tells the merchant.
const persist = async (merchant, verified, now) => {
  await Merchant.updateOne({ _id: merchant._id }, { $set: { verified, blueTickCheckedAt: now } });
  if (Boolean(merchant.verified) === verified) return false;
  invalidateFeedCache({ city: merchant.city || '' });
  notifyMerchant(merchant._id, verified
    ? { title: 'You got the blue tick! ✔', body: 'Customers now see your store as an Offerly verified seller. Keep it up to keep the tick.', type: 'blue_tick', link: '/merchant/blue-tick' }
    : { title: 'Your blue tick was removed', body: 'Your store no longer meets every blue tick rule. Open Blue Tick to see what is missing.', type: 'blue_tick', link: '/merchant/blue-tick' }
  ).catch?.(() => {});
  return true;
};

// Fresh check for one store (merchant's own page). Saves it too.
export const refreshBlueTick = async (merchantId, now = new Date()) => {
  const [merchant, settings] = await Promise.all([
    Merchant.findById(merchantId).select('status avgRating totalReviews deliveryOnly verified city').lean(),
    getBlueTickSettings(),
  ]);
  if (!merchant) return null;
  const result = await evaluateBlueTick(merchant, settings, now);
  await persist(merchant, result.verified, now);
  return { ...result, settings: shapeBlueTickSettings(settings), checkedAt: now };
};

// Every store. Returns { checked, verified, changed }.
export const refreshAllBlueTicks = async (now = new Date()) => {
  const settings = await getBlueTickSettings();
  // Only approved stores can hold the tick.
  const dropped = await Merchant.updateMany({ status: { $ne: 'approved' }, verified: true }, { $set: { verified: false } });
  const merchants = await Merchant.find({ status: 'approved' })
    .select('status avgRating totalReviews deliveryOnly verified city')
    .lean();
  let verified = 0;
  let changed = dropped.modifiedCount || 0;
  for (const m of merchants) {
    const result = await evaluateBlueTick(m, settings, now);
    if (result.verified) verified += 1;
    if (await persist(m, result.verified, now)) changed += 1;
  }
  return { checked: merchants.length, verified, changed };
};
