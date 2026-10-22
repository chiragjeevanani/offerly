import Joi from 'joi';
import mongoose from 'mongoose';
import Redemption from '../../booking/models/Redemption.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import AdminNotification from '../../admin/models/AdminNotification.js';
import DeliveryTargetAward from '../models/DeliveryTargetAward.js';
import { emitAdminNotification } from '../../../config/socket.js';
import { verifyRazorpayPayment } from '../../../utils/razorpay.js';
import { runCompletionEffects } from '../../booking/controllers/redemptionController.js';
import {
  getDeliverySettings,
  publicDeliveryConfig,
  amountDue,
  partnerView,
  withoutSecrets,
  announceToPool,
  withdrawFromPool,
  announceStage,
  notifyPartner,
  cancelDeliveryOrder,
  startDeliveryReturn,
  confirmDeliveryReturn,
  RETURN_REASONS,
  markDeliveryOrderPaid,
  verifyDeliveryOrder,
  refundDeliveryPayment,
  creditStoreForDelivery,
  creditPartnerForDelivery,
  awardTargetBonuses,
  targetProgress,
  partnerLimits,
  sameCity,
  POOL_STAGES,
  CANCELLABLE_STAGES,
} from '../services/deliveryService.js';

const STORE_FIELDS = 'storeName address locality phone coordinates city logo';
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (id) => mongoose.isValidObjectId(id);

// Midnight in India, as a UTC instant.
const startOfIstDay = () => {
  const offset = 330 * 60 * 1000;
  const ist = new Date(Date.now() + offset);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - offset);
};

export const serializePartner = (p) => ({
  id: String(p._id),
  name: p.name,
  phone: p.phone,
  email: p.email || '',
  city: p.city,
  profilePhoto: p.profilePhoto || '',
  vehicleType: p.vehicleType,
  vehicleNumber: p.vehicleNumber || '',
  documents: {
    licenceNumber: p.documents?.licenceNumber || '',
    licenceImage: p.documents?.licenceImage || '',
    idProofImage: p.documents?.idProofImage || '',
  },
  status: p.status,
  rejectionReason: p.rejectionReason || '',
  isOnline: Boolean(p.isOnline),
  stats: {
    totalDeliveries: p.stats?.totalDeliveries || 0,
    totalEarnings: p.stats?.totalEarnings || 0,
    earningsDue: p.stats?.earningsDue || 0,
    cashInHand: p.stats?.cashInHand || 0,
  },
  bankDetails: {
    accountHolderName: p.bankDetails?.accountHolderName || '',
    accountNumber: p.bankDetails?.accountNumber || '',
    ifscCode: p.bankDetails?.ifscCode || '',
    upiId: p.bankDetails?.upiId || '',
  },
  settlements: (p.settlements || []).slice(-20).reverse(),
  createdAt: p.createdAt,
});

/* ───────────────────────────── Public ───────────────────────────── */

// @route GET /delivery/config
export const getDeliveryConfig = async (_req, res) => {
  try {
    res.status(200).json({ success: true, data: publicDeliveryConfig(await getDeliverySettings()) });
  } catch (err) {
    console.error('getDeliveryConfig error:', err);
    res.status(500).json({ success: false, error: 'Failed to load delivery settings' });
  }
};

/* ───────────────────────────── Customer ───────────────────────────── */

const findCustomerOrder = (req) =>
  validId(req.params.id)
    ? Redemption.findOne({ _id: req.params.id, customerId: req.user._id, fulfillment: 'delivery' })
    : null;

// @route POST /delivery/orders/:id/pay  - the Razorpay order to (re)open checkout with
export const getOrderPayment = async (req, res) => {
  try {
    const order = await findCustomerOrder(req);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.status !== 'pending' || order.delivery.status !== 'awaiting_payment' || !order.delivery.razorpayOrderId) {
      return res.status(400).json({ success: false, error: 'This order is not waiting for a payment' });
    }
    if (order.qrExpiry < new Date()) {
      return res.status(400).json({ success: false, error: 'The time to pay for this order has run out. Please order again.' });
    }
    res.status(200).json({
      success: true,
      payment: {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: order.delivery.razorpayOrderId,
        amount: amountDue(order) * 100,
        currency: 'INR',
        customerDetails: { name: req.user.name, email: req.user.email, contact: req.user.phone },
      },
    });
  } catch (err) {
    console.error('getOrderPayment error:', err);
    res.status(500).json({ success: false, error: 'Failed to load payment' });
  }
};

// @route POST /delivery/orders/:id/verify-payment
export const verifyOrderPayment = async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ success: false, error: 'Payment details are missing' });
  }
  try {
    const order = await findCustomerOrder(req);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.delivery.razorpayOrderId !== orderId) {
      return res.status(400).json({ success: false, error: 'This payment is not for this order' });
    }
    if (!verifyRazorpayPayment(orderId, paymentId, signature)) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }
    const updated = await markDeliveryOrderPaid(orderId, paymentId);
    if (updated?.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: 'This order had already lapsed, so your payment is being refunded.',
        code: 'ORDER_LAPSED',
      });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('verifyOrderPayment error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
};

