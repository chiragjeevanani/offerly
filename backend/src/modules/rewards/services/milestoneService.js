import Redemption from '../../booking/models/Redemption.js';
import MilestoneConfig from '../models/MilestoneConfig.js';
import ScratchCard from '../models/ScratchCard.js';
import RewardsSettings from '../models/RewardsSettings.js';
import { notifyUser } from '../../user/services/notificationService.js';
import { payOutCardCredits } from './rewardCreditService.js';

export const getRewardsSettings = async () => {
  const settings = await RewardsSettings.findOne();
  return settings || RewardsSettings.create({});
};

export const isRewardsEnabled = async () => {
  const settings = await getRewardsSettings();
  return settings.enabled !== false;
};

// Progress needed for a level, in the configured metric's unit. Milestones
// created before thresholds existed used the level number as the claim count.
export const milestoneTarget = (m) => m.threshold ?? m.level;

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Asia/Kolkata, no DST
// Never issue more than this many repeat cards in one check, so a tiny
// "repeat every" on a ₹ metric can't flood a customer with cards.
const MAX_REPEAT_CARDS_PER_CHECK = 10;

/**
 * The span of time whose completed claims count towards progress. Periods are
 * calendar months / years in IST, matching how the rest of the app reports.
 * `start` null = lifetime. `resetsAt` = when progress next goes back to zero.
 */
export const getProgressWindow = (settings, now = new Date()) => {
  const mode = settings.progressWindow || 'lifetime';
  if (mode === 'rolling') {
    const days = settings.rollingDays || 90;
    return { mode, rollingDays: days, start: new Date(now.getTime() - days * DAY_MS), resetsAt: null };
  }
  if (mode === 'monthly' || mode === 'yearly') {
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear();
    const m = ist.getUTCMonth();
    const start = mode === 'monthly' ? Date.UTC(y, m, 1) : Date.UTC(y, 0, 1);
    const next = mode === 'monthly' ? Date.UTC(y, m + 1, 1) : Date.UTC(y + 1, 0, 1);
    return { mode, start: new Date(start - IST_OFFSET_MS), resetsAt: new Date(next - IST_OFFSET_MS) };
  }
  return { mode: 'lifetime', start: null, resetsAt: null };
};

const completedAt = (r) => new Date(r.scannedAt || r.updatedAt || r.createdAt);
const istDayKey = (date) => new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
// What the customer bought for, at offer prices - before wallet / referral
// credits are taken off, so paying with credits doesn't make a claim count less.
const billValue = (r) =>
  (r.totals?.final || 0) + (r.totals?.walletDiscount || 0) + (r.totals?.referralDiscount || 0);

/**
 * Applies the admin's qualifying rules to a customer's completed claims in the
 * current window and measures them in the configured metric.
 */
export const computeProgressValue = async (userId, settings, window) => {
  const claims = await Redemption.find({ customerId: userId, status: 'completed' })
    .select('merchantId totals scannedAt updatedAt createdAt')
    .lean();

  const minBill = settings.minBillValue || 0;
  const perStoreCap = settings.maxClaimsPerStorePerDay || 0;

  const inWindow = claims
    .filter((r) => !window.start || completedAt(r) >= window.start)
    .filter((r) => billValue(r) >= minBill)
    .sort((a, b) => completedAt(a) - completedAt(b));

  // Only the first N claims per store per IST day count
  const perStoreDay = new Map();
  const qualifying = perStoreCap
    ? inWindow.filter((r) => {
        const key = `${r.merchantId}|${istDayKey(completedAt(r))}`;
        const n = (perStoreDay.get(key) || 0) + 1;
        perStoreDay.set(key, n);
        return n <= perStoreCap;
      })
    : inWindow;

  let value;
  switch (settings.metric) {
    case 'spent':
      value = qualifying.reduce((s, r) => s + billValue(r), 0);
      break;
    case 'saved':
      value = qualifying.reduce((s, r) => s + (r.totals?.discount || 0), 0);
      break;
    case 'stores':
      value = new Set(qualifying.map((r) => String(r.merchantId))).size;
      break;
    default:
      value = qualifying.length;
  }
  return { value: Math.round(value), qualifyingClaims: qualifying.length };
};

const fillTemplate = (text, vars) => text.replace(/\{(\w+)\}/g, (all, key) => (key in vars ? vars[key] : all));

