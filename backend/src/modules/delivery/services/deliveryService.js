import DeliverySettings from '../models/DeliverySettings.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Redemption from '../../booking/models/Redemption.js';
import Merchant from '../../merchant/models/Merchant.js';
import SettlementTransaction from '../../payment/models/SettlementTransaction.js';
import razorpay from '../../../utils/razorpay.js';
import { releaseReferralPoints } from '../../user/services/referralService.js';
import { releaseStockHold } from '../../merchant/services/stockService.js';
import { notifyMerchant, notifyUser } from '../../user/services/notificationService.js';
import { sendPushToPartner } from '../../user/services/pushService.js';
import { emitDeliveryPartnerNotification, emitDeliveryPoolUpdate } from '../../../config/socket.js';

// A delivery order lives this long once placed; the expiry cron cancels it after.
export const DELIVERY_ORDER_TTL_MS = 24 * 60 * 60 * 1000;
// How long an online-pay order waits for the payment before it is dropped.
export const PAYMENT_WINDOW_MS = 20 * 60 * 1000;
// Orders a partner can carry at once, unless the admin set otherwise.
export const DEFAULT_MAX_ACTIVE = 3;

// Stages in which the order is in the open pool (store has accepted it).
export const POOL_STAGES = ['preparing', 'ready'];
// Stages before the partner has the parcel - the order can still be cancelled.
export const CANCELLABLE_STAGES = ['awaiting_payment', 'placed', 'preparing', 'ready'];

export const getDeliverySettings = async () => (await DeliverySettings.findOne()) || DeliverySettings.create({});

// The admin's limits on partners (Delivery Settings > Delivery partners).
export const partnerLimits = (s) => ({
  maxActive: Math.max(1, s.maxActiveOrdersPerPartner || DEFAULT_MAX_ACTIVE),
  hideDropUntilAccepted: s.hideDropUntilAccepted !== false,
});

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const sameCity = (city) => new RegExp(`^${escapeRegex(String(city || '').trim())}$`, 'i');

// What the customer app needs to price and offer delivery.
export const publicDeliveryConfig = (s) => ({
  enabled: Boolean(s.enabled),
  deliveryFee: s.deliveryFee || 0,
  freeDeliveryMinOrder: s.freeDeliveryMinOrder || 0,
  allowCod: s.allowCod !== false,
  allowOnline: s.allowOnline !== false,
  maxDistanceKm: s.maxDistanceKm || 0,
  freeGift: {
    enabled: Boolean(s.freeGift?.enabled && s.freeGift?.title),
    minOrderValue: s.freeGift?.minOrderValue || 0,
    title: s.freeGift?.title || '',
    description: s.freeGift?.description || '',
    appliesTo: s.freeGift?.appliesTo || 'delivery',
  },
});

// The delivery charge for an items total (offer prices, before Offerly bonus
// and points - the same figure the customer sees as the order value).
export const deliveryFeeFor = (settings, subtotal) => {
  const min = settings.freeDeliveryMinOrder || 0;
  if (min > 0 && subtotal >= min) return 0;
  return Math.max(0, Math.round(settings.deliveryFee || 0));
};

// The admin's free gift, if this order qualifies for it.
export const giftFor = (settings, subtotal, fulfillment) => {
  const gift = settings.freeGift || {};
  if (!gift.enabled || !gift.title) return null;
  if (gift.appliesTo !== 'all' && fulfillment !== 'delivery') return null;
  if (subtotal < (gift.minOrderValue || 0)) return null;
  return { title: gift.title, description: gift.description || '' };
};

// What the customer pays in all: the items bill plus the delivery charge.
export const amountDue = (redemption) =>
  Math.max(0, Math.round((redemption.totals?.final || 0) + (redemption.delivery?.fee || 0)));

export const generateDeliveryOtp = () => String(Math.floor(1000 + Math.random() * 9000));

// A pass as the store may see it: never the customer's handover code.
export const withoutSecrets = (redemption) => {
  const data = typeof redemption?.toObject === 'function' ? redemption.toObject() : { ...redemption };
  if (data.delivery) {
    data.delivery = { ...data.delivery };
    delete data.delivery.otp;
  }
  return data;
};