// @route POST /delivery/orders/:id/cancel  (customer, before pickup)
export const cancelMyOrder = async (req, res) => {
  try {
    const order = await findCustomerOrder(req);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.status !== 'pending' || !CANCELLABLE_STAGES.includes(order.delivery?.status)) {
      return res.status(400).json({ success: false, error: 'This order can no longer be cancelled' });
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';
    const cancelled = await cancelDeliveryOrder(order, { by: 'customer', reason });
    if (!cancelled) return res.status(409).json({ success: false, error: 'This order changed just now. Please refresh.' });
    res.status(200).json({ success: true, data: cancelled });
  } catch (err) {
    console.error('cancelMyOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
};

/* ───────────────────────────── Store ───────────────────────────── */

// Moves a store's own delivery order from one stage to the next.
const storeStep = (from, to, stampField, messages) => async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const updated = await Redemption.findOneAndUpdate(
      { _id: req.params.id, merchantId: req.user._id, fulfillment: 'delivery', status: 'pending', 'delivery.status': { $in: from } },
      { $set: { 'delivery.status': to, [`delivery.${stampField}`]: new Date() } },
      { new: true }
    );
    if (!updated) {
      return res.status(400).json({ success: false, error: 'This order is not at that step any more. Please refresh.' });
    }
    await messages(updated);
    res.status(200).json({ success: true, data: withoutSecrets(updated) });
  } catch (err) {
    console.error(`store delivery step ${to} error:`, err);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
};

// @route POST /delivery/store/orders/:id/accept  - store starts packing; order joins the partner pool
export const storeAcceptOrder = storeStep(['placed'], 'preparing', 'acceptedAt', async (order) => {
  announceToPool(order);
  await announceStage(order, {
    customer: { title: 'Order accepted', body: `The store is packing order #${order.internalId}. We're finding a delivery partner.` },
  });
});

// @route POST /delivery/store/orders/:id/ready  - packed and waiting for the partner
export const storeMarkReady = storeStep(['preparing'], 'ready', 'readyAt', async (order) => {
  if (order.delivery.partnerId) {
    notifyPartner(order.delivery.partnerId, {
      type: 'order_ready',
      orderId: String(order._id),
      title: 'Order ready for pickup',
      body: `#${order.internalId} is packed and waiting at the store.`,
    });
  } else {
    announceToPool(order, { push: false });
  }
  await announceStage(order, {
    customer: { title: 'Order packed', body: `Order #${order.internalId} is packed and will be picked up shortly.` },
  });
});

// @route POST /delivery/store/orders/:id/returned  - the partner handed a returned order back
export const storeConfirmReturn = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const order = await Redemption.findOne({ _id: req.params.id, merchantId: req.user._id, fulfillment: 'delivery' });
    if (!order || order.delivery?.status !== 'returning') {
      return res.status(400).json({ success: false, error: 'This order is not on its way back to you' });
    }
    const done = await confirmDeliveryReturn(order, { by: 'store' });
    if (!done) return res.status(409).json({ success: false, error: 'This order changed just now. Please refresh.' });
    res.status(200).json({ success: true, data: withoutSecrets(done) });
  } catch (err) {
    console.error('storeConfirmReturn error:', err);
    res.status(500).json({ success: false, error: 'Failed to confirm the return' });
  }
};

/* ───────────────────────────── Partner ───────────────────────────── */

const isApproved = (partner) => partner.status === 'approved';