const notifyCardWon = async (userId, card, settings) => {
  const instant = settings.revealMode === 'instant';
  const vars = {
    level: card.milestoneLevel,
    name: card.milestoneName,
    credits: card.creditsAwarded,
  };
  const title =
    settings.notifyTitle || (instant ? '🎉 Reward Unlocked!' : '🎉 Scratch Card Unlocked!');
  const body =
    settings.notifyBody ||
    (instant
      ? 'You reached {name}! ₹{credits} has been added to your wallet.'
      : 'You reached {name}! Scratch your card to win ₹{credits} wallet credits.');

  try {
    await notifyUser(userId.toString(), {
      type: 'milestone_reward_earned',
      title: fillTemplate(title, vars),
      body: fillTemplate(body, vars),
      data: { cardId: card._id.toString(), milestoneLevel: String(card.milestoneLevel) },
      link: '/rewards',
    });
  } catch (notifyErr) {
    console.error('[MilestoneService] Notification error (non-blocking):', notifyErr);
  }
};

/**
 * Issues one card unless the customer already has a matching one in the
 * current window. Upsert so two claims completing together can't both issue
 * it ($setOnInsert leaves an existing card untouched). Returns the new card or null.
 */
const issueCard = async ({ userId, dedupe, window, settings, fields }) => {
  const instant = settings.revealMode === 'instant';
  const now = new Date();
  const filter = { userId, ...dedupe };
  if (window.start) filter.createdAt = { $gte: window.start };

  const result = await ScratchCard.findOneAndUpdate(
    filter,
    {
      $setOnInsert: {
        userId,
        ...fields,
        rewardSnapshot: {
          title: `₹${fields.creditsAwarded} wallet credits`,
          description: 'Added to your wallet - use them on your next claim.',
          discountType: 'credits',
          discountValue: fields.creditsAwarded,
          couponCode: '',
          image: '',
        },
        status: instant ? 'scratched' : 'unscratched',
        scratchedAt: instant ? now : null,
        expiresAt:
          !instant && settings.cardExpiryDays > 0
            ? new Date(now.getTime() + settings.cardExpiryDays * DAY_MS)
            : null,
      },
    },
    { upsert: true, new: true, includeResultMetadata: true }
  );

  if (result.lastErrorObject?.updatedExisting) return null;

  const card = result.value;
  if (instant) await payOutCardCredits(card, settings);
  await notifyCardWon(userId, card, settings);
  return card;
};

/**
 * Checks and awards any earned milestone / repeat cards for a user.
 * Triggered after an offer redemption/claim is marked completed.
 */
export const checkAndAwardMilestone = async (userId) => {
  try {
    if (!userId) return { awarded: [] };

    const settings = await getRewardsSettings();
    // Feature switched off by admin - no new scratch cards are issued
    if (settings.enabled === false) return { disabled: true, awarded: [] };

    const window = getProgressWindow(settings);
    const { value } = await computeProgressValue(userId, settings, window);

    const milestones = (await MilestoneConfig.find({ isActive: true }).lean()).sort(
      (a, b) => milestoneTarget(a) - milestoneTarget(b)
    );

    const awarded = [];

    for (const milestone of milestones) {
      if (milestoneTarget(milestone) > value) break;
      const credits = Math.floor(milestone.rewardCredits || 0);
      // No reward configured for this level - it's a badge on the roadmap only
      if (credits <= 0) continue;

      const card = await issueCard({
        userId,
        // Older cards have no kind - they count as milestone cards
        dedupe: { kind: { $ne: 'repeat' }, milestoneLevel: milestone.level },
        window,
        settings,
        fields: {
          kind: 'milestone',
          milestoneId: milestone._id,
          milestoneLevel: milestone.level,
          milestoneName: milestone.name,
          creditsAwarded: credits,
        },
      });
      if (card) awarded.push(card);
    }

    // Bonus cards every `repeatEvery` units past the top level
    const repeatCredits = Math.floor(settings.repeatCredits || 0);
    if (settings.repeatEnabled && settings.repeatEvery > 0 && repeatCredits > 0) {
      const top = milestones.length ? milestones[milestones.length - 1] : null;
      const topTarget = top ? milestoneTarget(top) : 0;
      const earned = value >= topTarget ? Math.floor((value - topTarget) / settings.repeatEvery) : 0;

      let issued = 0;
      for (let k = 1; k <= earned && issued < MAX_REPEAT_CARDS_PER_CHECK; k += 1) {
        const card = await issueCard({
          userId,
          dedupe: { kind: 'repeat', repeatIndex: k },
          window,
          settings,
          fields: {
            kind: 'repeat',
            repeatIndex: k,
            milestoneLevel: top ? top.level : 0,
            milestoneName: `Bonus Reward #${k}`,
            creditsAwarded: repeatCredits,
          },
        });
        if (card) {
          awarded.push(card);
          issued += 1;
        }
      }
    }

    return { progressValue: value, awarded };
  } catch (error) {
    console.error('[MilestoneService] checkAndAwardMilestone error:', error);
    throw error;
  }
};