// A delivery order as a partner sees it. Before they accept it, only the area
// of the drop, not the house number or phone.
export const partnerView = (order, { full = false } = {}) => {
  const o = typeof order?.toObject === 'function' ? order.toObject() : order;
  const store = o.merchantId && typeof o.merchantId === 'object' ? o.merchantId : {};
  const addr = o.delivery?.address || {};
  return {
    id: String(o._id),
    internalId: o.internalId,
    stage: o.delivery?.status,
    status: o.status,
    createdAt: o.createdAt,
    placedAt: o.delivery?.placedAt,
    readyAt: o.delivery?.readyAt,
    assignedAt: o.delivery?.assignedAt,
    pickedUpAt: o.delivery?.pickedUpAt,
    deliveredAt: o.delivery?.deliveredAt,
    store: {
      id: store._id ? String(store._id) : String(o.merchantId || ''),
      name: store.storeName || '',
      phone: full ? store.phone || '' : '',
      address: store.address || '',
      locality: store.locality || '',
      lat: store.coordinates?.lat || null,
      lng: store.coordinates?.lng || null,
    },
    drop: full
      ? {
          name: addr.name || '',
          phone: addr.phone || '',
          line1: addr.line1 || '',
          line2: addr.line2 || '',
          landmark: addr.landmark || '',
          pincode: addr.pincode || '',
          lat: addr.lat ?? null,
          lng: addr.lng ?? null,
        }
      : {
          line2: addr.line2 || '',
          landmark: addr.landmark || '',
          pincode: addr.pincode || '',
          lat: addr.lat ?? null,
          lng: addr.lng ?? null,
        },
    distanceKm: o.delivery?.distanceKm ?? null,
    addressHidden: !full,
    items: (o.items || []).map((it) => ({ name: it.product?.name || 'Item', qty: it.qty })),
    itemCount: (o.items || []).reduce((s, it) => s + (it.qty || 0), 0),
    freeGift: o.freeGift?.title ? o.freeGift : null,
    paymentMode: o.delivery?.paymentMode,
    paymentStatus: o.delivery?.paymentStatus,
    // Cash to collect at the door (0 for prepaid orders)
    collectAmount: o.delivery?.paymentMode === 'cod' ? amountDue(o) : 0,
    orderValue: amountDue(o),
    payout: o.delivery?.partnerPayout || 0,
  };
};

const pushPoolChange = (redemption, action) => {
  try {
    emitDeliveryPoolUpdate(redemption.delivery?.city, {
      type: 'pool_update',
      action,
      orderId: String(redemption._id),
    });
  } catch (err) {
    console.error('[Delivery] Pool socket emit failed:', err.message);
  }
};

// Phone push to every online, approved partner in the order's city (minus
// `except`, e.g. the partner who just gave it back). Fire-and-forget.
const pushNewOrderToCity = async (redemption, except) => {
  const partners = await DeliveryPartner.find({
    city: sameCity(redemption.delivery?.city),
    status: 'approved',
    isOnline: true,
    ...(except ? { _id: { $ne: except } } : {}),
  }).select('_id').lean();
  const items = (redemption.items || []).reduce((s, it) => s + (it.qty || 0), 0);
  const cash = redemption.delivery?.paymentMode === 'cod' ? ` · collect ₹${amountDue(redemption)}` : ' · prepaid';
  await Promise.all(partners.map((p) => sendPushToPartner(p._id, {
    title: 'New order nearby',
    body: `#${redemption.internalId} · ${items} item${items === 1 ? '' : 's'}${cash}. Tap to accept before someone else does.`,
    data: { type: 'new_order', orderId: String(redemption._id) },
    link: `/delivery/orders/${redemption._id}`,
  })));
};

// `push: false` for a re-announce that partners already heard about (packed).
export const announceToPool = (redemption, { push = true, except = null } = {}) => {
  pushPoolChange(redemption, 'added');
  if (push) {
    pushNewOrderToCity(redemption, except).catch((err) => console.error('[Delivery] Pool push failed:', err.message));
  }
};
export const withdrawFromPool = (redemption) => pushPoolChange(redemption, 'removed');

// Live socket event to the partner's open app, plus a phone push when the
// payload has a title. `link` defaults to the order, else the home screen.
export const notifyPartner = (partnerId, payload) => {
  if (!partnerId) return;
  try {
    emitDeliveryPartnerNotification(String(partnerId), payload);
  } catch (err) {
    console.error('[Delivery] Partner socket emit failed:', err.message);
  }
  if (payload?.title) {
    sendPushToPartner(String(partnerId), {
      title: payload.title,
      body: payload.body || '',
      data: { type: payload.type || 'general', ...(payload.orderId ? { orderId: payload.orderId } : {}) },
      link: payload.link || (payload.orderId ? `/delivery/orders/${payload.orderId}` : '/delivery'),
    }).catch(() => {});
  }
};