// @route GET /delivery/partner/me
export const getPartnerMe = async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.user._id);
    const since = startOfIstDay();
    const [today, activeCount, settings, bonusToday, bonusHistory] = await Promise.all([
      Redemption.aggregate([
        { $match: { 'delivery.partnerId': partner._id, 'delivery.status': 'delivered', 'delivery.deliveredAt': { $gte: since } } },
        { $group: { _id: null, count: { $sum: 1 }, earnings: { $sum: { $ifNull: ['$delivery.partnerPayout', 0] } }, cash: { $sum: { $ifNull: ['$delivery.cashCollected', 0] } } } },
      ]),
      Redemption.countDocuments({ 'delivery.partnerId': partner._id, status: 'pending', 'delivery.status': { $in: [...POOL_STAGES, 'picked_up'] } }),
      getDeliverySettings(),
      DeliveryTargetAward.aggregate([
        { $match: { partnerId: partner._id, createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$bonus' } } },
      ]),
      DeliveryTargetAward.find({ partnerId: partner._id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const targets = await targetProgress(partner._id, settings);
    res.status(200).json({
      success: true,
      data: {
        partner: serializePartner(partner),
        today: {
          deliveries: today[0]?.count || 0,
          earnings: (today[0]?.earnings || 0) + (bonusToday[0]?.total || 0),
          cashCollected: today[0]?.cash || 0,
        },
        targets,
        bonuses: bonusHistory.map((b) => ({ id: String(b._id), period: b.period, deliveries: b.deliveries, bonus: b.bonus, at: b.createdAt })),
        activeCount,
        maxActive: partnerLimits(settings).maxActive,
        payoutPerDelivery: settings.partnerPayoutPerDelivery || 0,
        deliveryEnabled: Boolean(settings.enabled),
      },
    });
  } catch (err) {
    console.error('getPartnerMe error:', err);
    res.status(500).json({ success: false, error: 'Failed to load profile' });
  }
};

const partnerUpdateSchema = Joi.object({
  isOnline: Joi.boolean(),
  name: Joi.string().trim().min(2).max(60),
  email: Joi.string().email().allow(''),
  profilePhoto: Joi.string().allow(''),
  vehicleType: Joi.string().valid('bike', 'scooter', 'bicycle', 'other'),
  vehicleNumber: Joi.string().trim().max(15).allow(''),
  bankDetails: Joi.object({
    accountHolderName: Joi.string().trim().max(80).allow(''),
    accountNumber: Joi.string().trim().pattern(/^\d{9,18}$/).allow('')
      .messages({ 'string.pattern.base': 'Enter a valid bank account number (9 to 18 digits)' }),
    ifscCode: Joi.string().trim().uppercase().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).allow('')
      .messages({ 'string.pattern.base': 'Enter a valid IFSC code, like SBIN0001234' }),
    upiId: Joi.string().trim().pattern(/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/).allow('')
      .messages({ 'string.pattern.base': 'Enter a valid UPI ID, like name@bank' }),
  }),
});

// @route PUT /delivery/partner/me  - go online/offline, edit profile and payout details
export const updatePartnerMe = async (req, res) => {
  const { error, value } = partnerUpdateSchema.validate(req.body || {});
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  try {
    const partner = await DeliveryPartner.findById(req.user._id);
    if (value.isOnline === true) {
      if (!isApproved(partner)) {
        return res.status(403).json({ success: false, error: 'Your account must be approved before you can go online' });
      }
      const settings = await getDeliverySettings();
      if (!settings.enabled) {
        return res.status(400).json({ success: false, error: 'Deliveries are paused by Offerly right now' });
      }
    }
    for (const key of ['isOnline', 'name', 'email', 'profilePhoto', 'vehicleType', 'vehicleNumber']) {
      if (value[key] !== undefined) partner[key] = value[key];
    }
    if (value.bankDetails) partner.bankDetails = { ...partner.bankDetails?.toObject?.(), ...value.bankDetails };
    await partner.save();
    res.status(200).json({ success: true, data: serializePartner(partner) });
  } catch (err) {
    console.error('updatePartnerMe error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

// @route PUT /delivery/partner/me/documents  - (re)submit licence and ID for approval
export const updatePartnerDocuments = async (req, res) => {
  const schema = Joi.object({
    licenceNumber: Joi.string().trim().uppercase().max(25).allow(''),
    licenceImage: Joi.string().allow(''),
    idProofImage: Joi.string().allow(''),
  });
  const { error, value } = schema.validate(req.body || {});
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  try {
    const partner = await DeliveryPartner.findById(req.user._id);
    if (partner.status === 'approved' || partner.status === 'blocked') {
      return res.status(400).json({ success: false, error: 'Contact support to change verified documents' });
    }
    partner.documents = { ...partner.documents?.toObject?.(), ...value };
    const resubmitted = partner.status === 'rejected';
    if (resubmitted) {
      partner.status = 'pending';
      partner.rejectionReason = '';
    }
    await partner.save();
    if (resubmitted) {
      const note = await AdminNotification.create({
        title: 'Delivery partner resubmitted documents',
        body: `${partner.name} (${partner.city}) updated their documents and is waiting for approval.`,
        type: 'delivery_partner_signup',
        data: { partnerId: partner._id },
      });
      emitAdminNotification(note);
    }
    res.status(200).json({ success: true, data: serializePartner(partner) });
  } catch (err) {
    console.error('updatePartnerDocuments error:', err);
    res.status(500).json({ success: false, error: 'Failed to save documents' });
  }
};

// @route GET /delivery/partner/available  - the open pool in the partner's city
export const getAvailableOrders = async (req, res) => {
  try {
    const partner = req.user;
    if (!isApproved(partner) || !partner.isOnline) {
      return res.status(200).json({ success: true, data: [], online: false });
    }
    const { hideDropUntilAccepted } = partnerLimits(await getDeliverySettings());
    const orders = await Redemption.find({
      fulfillment: 'delivery',
      status: 'pending',
      'delivery.status': { $in: POOL_STAGES },
      'delivery.city': sameCity(partner.city),
      'delivery.partnerId': null,
    })
      .populate('merchantId', STORE_FIELDS)
      .sort({ 'delivery.acceptedAt': 1 })
      .limit(50);
    res.status(200).json({ success: true, data: orders.map((o) => partnerView(o, { full: !hideDropUntilAccepted })), online: true });
  } catch (err) {
    console.error('getAvailableOrders error:', err);
    res.status(500).json({ success: false, error: 'Failed to load orders' });
  }
};

// @route GET /delivery/partner/orders?scope=active|history
export const getPartnerOrders = async (req, res) => {
  try {
    const history = req.query.scope === 'history';
    const filter = history
      ? { 'delivery.partnerId': req.user._id, 'delivery.status': { $in: ['delivered', 'cancelled', 'returned'] } }
      : { 'delivery.partnerId': req.user._id, $or: [{ status: 'pending', 'delivery.status': { $in: [...POOL_STAGES, 'picked_up'] } }, { 'delivery.status': 'returning' }] };
    const orders = await Redemption.find(filter)
      .populate('merchantId', STORE_FIELDS)
      .sort(history ? { updatedAt: -1 } : { 'delivery.assignedAt': 1 })
      .limit(history ? 100 : 20);
    res.status(200).json({ success: true, data: orders.map((o) => partnerView(o, { full: true })) });
  } catch (err) {
    console.error('getPartnerOrders error:', err);
    res.status(500).json({ success: false, error: 'Failed to load orders' });
  }
};

// @route GET /delivery/partner/orders/:id
export const getPartnerOrder = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const order = await Redemption.findOne({ _id: req.params.id, fulfillment: 'delivery' }).populate('merchantId', STORE_FIELDS);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    const mine = String(order.delivery?.partnerId || '') === String(req.user._id);
    const inPool = !order.delivery?.partnerId && order.status === 'pending' && POOL_STAGES.includes(order.delivery?.status)
      && sameCity(req.user.city).test(order.delivery?.city || '');
    if (!mine && !inPool) return res.status(404).json({ success: false, error: 'This order is no longer available' });
    const { hideDropUntilAccepted } = partnerLimits(await getDeliverySettings());
    res.status(200).json({ success: true, data: { ...partnerView(order, { full: mine || !hideDropUntilAccepted }), mine } });
  } catch (err) {
    console.error('getPartnerOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to load order' });
  }
};

// @route POST /delivery/partner/orders/:id/accept  - first partner to accept gets it
export const acceptOrder = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const partner = req.user;
    if (!isApproved(partner) || !partner.isOnline) {
      return res.status(403).json({ success: false, error: 'Go online to accept orders' });
    }
    // Orders still in hand, including ones being taken back to a store.
    const active = await Redemption.countDocuments({
      'delivery.partnerId': partner._id,
      $or: [{ status: 'pending', 'delivery.status': { $in: [...POOL_STAGES, 'picked_up'] } }, { 'delivery.status': 'returning' }],
    });
    const { maxActive } = partnerLimits(await getDeliverySettings());
    if (active >= maxActive) {
      return res.status(400).json({ success: false, error: `You can carry up to ${maxActive} order${maxActive === 1 ? '' : 's'} at a time. Deliver one first.` });
    }
    const order = await Redemption.findOneAndUpdate(
      {
        _id: req.params.id,
        fulfillment: 'delivery',
        status: 'pending',
        'delivery.status': { $in: POOL_STAGES },
        'delivery.city': sameCity(partner.city),
        'delivery.partnerId': null,
      },
      {
        $set: {
          'delivery.partnerId': partner._id,
          'delivery.partnerName': partner.name,
          'delivery.partnerPhone': partner.phone,
          'delivery.assignedAt': new Date(),
        },
      },
      { new: true }
    ).populate('merchantId', STORE_FIELDS);
    if (!order) {
      return res.status(409).json({ success: false, error: 'Another partner took this order just now', code: 'ALREADY_TAKEN' });
    }
    withdrawFromPool(order);
    await announceStage(order, {
      customer: { title: 'Delivery partner assigned', body: `${partner.name} will deliver order #${order.internalId}.` },
      store: { title: 'Delivery partner on the way', body: `${partner.name} (${partner.phone}) will pick up #${order.internalId}.` },
    });
    res.status(200).json({ success: true, data: partnerView(order, { full: true }) });
  } catch (err) {
    console.error('acceptOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to accept order' });
  }
};