/**
 * Customer's progress in the configured metric, level roadmap, and repeat info
 */
export const getUserMilestoneProgress = async (userId) => {
  const settings = await getRewardsSettings();
  const window = getProgressWindow(settings);
  const { value, qualifyingClaims } = await computeProgressValue(userId, settings, window);

  const allMilestones = (await MilestoneConfig.find({ isActive: true }).lean()).sort(
    (a, b) => milestoneTarget(a) - milestoneTarget(b)
  );
  const cardQuery = { userId };
  if (window.start) cardQuery.createdAt = { $gte: window.start };
  const windowCards = await ScratchCard.find(cardQuery).sort({ createdAt: -1 }).lean();

  const nextMilestone = allMilestones.find((m) => milestoneTarget(m) > value) || null;
  const currentMilestone = [...allMilestones].reverse().find((m) => milestoneTarget(m) <= value) || null;

  let progressPercent = 100;
  let remainingForNext = 0;
  if (nextMilestone) {
    const prevTarget = currentMilestone ? milestoneTarget(currentMilestone) : 0;
    const range = milestoneTarget(nextMilestone) - prevTarget;
    progressPercent = Math.min(100, Math.max(0, Math.round(((value - prevTarget) / range) * 100)));
    remainingForNext = milestoneTarget(nextMilestone) - value;
  }

  const roadmap = allMilestones.map((m) => {
    const card = windowCards.find((c) => c.kind !== 'repeat' && c.milestoneLevel === m.level);
    return {
      _id: m._id,
      level: m.level,
      target: milestoneTarget(m),
      name: m.name,
      description: m.description,
      badgeIcon: m.badgeIcon,
      rewardCredits: m.rewardCredits || 0,
      isUnlocked: value >= milestoneTarget(m),
      hasCard: !!card,
      cardStatus: card ? card.status : null,
      cardId: card ? card._id : null,
    };
  });

  let repeat = null;
  if (settings.repeatEnabled && settings.repeatEvery > 0 && settings.repeatCredits > 0) {
    const topTarget = allMilestones.length ? milestoneTarget(allMilestones[allMilestones.length - 1]) : 0;
    const earned = value >= topTarget ? Math.floor((value - topTarget) / settings.repeatEvery) : 0;
    repeat = {
      every: settings.repeatEvery,
      credits: settings.repeatCredits,
      startsAt: topTarget,
      nextAt: topTarget + (earned + 1) * settings.repeatEvery,
    };
  }

  return {
    metric: settings.metric || 'claims',
    progressValue: value,
    qualifyingClaims,
    progressPercent,
    remainingForNext,
    currentMilestone: currentMilestone && { ...currentMilestone, target: milestoneTarget(currentMilestone) },
    nextMilestone: nextMilestone && { ...nextMilestone, target: milestoneTarget(nextMilestone) },
    roadmap,
    repeat,
    window: {
      mode: window.mode,
      rollingDays: window.rollingDays || null,
      resetsAt: window.resetsAt,
    },
    rules: {
      minBillValue: settings.minBillValue || 0,
      maxClaimsPerStorePerDay: settings.maxClaimsPerStorePerDay || 0,
      revealMode: settings.revealMode || 'scratch',
    },
    cardsCount: {
      total: windowCards.length,
      unscratched: windowCards.filter((c) => c.status === 'unscratched').length,
      scratched: windowCards.filter((c) => c.status === 'scratched').length,
    },
  };
};

/**
 * Scratch and reveal a card - this is when its credits are paid out
 */
export const revealScratchCard = async (userId, cardId) => {
  const card = await ScratchCard.findOne({ _id: cardId, userId });

  if (!card) {
    const error = new Error('Scratch card not found');
    error.statusCode = 404;
    throw error;
  }

  if (card.status !== 'unscratched') return card;

  const now = new Date();
  if (card.expiresAt && card.expiresAt <= now) {
    await ScratchCard.updateOne({ _id: card._id, status: 'unscratched' }, { $set: { status: 'expired' } });
    const error = new Error('This scratch card has expired');
    error.statusCode = 410;
    throw error;
  }

  // Conditional flip: only the request that actually moves the card out of
  // 'unscratched' pays out, so a double tap can't credit the wallet twice.
  const scratched = await ScratchCard.findOneAndUpdate(
    { _id: cardId, userId, status: 'unscratched' },
    { $set: { status: 'scratched', scratchedAt: now } },
    { new: true }
  );
  if (!scratched) return ScratchCard.findById(cardId);

  const settings = await getRewardsSettings();
  return payOutCardCredits(scratched, settings);
};