// Customer + store hear about a stage change. Never fails the caller.
export const announceStage = async (redemption, { customer, store } = {}) => {
  const data = {
    redemptionId: String(redemption._id),
    internalId: redemption.internalId || '',
    deliveryStatus: redemption.delivery?.status || '',
  };
  if (customer) {
    try {
      await notifyUser(String(redemption.customerId), {
        type: 'delivery_update',
        title: customer.title,
        body: customer.body,
        data,
        link: `/order/${redemption._id}`,
      });
    } catch (err) {
      console.error('[Delivery] Customer notification failed:', err.message);
    }
  }
  if (store) {
    try {
      await notifyMerchant(String(redemption.merchantId), {
        type: 'delivery_update',
        title: store.title,
        body: store.body,
        data,
        socketData: { ...data, ...withoutSecrets(redemption) },
        link: '/merchant/bookings',
      });
    } catch (err) {
      console.error('[Delivery] Store notification failed:', err.message);
    }
  }
};

// Gives an online payment back. Claims the order first so two callers (a
// cancel and the cron) can't both refund it. Returns the new payment status.
export const refundDeliveryPayment = async (redemption) => {
  const claimed = await Redemption.findOneAndUpdate(
    {
      _id: redemption._id,
      status: { $in: ['cancelled', 'expired'] },
      'delivery.paymentStatus': { $in: ['paid', 'refund_failed'] },
    },
    { $set: { 'delivery.paymentStatus': 'refund_pending' } },
    { new: true }
  );
  if (!claimed) return redemption.delivery?.paymentStatus;

  const amount = amountDue(claimed);
  try {
    if (!razorpay) throw new Error('Razorpay is not configured');
    if (!claimed.delivery.razorpayPaymentId) throw new Error('No payment id on this order');
    const refund = await razorpay.payments.refund(claimed.delivery.razorpayPaymentId, {
      amount: Math.round(amount * 100),
      notes: { redemptionId: String(claimed._id), internalId: claimed.internalId || '' },
    });
    await Redemption.updateOne(
      { _id: claimed._id },
      { $set: { 'delivery.paymentStatus': 'refunded', 'delivery.refundId': refund?.id || '' } }
    );
    try {
      await notifyUser(String(claimed.customerId), {
        type: 'delivery_update',
        title: 'Refund started',
        body: `₹${amount} for order #${claimed.internalId} is on its way back to you. It usually reaches you in 5-7 working days.`,
        data: { redemptionId: String(claimed._id) },
        link: `/order/${claimed._id}`,
      });
    } catch {
      // non-blocking
    }
    return 'refunded';
  } catch (err) {
    console.error(`[Delivery] Refund failed for ${claimed.internalId}:`, err?.error?.description || err.message);
    await Redemption.updateOne({ _id: claimed._id }, { $set: { 'delivery.paymentStatus': 'refund_failed' } });
    return 'refund_failed';
  }
};

// Cancels a delivery order that the partner hasn't picked up yet. Gives back
// points and stock, refunds an online payment, and tells everyone involved.
// `by` is 'customer' | 'store' | 'admin' | 'system'.
export const cancelDeliveryOrder = async (redemption, { by, reason = '' }) => {
  const updated = await Redemption.findOneAndUpdate(
    { _id: redemption._id, status: 'pending', 'delivery.status': { $in: CANCELLABLE_STAGES } },
    {
      $set: {
        status: 'cancelled',
        'delivery.status': 'cancelled',
        'delivery.cancelledAt': new Date(),
        'delivery.cancelledBy': by,
        'delivery.cancelReason': reason,
      },
    },
    { new: true }
  );
  if (!updated) return null;

  await releaseReferralPoints(updated);
  await releaseStockHold(updated);
  if (updated.delivery.paymentStatus === 'paid') await refundDeliveryPayment(updated);

  const wasInPool = POOL_STAGES.includes(redemption.delivery?.status);
  if (wasInPool && !updated.delivery.partnerId) withdrawFromPool(updated);
  if (updated.delivery.partnerId) {
    notifyPartner(updated.delivery.partnerId, {
      type: 'order_cancelled',
      orderId: String(updated._id),
      title: 'Order cancelled',
      body: `Order #${updated.internalId} was cancelled. You don't need to pick it up.`,
    });
  }

  // An unpaid online order that was never placed isn't news to anyone.
  if (redemption.delivery?.status !== 'awaiting_payment') {
    const why = reason ? ` Reason: ${reason}` : '';
    await announceStage(updated, {
      customer: by === 'customer' ? null : {
        title: 'Order cancelled',
        body: `${by === 'store' ? 'The store' : 'Offerly'} cancelled order #${updated.internalId}.${why}`,
      },
      store: by === 'store' ? null : {
        title: 'Delivery order cancelled',
        body: `Order #${updated.internalId} was cancelled${by === 'customer' ? ' by the customer' : ''}.${why}`,
      },
    });
  }
  return updated;
};