// @route POST /delivery/partner/orders/:id/release  - give an order back before pickup
export const releaseOrder = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const order = await Redemption.findOneAndUpdate(
      { _id: req.params.id, 'delivery.partnerId': req.user._id, status: 'pending', 'delivery.status': { $in: POOL_STAGES } },
      { $unset: { 'delivery.partnerId': 1, 'delivery.partnerName': 1, 'delivery.partnerPhone': 1, 'delivery.assignedAt': 1 } },
      { new: true }
    );
    if (!order) return res.status(400).json({ success: false, error: 'This order can no longer be released' });
    announceToPool(order, { except: req.user._id });
    await announceStage(order, {
      store: { title: 'Delivery partner changed', body: `The partner for #${order.internalId} dropped out. We're finding another one.` },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('releaseOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to release order' });
  }
};

// @route POST /delivery/partner/orders/:id/pickup  - collected from the store
export const pickupOrder = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const order = await Redemption.findOneAndUpdate(
      { _id: req.params.id, 'delivery.partnerId': req.user._id, status: 'pending', 'delivery.status': { $in: POOL_STAGES } },
      { $set: { 'delivery.status': 'picked_up', 'delivery.pickedUpAt': new Date() } },
      { new: true }
    ).populate('merchantId', STORE_FIELDS);
    if (!order) return res.status(400).json({ success: false, error: 'This order is not waiting for pickup' });
    await announceStage(order, {
      customer: {
        title: 'Out for delivery',
        body: `${req.user.name} has picked up order #${order.internalId}. Keep your delivery code ready.`,
      },
      store: { title: 'Order picked up', body: `${req.user.name} collected #${order.internalId}.` },
    });
    res.status(200).json({ success: true, data: partnerView(order, { full: true }) });
  } catch (err) {
    console.error('pickupOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
};

// @route POST /delivery/partner/orders/:id/return  body: { reason, note }
// Picked up but can't be delivered - the partner takes it back to the store.
export const returnOrder = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  const code = String(req.body?.reason || '');
  if (!RETURN_REASONS[code]) return res.status(400).json({ success: false, error: 'Pick why the order could not be delivered' });
  const note = String(req.body?.note || '').trim().slice(0, 160);
  if (code === 'other' && !note) return res.status(400).json({ success: false, error: 'Tell us what went wrong' });
  try {
    const order = await Redemption.findOne({ _id: req.params.id, 'delivery.partnerId': req.user._id });
    if (!order || order.status !== 'pending' || order.delivery?.status !== 'picked_up') {
      return res.status(400).json({ success: false, error: 'Only an order you have picked up can be returned' });
    }
    const reason = code === 'other' ? note : note ? `${RETURN_REASONS[code]}: ${note}` : RETURN_REASONS[code];
    // The customer's side (refused it, or not there): no delivery fee back.
    const feeRetained = ['customer_refused', 'not_reachable'].includes(code);
    const returning = await startDeliveryReturn(order, { by: 'partner', reason, feeRetained });
    if (!returning) return res.status(409).json({ success: false, error: 'This order changed just now. Please refresh.' });
    const fresh = await Redemption.findById(returning._id).populate('merchantId', STORE_FIELDS);
    res.status(200).json({ success: true, data: partnerView(fresh, { full: true }) });
  } catch (err) {
    console.error('returnOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to start the return' });
  }
};

