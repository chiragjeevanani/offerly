import Redemption from '../../booking/models/Redemption.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryRelease from '../models/DeliveryRelease.js';
import AdminNotification from '../../admin/models/AdminNotification.js';
import { emitAdminNotification } from '../../../config/socket.js';
import {
  getDeliverySettings,
  partnerLimits,
  sameCity,
  assignOrderToPartner,
  notifyPartner,
  POOL_STAGES,
} from './deliveryService.js';

// Cron, every minute (DeliverySettings.autoAssign): an order that has sat in the
// open pool for `afterMinutes` without a partner accepting it is given to one.
// Picks among online, approved partners in the order's city who have room for
// another order and haven't given this order back before - preferring those
// who didn't turn it down from the alert, then the fewest orders in hand, then
// whoever has waited longest since their last order. If nobody fits, the admin
// is told once and it is tried again every minute.

const ACTIVE = { $or: [{ status: 'pending', 'delivery.status': { $in: [...POOL_STAGES, 'picked_up'] } }, { 'delivery.status': 'returning' }] };

const alertAdminOnce = async (order, why) => {
  const claimed = await Redemption.updateOne(
    { _id: order._id, 'delivery.autoAssignAlertedAt': null },
    { $set: { 'delivery.autoAssignAlertedAt': new Date() } }
  );
  if (!claimed.modifiedCount) return;
  try {
    const note = await AdminNotification.create({
      title: 'Order waiting for a delivery partner',
      body: `#${order.internalId} (${order.delivery?.city || 'no city'}) couldn't be auto-assigned: ${why}. Assign it from Delivery Orders.`,
      type: 'delivery',
      data: { redemptionId: String(order._id) },
    });
    emitAdminNotification(note);
  } catch (err) {
    console.error('[AutoAssign] Admin alert failed:', err.message);
  }
};

const pickPartner = async (order, maxActive) => {
  const partners = await DeliveryPartner.find({ city: sameCity(order.delivery?.city), status: 'approved', isOnline: true })
    .select('name phone city lastAssignedAt')
    .lean();
  if (!partners.length) return { why: 'no partner is online in the city' };

  const ids = partners.map((p) => p._id);
  const [load, gaveBack] = await Promise.all([
    Redemption.aggregate([
      { $match: { 'delivery.partnerId': { $in: ids }, ...ACTIVE } },
      { $group: { _id: '$delivery.partnerId', n: { $sum: 1 } } },
    ]),
    DeliveryRelease.distinct('partnerId', { redemptionId: order._id }),
  ]);
  const inHand = new Map(load.map((l) => [String(l._id), l.n]));
  const released = new Set(gaveBack.map(String));
  const declined = new Set((order.delivery?.declinedBy || []).map(String));

  const fits = partners.filter((p) => (inHand.get(String(p._id)) || 0) < maxActive && !released.has(String(p._id)));
  if (!fits.length) return { why: 'every online partner is full or already gave it back' };
  fits.sort((a, b) =>
    (declined.has(String(a._id)) - declined.has(String(b._id)))
    || ((inHand.get(String(a._id)) || 0) - (inHand.get(String(b._id)) || 0))
    || ((a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0) - (b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0))
  );
  return { partner: fits[0] };
};

export const sweepAutoAssign = async (now = new Date()) => {
  const settings = await getDeliverySettings();
  if (!settings.enabled || !settings.autoAssign?.enabled) return 0;
  const afterMs = Math.min(60, Math.max(1, settings.autoAssign.afterMinutes || 5)) * 60 * 1000;
  const cutoff = new Date(now.getTime() - afterMs);
  const waiting = await Redemption.find({
    fulfillment: 'delivery',
    status: 'pending',
    'delivery.status': { $in: POOL_STAGES },
    'delivery.partnerId': null,
    $or: [
      { 'delivery.pooledAt': { $lte: cutoff } },
      { 'delivery.pooledAt': null, 'delivery.acceptedAt': { $lte: cutoff } },
    ],
  })
    .sort({ 'delivery.pooledAt': 1, 'delivery.acceptedAt': 1 })
    .limit(50);

  const { maxActive } = partnerLimits(settings);
  let assigned = 0;
  for (const order of waiting) {
    const { partner, why } = await pickPartner(order, maxActive);
    if (!partner) {
      await alertAdminOnce(order, why);
      continue;
    }
    const given = await assignOrderToPartner(order._id, partner, { auto: true });
    if (!given) continue; // a partner accepted it meanwhile
    assigned += 1;
    notifyPartner(partner._id, {
      type: 'order_assigned',
      orderId: String(given._id),
      title: 'New order assigned to you',
      body: `#${given.internalId} is yours. Head to the store to pick it up.`,
      urgent: true,
    });
  }
  return assigned;
};