// Marks an online order paid (browser verify or webhook, whichever is first)
// and places it with the store. A payment that lands after the order lapsed is
// refunded straight away. Returns the order.
export const markDeliveryOrderPaid = async (razorpayOrderId, razorpayPaymentId) => {
  const now = new Date();
  const placed = await Redemption.findOneAndUpdate(
    {
      'delivery.razorpayOrderId': razorpayOrderId,
      status: 'pending',
      'delivery.status': 'awaiting_payment',
    },
    {
      $set: {
        'delivery.status': 'placed',
        'delivery.paymentStatus': 'paid',
        'delivery.razorpayPaymentId': razorpayPaymentId,
        'delivery.placedAt': now,
        qrExpiry: new Date(now.getTime() + DELIVERY_ORDER_TTL_MS),
      },
    },
    { new: true }
  );

  if (placed) {
    await announceNewOrderToStore(placed);
    return placed;
  }

  const order = await Redemption.findOne({ 'delivery.razorpayOrderId': razorpayOrderId });
  if (!order) return null;
  // Lapsed or cancelled before the money arrived: record it, then give it back.
  if (order.status !== 'pending' && order.delivery?.paymentStatus === 'unpaid') {
    await Redemption.updateOne(
      { _id: order._id, 'delivery.paymentStatus': 'unpaid' },
      { $set: { 'delivery.paymentStatus': 'paid', 'delivery.razorpayPaymentId': razorpayPaymentId } }
    );
    await refundDeliveryPayment(await Redemption.findById(order._id));
  }
  return Redemption.findById(order._id);
};

export const announceNewOrderToStore = async (redemption) => {
  const pay = redemption.delivery?.paymentMode === 'online' ? 'Prepaid' : 'Cash on delivery';
  try {
    await notifyMerchant(String(redemption.merchantId), {
      type: 'new_booking',
      title: 'New delivery order',
      body: `${redemption.customerName || 'A customer'} ordered for delivery (#${redemption.internalId}, ${pay}). Accept it to start packing.`,
      data: { redemptionId: String(redemption._id), internalId: redemption.internalId || '' },
      socketData: withoutSecrets(redemption),
      link: '/merchant/bookings',
    });
  } catch (err) {
    console.error('[Delivery] Store notification failed:', err.message);
  }
};

// The store is owed the items bill of a delivered order: Offerly (or its
// partner, for cash) collected it. Credited once, to the settlement wallet.
export const creditStoreForDelivery = async (redemption) => {
  const amount = Math.max(0, Math.round(redemption.totals?.final || 0));
  if (amount <= 0) return 0;
  const claimed = await Redemption.updateOne(
    { _id: redemption._id, status: 'completed', 'delivery.storeCredited': { $ne: true } },
    { $set: { 'delivery.storeCredited': true } }
  );
  if (claimed.modifiedCount === 0) return 0;

  const merchant = await Merchant.findByIdAndUpdate(
    redemption.merchantId,
    { $inc: { 'settlementWallet.balance': amount, 'settlementWallet.totalEarned': amount } },
    { new: true }
  ).select('settlementWallet');

  await SettlementTransaction.create({
    merchantId: redemption.merchantId,
    type: 'delivery_order',
    amount,
    balanceAfter: merchant?.settlementWallet?.balance || 0,
    redemptionId: redemption._id,
    note: `Delivery order #${redemption.internalId} (${redemption.delivery?.paymentMode === 'online' ? 'paid online' : 'cash collected by partner'})`,
  });
  return amount;
};

// Partner's running totals after a delivery.
export const creditPartnerForDelivery = async (redemption) => {
  const payout = Math.max(0, Math.round(redemption.delivery?.partnerPayout || 0));
  const cash = Math.max(0, Math.round(redemption.delivery?.cashCollected || 0));
  await DeliveryPartner.updateOne(
    { _id: redemption.delivery.partnerId },
    {
      $inc: {
        'stats.totalDeliveries': 1,
        'stats.totalEarnings': payout,
        'stats.earningsDue': payout,
        'stats.cashInHand': cash,
      },
    }
  );
};

// Cron: online payments on cancelled/expired orders that still need refunding,
// and delivery orders the expiry sweep just flipped (their stage too).
export const sweepLapsedDeliveryOrders = async () => {
  await Redemption.updateMany(
    { fulfillment: 'delivery', status: 'expired', 'delivery.status': { $in: CANCELLABLE_STAGES } },
    { $set: { 'delivery.status': 'cancelled', 'delivery.cancelledBy': 'system', 'delivery.cancelReason': 'Not completed in time', 'delivery.cancelledAt': new Date() } }
  );
  const toRefund = await Redemption.find({
    fulfillment: 'delivery',
    status: { $in: ['cancelled', 'expired'] },
    'delivery.paymentStatus': 'paid',
  }).limit(50);
  let refunded = 0;
  for (const order of toRefund) {
    if ((await refundDeliveryPayment(order)) === 'refunded') refunded += 1;
  }
  return refunded;
};