// @route POST /delivery/partner/orders/:id/deliver  body: { otp, cashCollected }
export const deliverOrder = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  const otp = String(req.body?.otp || '').trim();
  try {
    const order = await Redemption.findOne({ _id: req.params.id, 'delivery.partnerId': req.user._id }).select('+delivery.otp');
    if (!order || order.status !== 'pending' || order.delivery.status !== 'picked_up') {
      return res.status(400).json({ success: false, error: 'This order is not out for delivery' });
    }
    if (!otp || otp !== order.delivery.otp) {
      return res.status(400).json({ success: false, error: 'Wrong delivery code. Ask the customer for the 4-digit code in their app.', code: 'WRONG_OTP' });
    }
    const isCod = order.delivery.paymentMode === 'cod';
    const due = amountDue(order);
    if (isCod && due > 0 && req.body?.cashCollected !== true) {
      return res.status(400).json({ success: false, error: `Collect ₹${due} from the customer first`, code: 'CASH_NOT_CONFIRMED' });
    }

    const now = new Date();
    const delivered = await Redemption.findOneAndUpdate(
      { _id: order._id, status: 'pending', 'delivery.status': 'picked_up' },
      {
        $set: {
          status: 'completed',
          scannedAt: now,
          'delivery.status': 'delivered',
          'delivery.deliveredAt': now,
          'delivery.cashCollected': isCod ? due : 0,
          ...(isCod && due > 0 ? { 'delivery.paymentStatus': 'paid' } : {}),
        },
      },
      { new: true }
    ).populate('merchantId', STORE_FIELDS);
    if (!delivered) return res.status(409).json({ success: false, error: 'This order was already completed' });

    // Same bookkeeping as a store scan, then the delivery-specific credits.
    const plain = await Redemption.findById(delivered._id);
    await runCompletionEffects(plain, {
      title: 'Order delivered!',
      body: `Order #${plain.internalId} has been delivered. Enjoy!`,
    });
    try {
      await creditStoreForDelivery(plain);
      await creditPartnerForDelivery(plain);
      await awardTargetBonuses(plain.delivery.partnerId, plain._id);
    } catch (creditErr) {
      console.error('[Delivery] Credit error (non-blocking):', creditErr);
    }
    await announceStage(plain, {
      store: { title: 'Order delivered', body: `#${plain.internalId} was delivered by ${req.user.name}.` },
    });

    res.status(200).json({ success: true, data: partnerView(delivered, { full: true }) });
  } catch (err) {
    console.error('deliverOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to complete delivery' });
  }
};

/* ───────────────────────────── Admin ───────────────────────────── */

const settingsSchema = Joi.object({
  enabled: Joi.boolean(),
  deliveryFee: Joi.number().min(0).max(10000),
  freeDeliveryMinOrder: Joi.number().min(0).max(1000000),
  allowCod: Joi.boolean(),
  allowOnline: Joi.boolean(),
  maxDistanceKm: Joi.number().min(0).max(500),
  partnerPayoutPerDelivery: Joi.number().min(0).max(10000),
  maxActiveOrdersPerPartner: Joi.number().integer().min(1).max(20),
  hideDropUntilAccepted: Joi.boolean(),
  adminVerification: Joi.boolean(),
  targets: Joi.array().max(12).items(
    Joi.object({
      id: Joi.string().hex().length(24),
      period: Joi.string().valid('daily', 'weekly', 'monthly').required(),
      deliveries: Joi.number().integer().min(1).max(5000).required(),
      bonus: Joi.number().integer().min(1).max(1000000).required(),
      active: Joi.boolean(),
    })
  ),
  freeGift: Joi.object({
    enabled: Joi.boolean(),
    minOrderValue: Joi.number().min(0).max(1000000),
    title: Joi.string().trim().max(80).allow(''),
    description: Joi.string().trim().max(300).allow(''),
    appliesTo: Joi.string().valid('delivery', 'all'),
  }),
});

