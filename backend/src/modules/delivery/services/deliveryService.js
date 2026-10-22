import DeliverySettings from '../models/DeliverySettings.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryTargetAward from '../models/DeliveryTargetAward.js';
import DeliveryRelease from '../models/DeliveryRelease.js';
import Redemption from '../../booking/models/Redemption.js';
import Merchant from '../../merchant/models/Merchant.js';
import SettlementTransaction from '../../payment/models/SettlementTransaction.js';
import razorpay from '../../../utils/razorpay.js';
import { releaseReferralPoints } from '../../user/services/referralService.js';
import { releaseStockHold } from '../../merchant/services/stockService.js';
import { notifyMerchant, notifyUser } from '../../user/services/notificationService.js';
import { sendPushToPartner, sendPushToMerchant } from '../../user/services/pushService.js';
import AdminNotification from '../../admin/models/AdminNotification.js';
import { emitAdminNotification, emitDeliveryPartnerNotification, emitDeliveryPoolUpdate } from '../../../config/socket.js';

// A delivery order lives this long once placed; the expiry cron cancels it after.
export const DELIVERY_ORDER_TTL_MS = 24 * 60 * 60 * 1000;
// How long an online-pay order waits for the payment before it is dropped.
export const PAYMENT_WINDOW_MS = 20 * 60 * 1000;
// Orders a partner can carry at once, unless the admin set otherwise.
export const DEFAULT_MAX_ACTIVE = 3;

// Stages in which the order is in the open pool (store has accepted it).
export const POOL_STAGES = ['preparing', 'ready'];
// Stages before the partner has the parcel - the order can still be cancelled.
export const CANCELLABLE_STAGES = ['awaiting_payment', 'verifying', 'placed', 'preparing', 'ready'];
// Stages the store never hears about.
const HIDDEN_FROM_STORE = ['awaiting_payment', 'verifying'];

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
  adminVerification: Boolean(s.adminVerification),
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