const adminSettingsView = (s) => ({
  ...publicDeliveryConfig(s),
  partnerPayoutPerDelivery: s.partnerPayoutPerDelivery || 0,
  ...(({ maxActive, hideDropUntilAccepted }) => ({ maxActiveOrdersPerPartner: maxActive, hideDropUntilAccepted }))(partnerLimits(s)),
  targets: (s.targets || []).map((t) => ({ id: String(t._id), period: t.period, deliveries: t.deliveries, bonus: t.bonus, active: t.active !== false })),
  freeGift: {
    enabled: Boolean(s.freeGift?.enabled),
    minOrderValue: s.freeGift?.minOrderValue || 0,
    title: s.freeGift?.title || '',
    description: s.freeGift?.description || '',
    appliesTo: s.freeGift?.appliesTo || 'delivery',
  },
  updatedAt: s.updatedAt,
});

// @route GET /delivery/admin/settings
export const getAdminSettings = async (_req, res) => {
  try {
    res.status(200).json({ success: true, data: adminSettingsView(await getDeliverySettings()) });
  } catch (err) {
    console.error('getAdminSettings error:', err);
    res.status(500).json({ success: false, error: 'Failed to load delivery settings' });
  }
};

// @route PUT /delivery/admin/settings
export const updateAdminSettings = async (req, res) => {
  const { error, value } = settingsSchema.validate(req.body || {});
  if (error) return res.status(400).json({ success: false, error: error.details[0].message });
  try {
    const s = await getDeliverySettings();
    for (const key of ['enabled', 'deliveryFee', 'freeDeliveryMinOrder', 'allowCod', 'allowOnline', 'maxDistanceKm', 'partnerPayoutPerDelivery', 'maxActiveOrdersPerPartner', 'hideDropUntilAccepted', 'adminVerification']) {
      if (value[key] !== undefined) s[key] = value[key];
    }
    if (value.freeGift) s.freeGift = { ...s.freeGift?.toObject?.(), ...value.freeGift };
    if (value.targets) {
      // Keep the id of a target that already exists, so what it has paid stays linked to it.
      s.targets = value.targets.map(({ id, ...t }) => (id ? { _id: id, ...t } : t));
    }
    if (!s.allowCod && !s.allowOnline) {
      return res.status(400).json({ success: false, error: 'Keep at least one payment method on' });
    }
    if (s.freeGift?.enabled && !s.freeGift.title) {
      return res.status(400).json({ success: false, error: 'Give the free gift a name before switching it on' });
    }
    await s.save();
    // Switching delivery off sends every partner offline.
    if (value.enabled === false) await DeliveryPartner.updateMany({ isOnline: true }, { $set: { isOnline: false } });
    res.status(200).json({ success: true, data: adminSettingsView(s) });
  } catch (err) {
    console.error('updateAdminSettings error:', err);
    res.status(500).json({ success: false, error: 'Failed to save delivery settings' });
  }
};

// @route GET /delivery/admin/partners?status=&q=
export const getAdminPartners = async (req, res) => {
  try {
    const filter = {};
    if (['pending', 'approved', 'rejected', 'blocked'].includes(req.query.status)) filter.status = req.query.status;
    const q = String(req.query.q || '').trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { phone: rx }, { city: rx }, { vehicleNumber: rx }];
    }
    const [partners, counts] = await Promise.all([
      DeliveryPartner.find(filter).sort({ createdAt: -1 }).limit(300),
      DeliveryPartner.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    res.status(200).json({ success: true, data: partners.map(serializePartner), counts: byStatus });
  } catch (err) {
    console.error('getAdminPartners error:', err);
    res.status(500).json({ success: false, error: 'Failed to load partners' });
  }
};

// @route PUT /delivery/admin/partners/:id/status  body: { status, reason }
export const updatePartnerStatus = async (req, res) => {
  const { status } = req.body || {};
  const reason = String(req.body?.reason || '').trim().slice(0, 300);
  if (!['approved', 'rejected', 'blocked'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }
  if (status === 'rejected' && !reason) {
    return res.status(400).json({ success: false, error: 'Tell the partner why they were rejected' });
  }
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid partner' });
  try {
    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) return res.status(404).json({ success: false, error: 'Partner not found' });
    partner.status = status;
    partner.rejectionReason = status === 'rejected' ? reason : '';
    if (status !== 'approved') partner.isOnline = false;
    await partner.save();

    // A partner taken off the road hands back orders they haven't picked up.
    if (status !== 'approved') {
      const held = await Redemption.find({ 'delivery.partnerId': partner._id, status: 'pending', 'delivery.status': { $in: POOL_STAGES } });
      for (const order of held) {
        await Redemption.updateOne(
          { _id: order._id },
          { $unset: { 'delivery.partnerId': 1, 'delivery.partnerName': 1, 'delivery.partnerPhone': 1, 'delivery.assignedAt': 1 } }
        );
        announceToPool(order);
      }
    }
    const STATUS_NOTE = {
      approved: { title: "You're approved! 🎉", body: 'Your Offerly partner account is active. Go online to start getting orders.' },
      rejected: { title: 'Application not approved', body: reason || 'Open the app to see what needs fixing.' },
      blocked: { title: 'Account paused', body: 'Your partner account has been paused. Contact Offerly support.' },
    };
    notifyPartner(partner._id, { type: 'account_status', status, reason, ...STATUS_NOTE[status] });
    res.status(200).json({ success: true, data: serializePartner(partner) });
  } catch (err) {
    console.error('updatePartnerStatus error:', err);
    res.status(500).json({ success: false, error: 'Failed to update partner' });
  }
};

// @route POST /delivery/admin/partners/:id/settle  - cash received from and earnings paid to the partner
export const settlePartner = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid partner' });
  try {
    const partner = await DeliveryPartner.findById(req.params.id);
    if (!partner) return res.status(404).json({ success: false, error: 'Partner not found' });
    const cash = partner.stats?.cashInHand || 0;
    const earnings = partner.stats?.earningsDue || 0;
    if (cash <= 0 && earnings <= 0) {
      return res.status(400).json({ success: false, error: 'Nothing to settle with this partner' });
    }
    // Only take off what was read, so a delivery finishing meanwhile isn't lost.
    const updated = await DeliveryPartner.findByIdAndUpdate(
      partner._id,
      {
        $inc: { 'stats.cashInHand': -cash, 'stats.earningsDue': -earnings },
        $push: { settlements: { cashReceived: cash, earningsPaid: earnings, note: String(req.body?.note || '').slice(0, 200), at: new Date() } },
      },
      { new: true }
    );
    notifyPartner(partner._id, {
      type: 'settled',
      cashReceived: cash,
      earningsPaid: earnings,
      title: 'Settlement done',
      body: `Offerly paid you ₹${earnings}${cash > 0 ? ` and recorded ₹${cash} cash handed over` : ''}.`,
      link: '/delivery/earnings',
    });
    res.status(200).json({ success: true, data: serializePartner(updated) });
  } catch (err) {
    console.error('settlePartner error:', err);
    res.status(500).json({ success: false, error: 'Failed to settle' });
  }
};

const adminOrderView = (o) => {
  const data = withoutSecrets(o);
  return {
    ...data,
    amountDue: amountDue(o),
    store: o.merchantId && typeof o.merchantId === 'object'
      ? { id: String(o.merchantId._id), name: o.merchantId.storeName, phone: o.merchantId.phone, city: o.merchantId.city }
      : null,
  };
};

// @route GET /delivery/admin/orders?stage=&q=
export const getAdminOrders = async (req, res) => {
  try {
    const filter = { fulfillment: 'delivery' };
    const stage = String(req.query.stage || '');
    if (stage === 'active') filter['delivery.status'] = { $in: ['verifying', 'placed', ...POOL_STAGES, 'picked_up', 'returning'] };
    else if (stage === 'unassigned') Object.assign(filter, { 'delivery.status': { $in: POOL_STAGES }, 'delivery.partnerId': null, status: 'pending' });
    else if (stage === 'refunds') filter['delivery.paymentStatus'] = { $in: ['refund_pending', 'refund_failed'] };
    else if (['awaiting_payment', 'verifying', 'placed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled', 'returning', 'returned'].includes(stage)) filter['delivery.status'] = stage;
    const q = String(req.query.q || '').trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ internalId: rx }, { customerName: rx }, { 'delivery.partnerName': rx }, { 'delivery.address.phone': rx }];
    }
    const since = startOfIstDay();
    const [orders, stageCounts, today] = await Promise.all([
      Redemption.find(filter).populate('merchantId', 'storeName phone city').sort({ createdAt: -1 }).limit(200),
      Redemption.aggregate([
        { $match: { fulfillment: 'delivery' } },
        { $group: { _id: '$delivery.status', n: { $sum: 1 } } },
      ]),
      Redemption.aggregate([
        { $match: { fulfillment: 'delivery', 'delivery.status': 'delivered', 'delivery.deliveredAt': { $gte: since } } },
        { $group: { _id: null, n: { $sum: 1 }, value: { $sum: { $add: ['$totals.final', { $ifNull: ['$delivery.fee', 0] }] } }, fees: { $sum: { $ifNull: ['$delivery.fee', 0] } } } },
      ]),
    ]);
    const unassigned = await Redemption.countDocuments({ fulfillment: 'delivery', status: 'pending', 'delivery.status': { $in: POOL_STAGES }, 'delivery.partnerId': null });
    const refundIssues = await Redemption.countDocuments({ fulfillment: 'delivery', 'delivery.paymentStatus': { $in: ['refund_pending', 'refund_failed'] } });
    res.status(200).json({
      success: true,
      data: orders.map(adminOrderView),
      summary: {
        stages: Object.fromEntries(stageCounts.filter((c) => c._id).map((c) => [c._id, c.n])),
        unassigned,
        refundIssues,
        deliveredToday: today[0]?.n || 0,
        valueToday: Math.round(today[0]?.value || 0),
        feesToday: Math.round(today[0]?.fees || 0),
      },
    });
  } catch (err) {
    console.error('getAdminOrders error:', err);
    res.status(500).json({ success: false, error: 'Failed to load delivery orders' });
  }
};