// What an online payment gets back on cancel: everything, or the items only
// when the order was cancelled on the customer's side (feeRetained).
export const refundableAmount = (redemption) =>
  Math.max(0, amountDue(redemption) - (redemption.delivery?.feeRetained ? Math.round(redemption.delivery?.fee || 0) : 0));

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
    cancelReason: o.delivery?.cancelReason || '',
    returnStartedAt: o.delivery?.returnStartedAt,
    returnedAt: o.delivery?.returnedAt,
    supportRequestedAt: o.delivery?.supportRequestedAt,
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
    urgent: true,
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

  const amount = refundableAmount(claimed);
  if (amount <= 0) {
    await Redemption.updateOne({ _id: claimed._id }, { $set: { 'delivery.paymentStatus': 'refunded', 'delivery.refundAmount': 0 } });
    return 'refunded';
  }
  try {
    if (!razorpay) throw new Error('Razorpay is not configured');
    if (!claimed.delivery.razorpayPaymentId) throw new Error('No payment id on this order');
    const refund = await razorpay.payments.refund(claimed.delivery.razorpayPaymentId, {
      amount: Math.round(amount * 100),
      notes: { redemptionId: String(claimed._id), internalId: claimed.internalId || '' },
    });
    await Redemption.updateOne(
      { _id: claimed._id },
      { $set: { 'delivery.paymentStatus': 'refunded', 'delivery.refundId': refund?.id || '', 'delivery.refundAmount': amount } }
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
        // The customer's own cancel doesn't get the delivery fee back - unless
        // it was still waiting for Offerly's call, when nothing had started.
        'delivery.feeRetained': by === 'customer' && redemption.delivery?.status !== 'verifying',
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

  // An unpaid online order that was never placed isn't news to anyone, and the
  // store never heard of one still waiting for the admin's call.
  const storeKnew = !HIDDEN_FROM_STORE.includes(redemption.delivery?.status);
  if (redemption.delivery?.status !== 'awaiting_payment') {
    const why = reason ? ` Reason: ${reason}` : '';
    await announceStage(updated, {
      customer: by === 'customer' ? null : {
        title: 'Order cancelled',
        body: `${by === 'store' ? 'The store' : 'Offerly'} cancelled order #${updated.internalId}.${why}`,
      },
      store: by === 'store' || !storeKnew ? null : {
        title: 'Delivery order cancelled',
        body: `Order #${updated.internalId} was cancelled${by === 'customer' ? ' by the customer' : ''}.${why}`,
      },
    });
  }
  return updated;
};

/* ── Returns: the partner has the order but it can't be delivered ── */

export const RETURN_REASONS = {
  customer_refused: 'Customer refused the order',
  not_reachable: "Couldn't reach the customer",
  wrong_address: 'Wrong or unsafe address',
  other: 'Other',
};

// Turns a picked-up order into a return: the customer's order is cancelled and
// refunded straight away - in full, or without the delivery fee when the
// customer refused it or wasn't reachable (`feeRetained`) - the partner earns nothing
// for it and takes the goods back, and the store confirms receipt
// (confirmDeliveryReturn), which is when the held stock goes back on sale.
// `by` is 'partner' or 'admin'. Returns the order, or null if it wasn't picked up.
export const startDeliveryReturn = async (redemption, { by, reason = '', feeRetained = false }) => {
  const now = new Date();
  const updated = await Redemption.findOneAndUpdate(
    { _id: redemption._id, status: 'pending', 'delivery.status': 'picked_up' },
    {
      $set: {
        status: 'cancelled',
        'delivery.status': 'returning',
        'delivery.cancelledAt': now,
        'delivery.cancelledBy': by,
        'delivery.cancelReason': reason,
        'delivery.returnStartedAt': now,
        'delivery.feeRetained': Boolean(feeRetained),
      },
    },
    { new: true }
  );
  if (!updated) return null;

  await releaseReferralPoints(updated);
  const payment = updated.delivery.paymentStatus === 'paid' ? await refundDeliveryPayment(updated) : null;

  const why = reason ? ` (${reason})` : '';
  const fee = Math.round(updated.delivery.fee || 0);
  const money = payment
    ? ` ₹${refundableAmount(updated)} is being refunded${updated.delivery.feeRetained && fee > 0 ? ` (the ₹${fee} delivery fee isn't refundable)` : ''}.`
    : '';
  await announceStage(updated, {
    customer: {
      title: "Order couldn't be delivered",
      body: `We couldn't deliver order #${updated.internalId}${why}, so it's going back to the store.${money}`,
    },
    store: {
      title: 'Order coming back to you',
      body: `#${updated.internalId} couldn't be delivered${why}. ${updated.delivery.partnerName || 'The partner'} is bringing it back - tap "Received back" when you have it.`,
    },
  });
  if (by !== 'partner' && updated.delivery.partnerId) {
    notifyPartner(updated.delivery.partnerId, {
      type: 'order_returning',
      orderId: String(updated._id),
      title: 'Take the order back to the store',
      body: `Offerly cancelled #${updated.internalId}. Please return it to the store.`,
    });
  }
  return updated;
};

// The store (or an admin) has the returned goods back. `by` is 'store' or 'admin'.
export const confirmDeliveryReturn = async (redemption, { by }) => {
  const updated = await Redemption.findOneAndUpdate(
    { _id: redemption._id, 'delivery.status': 'returning' },
    { $set: { 'delivery.status': 'returned', 'delivery.returnedAt': new Date(), 'delivery.returnConfirmedBy': by } },
    { new: true }
  );
  if (!updated) return null;
  await releaseStockHold(updated);
  if (updated.delivery.partnerId) {
    notifyPartner(updated.delivery.partnerId, {
      type: 'order_returned',
      orderId: String(updated._id),
      title: 'Return complete',
      body: `The store has #${updated.internalId} back. You're done with this order.`,
    });
  }
  if (by === 'admin') {
    await announceStage(updated, {
      store: { title: 'Return closed', body: `Offerly marked #${updated.internalId} as returned to your store.` },
    });
  }
  return updated;
};

// Marks an online order paid (browser verify or webhook, whichever is first)
// and places it with the store. A payment that lands after the order lapsed is
// refunded straight away. Returns the order.
export const markDeliveryOrderPaid = async (razorpayOrderId, razorpayPaymentId) => {
  const now = new Date();
  const verify = Boolean((await getDeliverySettings()).adminVerification);
  const placed = await Redemption.findOneAndUpdate(
    {
      'delivery.razorpayOrderId': razorpayOrderId,
      status: 'pending',
      'delivery.status': 'awaiting_payment',
    },
    {
      $set: {
        'delivery.status': verify ? 'verifying' : 'placed',
        'delivery.paymentStatus': 'paid',
        'delivery.razorpayPaymentId': razorpayPaymentId,
        'delivery.placedAt': now,
        qrExpiry: new Date(now.getTime() + DELIVERY_ORDER_TTL_MS),
      },
    },
    { new: true }
  );

  if (placed) {
    await announceNewOrder(placed);
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

// A new order is in (COD at once, online once paid). With admin verification
// on it waits for the admin's call; otherwise the store hears right away.
export const announceNewOrder = async (redemption) => {
  if (redemption.delivery?.status !== 'verifying') return announceNewOrderToStore(redemption);
  try {
    const note = await AdminNotification.create({
      title: 'Delivery order to verify',
      body: `#${redemption.internalId} from ${redemption.delivery?.address?.name || redemption.customerName || 'a customer'} (${redemption.delivery?.address?.phone || 'no phone'}) is waiting for your call.`,
      type: 'delivery',
      data: { redemptionId: String(redemption._id) },
    });
    emitAdminNotification(note);
  } catch (err) {
    console.error('[Delivery] Admin notification failed:', err.message);
  }
  await announceStage(redemption, {
    customer: {
      title: 'Order received',
      body: `We have order #${redemption.internalId}. Offerly will call you shortly to confirm it before it goes to the store.`,
    },
  });
};

// Admin called the customer and the order checks out: it goes to the store.
// Returns the order, or null if it wasn't waiting for verification.
export const verifyDeliveryOrder = async (redemption, { adminId }) => {
  const now = new Date();
  const updated = await Redemption.findOneAndUpdate(
    { _id: redemption._id, status: 'pending', 'delivery.status': 'verifying' },
    {
      $set: {
        'delivery.status': 'placed',
        'delivery.verifiedAt': now,
        'delivery.verifiedBy': String(adminId || 'admin'),
        // The store's day starts now, not when the customer ordered.
        qrExpiry: new Date(now.getTime() + DELIVERY_ORDER_TTL_MS),
      },
    },
    { new: true }
  );
  if (!updated) return null;
  await announceNewOrderToStore(updated);
  await announceStage(updated, {
    customer: { title: 'Order confirmed', body: `Thanks! Order #${updated.internalId} is confirmed and sent to the store.` },
  });
  return updated;
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
      urgent: true,
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

/* ───────────────────────────── Incentive targets ───────────────────────────── */

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const TARGET_PERIODS = ['daily', 'weekly', 'monthly'];

// The IST day / Monday-start week / calendar month containing `now`.
// `key` identifies that period (its first IST day) for the once-per-period award.
export const targetWindow = (period, now = new Date()) => {
  const ist = new Date(now.getTime() + IST_OFFSET_MS); // read the UTC fields as IST
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  let start = new Date(Date.UTC(y, m, ist.getUTCDate()));
  let end = new Date(start.getTime() + DAY_MS);
  if (period === 'weekly') {
    start = new Date(start.getTime() - ((ist.getUTCDay() + 6) % 7) * DAY_MS);
    end = new Date(start.getTime() + 7 * DAY_MS);
  } else if (period === 'monthly') {
    start = new Date(Date.UTC(y, m, 1));
    end = new Date(Date.UTC(y, m + 1, 1));
  }
  return {
    key: `${period}:${start.toISOString().slice(0, 10)}`,
    start: new Date(start.getTime() - IST_OFFSET_MS),
    end: new Date(end.getTime() - IST_OFFSET_MS),
  };
};

const liveTargets = (settings) =>
  (settings.targets || []).filter((t) => t.active !== false && t.bonus > 0 && t.deliveries > 0);

const deliveredCount = (partnerId, window) =>
  Redemption.countDocuments({
    'delivery.partnerId': partnerId,
    'delivery.status': 'delivered',
    'delivery.deliveredAt': { $gte: window.start, $lt: window.end },
  });

// Orders the partner accepted and then gave up inside a period.
const cancelledCount = (partnerId, window) =>
  DeliveryRelease.countDocuments({ partnerId, createdAt: { $gte: window.start, $lt: window.end } });

export const cancellationLimit = (settings) => Math.max(0, Math.round(settings.maxCancellations || 0));

// Where a partner stands on every running target, for their app.
export const targetProgress = async (partnerId, settings) => {
  const targets = liveTargets(settings);
  if (!targets.length) return [];
  const windows = Object.fromEntries(TARGET_PERIODS.map((p) => [p, targetWindow(p)]));
  const counts = {};
  const cancelled = {};
  await Promise.all(
    [...new Set(targets.map((t) => t.period))].map(async (p) => {
      [counts[p], cancelled[p]] = await Promise.all([deliveredCount(partnerId, windows[p]), cancelledCount(partnerId, windows[p])]);
    })
  );
  const limit = cancellationLimit(settings);
  const awards = await DeliveryTargetAward.find({
    partnerId,
    windowKey: { $in: Object.values(windows).map((w) => w.key) },
  }).select('targetId windowKey').lean();
  const won = new Set(awards.map((a) => `${a.targetId}|${a.windowKey}`));

  return targets.map((t) => {
    const w = windows[t.period];
    return {
      id: String(t._id),
      period: t.period,
      deliveries: t.deliveries,
      bonus: t.bonus,
      done: counts[t.period] || 0,
      achieved: won.has(`${t._id}|${w.key}`),
      cancelled: cancelled[t.period] || 0,
      cancelLimit: limit,
      // Too many cancellations this period: this bonus is no longer available.
      blocked: limit > 0 && (cancelled[t.period] || 0) >= limit && !won.has(`${t._id}|${w.key}`),
      resetsAt: w.end,
    };
  });
};

// Called after a delivery is completed: pays every target the partner has now
// reached in its current period, once each. Never throws.
export const awardTargetBonuses = async (partnerId, redemptionId = null) => {
  try {
    const settings = await getDeliverySettings();
    const targets = liveTargets(settings);
    if (!targets.length) return [];

    const counts = {};
    const earned = [];
    for (const t of targets) {
      const w = targetWindow(t.period);
      if (counts[t.period] === undefined) counts[t.period] = await deliveredCount(partnerId, w);
      if (counts[t.period] < t.deliveries) continue;
      // Cancelled too many orders in this period: no incentive.
      const limit = cancellationLimit(settings);
      if (limit > 0 && (await cancelledCount(partnerId, w)) >= limit) continue;

      try {
        await DeliveryTargetAward.create({
          partnerId,
          targetId: t._id,
          period: t.period,
          windowKey: w.key,
          deliveries: t.deliveries,
          bonus: t.bonus,
          redemptionId,
        });
      } catch (err) {
        if (err?.code === 11000) continue; // already paid for this period
        throw err;
      }
      await DeliveryPartner.updateOne(
        { _id: partnerId },
        { $inc: { 'stats.totalEarnings': t.bonus, 'stats.earningsDue': t.bonus } }
      );
      earned.push(t);
    }

    for (const t of earned) {
      notifyPartner(partnerId, {
        type: 'target_achieved',
        title: 'Target achieved! 🎉',
        body: `You completed ${t.deliveries} deliveries ${{ daily: 'today', weekly: 'this week', monthly: 'this month' }[t.period]}. ₹${t.bonus} bonus added to your earnings.`,
        link: '/delivery/earnings',
      });
    }
    return earned;
  } catch (err) {
    console.error('[Delivery] Target bonus error (non-blocking):', err);
    return [];
  }
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

// Cron, every minute: an order nobody has answered keeps re-alerting by phone
// push - the store for a new order (accept/reject), the online partners of its
// city for an open one - roughly once a minute, up to ALERT_MAX times. This is
// what keeps ringing when the app is closed; the open app rings by itself.
const ALERT_EVERY_MS = 55 * 1000;
const ALERT_MAX = 25;

export const sweepUnansweredOrderAlerts = async () => {
  const now = Date.now();
  const ready = (start, last) => start && now - new Date(start).getTime() >= 50 * 1000 && (!last || now - new Date(last).getTime() >= ALERT_EVERY_MS);
  let sent = 0;

  const waitingForStore = await Redemption.find({
    fulfillment: 'delivery',
    status: 'pending',
    'delivery.status': 'placed',
    'delivery.storeAlerts': { $not: { $gte: ALERT_MAX } },
  }).limit(100);
  for (const order of waitingForStore) {
    const d = order.delivery || {};
    if (!ready(d.verifiedAt || d.placedAt || order.createdAt, d.lastStoreAlertAt)) continue;
    await Redemption.updateOne({ _id: order._id }, { $inc: { 'delivery.storeAlerts': 1 }, $set: { 'delivery.lastStoreAlertAt': new Date() } });
    sendPushToMerchant(String(order.merchantId), {
      title: 'Delivery order waiting',
      body: `#${order.internalId} is waiting for you. Accept or reject it.`,
      data: { type: 'order_waiting', redemptionId: String(order._id) },
      link: '/merchant/bookings',
      urgent: true,
    }).catch(() => {});
    sent += 1;
  }

  const openInPool = await Redemption.find({
    fulfillment: 'delivery',
    status: 'pending',
    'delivery.status': { $in: POOL_STAGES },
    'delivery.partnerId': null,
    'delivery.poolAlerts': { $not: { $gte: ALERT_MAX } },
  }).limit(100);
  for (const order of openInPool) {
    const d = order.delivery || {};
    if (!ready(d.acceptedAt || d.placedAt || order.createdAt, d.lastPoolAlertAt)) continue;
    await Redemption.updateOne({ _id: order._id }, { $inc: { 'delivery.poolAlerts': 1 }, $set: { 'delivery.lastPoolAlertAt': new Date() } });
    pushNewOrderToCity(order).catch(() => {});
    sent += 1;
  }
  return sent;
};