// @route POST /delivery/admin/orders/:id/verify  - customer confirmed on the phone: send it to the store
export const adminVerifyOrder = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const order = await Redemption.findOne({ _id: req.params.id, fulfillment: 'delivery' });
    if (!order || order.status !== 'pending' || order.delivery?.status !== 'verifying') {
      return res.status(400).json({ success: false, error: 'This order is not waiting for verification' });
    }
    const verified = await verifyDeliveryOrder(order, { adminId: req.user._id });
    if (!verified) return res.status(409).json({ success: false, error: 'This order changed just now. Please refresh.' });
    res.status(200).json({ success: true, data: adminOrderView(await Redemption.findById(verified._id).populate('merchantId', 'storeName phone city')) });
  } catch (err) {
    console.error('adminVerifyOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify the order' });
  }
};

// @route POST /delivery/admin/orders/:id/unassign - take an order off its partner, back into the pool
export const adminUnassignOrder = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const before = await Redemption.findById(req.params.id).select('delivery');
    const order = await Redemption.findOneAndUpdate(
      { _id: req.params.id, status: 'pending', 'delivery.status': { $in: POOL_STAGES }, 'delivery.partnerId': { $ne: null } },
      { $unset: { 'delivery.partnerId': 1, 'delivery.partnerName': 1, 'delivery.partnerPhone': 1, 'delivery.assignedAt': 1 } },
      { new: true }
    ).populate('merchantId', 'storeName phone city');
    if (!order) return res.status(400).json({ success: false, error: 'Only an assigned order that has not been picked up can be unassigned' });
    notifyPartner(before?.delivery?.partnerId, {
      type: 'order_unassigned',
      orderId: String(order._id),
      title: 'Order reassigned',
      body: `Offerly moved #${order.internalId} to another partner.`,
    });
    announceToPool(order, { except: before?.delivery?.partnerId });
    res.status(200).json({ success: true, data: adminOrderView(order) });
  } catch (err) {
    console.error('adminUnassignOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to unassign order' });
  }
};

// @route POST /delivery/admin/orders/:id/cancel  body: { reason }
export const adminCancelOrder = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const order = await Redemption.findOne({ _id: req.params.id, fulfillment: 'delivery' });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    const reason = String(req.body?.reason || '').trim().slice(0, 200);
    // Already with the partner: cancelling means a return to the store.
    if (order.status === 'pending' && order.delivery?.status === 'picked_up') {
      const returning = await startDeliveryReturn(order, { by: 'admin', reason });
      if (!returning) return res.status(409).json({ success: false, error: 'This order changed just now. Please refresh.' });
      return res.status(200).json({ success: true, data: adminOrderView(await Redemption.findById(returning._id).populate('merchantId', 'storeName phone city')) });
    }
    if (order.status !== 'pending' || !CANCELLABLE_STAGES.includes(order.delivery?.status)) {
      return res.status(400).json({ success: false, error: 'This order can no longer be cancelled' });
    }
    const cancelled = await cancelDeliveryOrder(order, { by: 'admin', reason });
    if (!cancelled) return res.status(409).json({ success: false, error: 'This order changed just now. Please refresh.' });
    res.status(200).json({ success: true, data: adminOrderView(await Redemption.findById(cancelled._id).populate('merchantId', 'storeName phone city')) });
  } catch (err) {
    console.error('adminCancelOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
};

// @route POST /delivery/admin/orders/:id/returned  - close a return the store hasn't confirmed
export const adminConfirmReturn = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const order = await Redemption.findOne({ _id: req.params.id, fulfillment: 'delivery' });
    if (!order || order.delivery?.status !== 'returning') {
      return res.status(400).json({ success: false, error: 'This order is not being returned' });
    }
    const done = await confirmDeliveryReturn(order, { by: 'admin' });
    if (!done) return res.status(409).json({ success: false, error: 'This order changed just now. Please refresh.' });
    res.status(200).json({ success: true, data: adminOrderView(await Redemption.findById(done._id).populate('merchantId', 'storeName phone city')) });
  } catch (err) {
    console.error('adminConfirmReturn error:', err);
    res.status(500).json({ success: false, error: 'Failed to close the return' });
  }
};

// @route POST /delivery/admin/orders/:id/retry-refund
export const adminRetryRefund = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid order' });
  try {
    const order = await Redemption.findOne({ _id: req.params.id, fulfillment: 'delivery' });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.delivery?.paymentStatus !== 'refund_failed') {
      return res.status(400).json({ success: false, error: 'This order has no failed refund' });
    }
    const result = await refundDeliveryPayment(order);
    if (result !== 'refunded') {
      return res.status(502).json({ success: false, error: 'Razorpay refused the refund again. Refund it from the Razorpay dashboard.' });
    }
    res.status(200).json({ success: true, data: adminOrderView(await Redemption.findById(order._id).populate('merchantId', 'storeName phone city')) });
  } catch (err) {
    console.error('adminRetryRefund error:', err);
    res.status(500).json({ success: false, error: 'Failed to retry refund' });
  }
};
