import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import WalkinOrder from '../models/WalkinOrder.js';
import Redemption from '../models/Redemption.js';
import User from '../../user/models/User.js';
import OtpSession from '../../user/models/OtpSession.js';
import Product from '../../merchant/models/Product.js';
import ProductVariant from '../../merchant/models/ProductVariant.js';
import ServicePlan from '../../merchant/models/ServicePlan.js';
import { variantLabel } from '../../merchant/services/inventoryService.js';
import { deductStockForWalkin } from '../../merchant/services/stockService.js';
import { buildPhoneQuery, normalizePhone } from '../../../utils/phone.js';
import { generateOTP, hashOtp, isDevOtpNumber, sendSMS } from '../../../utils/sms.js';
import {
  COMPLETED_STATUSES,
  addDays,
  buildDailySeries,
  localDayGroup,
  startOfLocalDay,
} from '../../../utils/analytics.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_GAP_MS = 30 * 1000;
const MAX_LINES = 50;
const MAX_AMOUNT = 10_000_000;

const round2 = (n) => Math.round(n * 100) / 100;
const discountPercent = (mrp, paid) => (mrp > 0 ? Math.round(((mrp - paid) / mrp) * 1000) / 10 : 0);

// Indian mobile numbers: 10 digits starting 6-9.
const cleanPhone = (raw) => {
  const phone = normalizePhone(typeof raw === 'string' ? raw : String(raw ?? ''));
  return /^[6-9]\d{9}$/.test(phone) ? phone : null;
};

const findCustomer = (phone) => User.findOne(buildPhoneQuery(phone)).select('name phone').lean();

const signWalkinToken = (merchantId, phone) =>
  jwt.sign({ kind: 'walkin_phone', merchantId: String(merchantId), phone }, process.env.JWT_SECRET, { expiresIn: '2h' });

const readWalkinToken = (token, merchantId, phone) => {
  try {
    const payload = jwt.verify(String(token || ''), process.env.JWT_SECRET);
    return payload.kind === 'walkin_phone' && payload.merchantId === String(merchantId) && payload.phone === phone;
  } catch {
    return false;
  }
};

// @desc    Is this number an Offerly customer? Shows their name to the merchant.
// @route   POST /merchants/me/walkin/lookup   body: { phone }
export const lookupWalkinCustomer = async (req, res) => {
  try {
    const phone = cleanPhone(req.body?.phone);
    if (!phone) return res.status(400).json({ success: false, error: 'Enter a valid 10-digit mobile number' });

    const merchantId = req.user._id;
    const user = await findCustomer(phone);
    const [walkins, online] = await Promise.all([
      WalkinOrder.countDocuments({ merchantId, customerPhone: phone }),
      user ? Redemption.countDocuments({ merchantId, customerId: user._id, status: { $in: COMPLETED_STATUSES } }) : 0,
    ]);
    res.status(200).json({
      success: true,
      data: {
        phone,
        exists: Boolean(user),
        name: user?.name || '',
        // Earlier purchases at this store (app + walk-in), shown as "Visited 3 times".
        visits: walkins + online,
      },
    });
  } catch (err) {
    console.error('Walk-in lookup error:', err);
    res.status(500).json({ success: false, error: 'Could not look up this number' });
  }
};

// @desc    Text an OTP to a walk-in customer who isn't on Offerly yet
// @route   POST /merchants/me/walkin/send-otp   body: { phone }
export const sendWalkinOtp = async (req, res) => {
  try {
    const phone = cleanPhone(req.body?.phone);
    if (!phone) return res.status(400).json({ success: false, error: 'Enter a valid 10-digit mobile number' });
    if (await findCustomer(phone)) {
      return res.status(400).json({ success: false, error: 'This customer is already on Offerly - no OTP needed' });
    }

    const existing = await OtpSession.findOne({ phone, role: 'customer', purpose: 'walkin' }).select('updatedAt').lean();
    if (existing && Date.now() - new Date(existing.updatedAt).getTime() < OTP_RESEND_GAP_MS) {
      return res.status(429).json({ success: false, error: 'OTP just sent - wait 30 seconds before resending' });
    }

    const isDev = isDevOtpNumber(phone, 'customer');
    const otp = isDev ? process.env.DEFAULT_DEV_OTP || '123456' : generateOTP();
    await OtpSession.findOneAndUpdate(
      { phone, role: 'customer', purpose: 'walkin' },
      {
        phone, role: 'customer', purpose: 'walkin', merchantId: req.user._id,
        otpHash: hashOtp(otp), expiresAt: new Date(Date.now() + OTP_TTL_MS), attemptCount: 0, verifiedAt: null,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    const sms = await sendSMS(phone, otp, 'customer');
    res.status(200).json({ success: true, message: 'OTP sent to the customer', devMode: Boolean(sms?.skipped) });
  } catch (err) {
    console.error('Walk-in send OTP error:', err);
    res.status(500).json({ success: false, error: 'Could not send the OTP' });
  }
};

// @desc    Check the OTP the customer read out; returns a token for saving their sale
// @route   POST /merchants/me/walkin/verify-otp   body: { phone, otp }
export const verifyWalkinOtp = async (req, res) => {
  try {
    const phone = cleanPhone(req.body?.phone);
    const otp = String(req.body?.otp ?? '').trim();
    if (!phone || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, error: 'Enter the 6-digit OTP' });
    }

    const session = await OtpSession.findOne({ phone, role: 'customer', purpose: 'walkin', merchantId: req.user._id });
    if (!session || session.expiresAt <= new Date()) {
      return res.status(400).json({ success: false, error: 'OTP expired - send a new one' });
    }
    if (session.attemptCount >= 3) {
      return res.status(400).json({ success: false, error: 'Too many wrong attempts - send a new OTP' });
    }
    if (session.otpHash !== hashOtp(otp)) {
      session.attemptCount += 1;
      await session.save();
      return res.status(400).json({ success: false, error: 'Wrong OTP - please check with the customer' });
    }

    await OtpSession.deleteOne({ _id: session._id });
    res.status(200).json({ success: true, data: { walkinToken: signWalkinToken(req.user._id, phone) } });
  } catch (err) {
    console.error('Walk-in verify OTP error:', err);
    res.status(500).json({ success: false, error: 'Could not verify the OTP' });
  }
};

const toAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= MAX_AMOUNT ? round2(n) : null;
};

// Returns { items } or { error }. Catalogue lines must belong to this store; their
// names come from the catalogue, the prices from what the merchant typed.
const buildItems = async (rawItems, merchantId) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return { error: 'Add at least one item' };
  if (rawItems.length > MAX_LINES) return { error: `A bill can have up to ${MAX_LINES} items` };

  const items = [];
  for (const [i, raw] of rawItems.entries()) {
    const n = i + 1;
    const qty = Number(raw?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) return { error: `Item ${n}: quantity must be 1-999` };
    const mrp = toAmount(raw?.mrp);
    const price = toAmount(raw?.price);
    if (mrp === null) return { error: `Item ${n}: enter the item's price` };
    if (price === null) return { error: `Item ${n}: enter the price you sold it for` };
    if (price > mrp) return { error: `Item ${n}: the selling price can't be more than the item's price` };

    const line = { kind: raw?.kind, qty, mrp, price, productId: null, variantId: null, servicePlanId: null };
    if (raw?.kind === 'product') {
      if (!mongoose.isValidObjectId(raw.productId)) return { error: `Item ${n}: product not found` };
      const product = await Product.findOne({ _id: raw.productId, merchantId }).select('name variantOptions').lean();
      if (!product) return { error: `Item ${n}: product not found` };
      line.productId = product._id;
      line.name = product.name;
      if (raw.variantId) {
        if (!mongoose.isValidObjectId(raw.variantId)) return { error: `Item ${n}: option not found` };
        const variant = await ProductVariant.findOne({ _id: raw.variantId, productId: product._id }).select('attributes name').lean();
        if (!variant) return { error: `Item ${n}: option not found` };
        line.variantId = variant._id;
        const label = variantLabel(variant.attributes, product.variantOptions || []) || variant.name;
        if (label) line.name = `${product.name} (${label})`;
      }
    } else if (raw?.kind === 'service') {
      if (!mongoose.isValidObjectId(raw.servicePlanId)) return { error: `Item ${n}: service not found` };
      const plan = await ServicePlan.findOne({ _id: raw.servicePlanId, merchantId }).select('name').lean();
      if (!plan) return { error: `Item ${n}: service not found` };
      line.servicePlanId = plan._id;
      line.name = plan.name;
    } else if (raw?.kind === 'custom') {
      const name = String(raw?.name ?? '').trim().slice(0, 80);
      if (!name) return { error: `Item ${n}: enter the item name` };
      line.name = name;
    } else {
      return { error: `Item ${n}: unknown item type` };
    }
    items.push(line);
  }
  return { items };
};

const totalsFor = (items) => {
  const mrp = round2(items.reduce((s, it) => s + it.mrp * it.qty, 0));
  const paid = round2(items.reduce((s, it) => s + it.price * it.qty, 0));
  return { mrp, paid, discount: round2(mrp - paid), discountPercent: discountPercent(mrp, paid) };
};

// @desc    Save a walk-in sale
// @route   POST /merchants/me/walkin/orders
//          body: { phone, walkinToken?, customerName?, items: [{ kind, productId?, variantId?, servicePlanId?, name?, qty, mrp, price }], note? }
export const createWalkinOrder = async (req, res) => {
  try {
    const merchantId = req.user._id;
    const phone = cleanPhone(req.body?.phone);
    if (!phone) return res.status(400).json({ success: false, error: 'Enter a valid 10-digit mobile number' });

    const user = await findCustomer(phone);
    if (!user && !readWalkinToken(req.body?.walkinToken, merchantId, phone)) {
      return res.status(400).json({ success: false, error: "Verify the customer's number with an OTP first" });
    }

    const { items, error } = await buildItems(req.body?.items, merchantId);
    if (error) return res.status(400).json({ success: false, error });

    const order = await WalkinOrder.create({
      merchantId,
      orderId: `W-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: user?._id || null,
      customerPhone: phone,
      customerName: user ? user.name || '' : String(req.body?.customerName ?? '').trim().slice(0, 60),
      verifiedBy: user ? 'account' : 'otp',
      items,
      totals: totalsFor(items),
      note: String(req.body?.note ?? '').trim().slice(0, 200),
    });

    try {
      await deductStockForWalkin(
        items.filter((it) => it.kind === 'product').map((it) => ({ productId: it.productId, variantId: it.variantId, qty: it.qty, label: it.name })),
        { orderId: order.orderId }
      );
    } catch (stockErr) {
      console.error('[Walk-in] Stock update failed (non-blocking):', stockErr);
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('Create walk-in order error:', err);
    res.status(500).json({ success: false, error: 'Could not save the sale' });
  }
};

// @desc    The store's walk-in sales, newest first
// @route   GET /merchants/me/walkin/orders?page=&limit=
export const getWalkinOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = { merchantId: req.user._id };
    const [orders, total] = await Promise.all([
      WalkinOrder.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      WalkinOrder.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, data: orders, pagination: { page, limit, total, hasMore: page * limit < total } });
  } catch (err) {
    console.error('Get walk-in orders error:', err);
    res.status(500).json({ success: false, error: 'Could not load walk-in sales' });
  }
};

const PERIODS = { today: 1, '7d': 7, '30d': 30, '90d': 90 };

// @desc    Online (app) bookings vs offline (walk-in) sales for a period
// @route   GET /merchants/me/sales-comparison?period=today|7d|30d|90d|all
export const getSalesComparison = async (req, res) => {
  try {
    const merchantId = req.user._id;
    const period = Object.hasOwn(PERIODS, req.query.period) || req.query.period === 'all' ? req.query.period : '30d';
    const end = addDays(startOfLocalDay(), 1);
    const start = period === 'all' ? null : addDays(end, -PERIODS[period]);
    const window = start ? { createdAt: { $gte: start, $lt: end } } : {};

    const onlineMatch = { merchantId, status: { $in: COMPLETED_STATUSES }, ...window };
    const offlineMatch = { merchantId, ...window };

    // The chart covers the period (the last 30 days for "all"; none for today).
    const seriesStart = period === 'today' ? null : start || addDays(end, -30);
    const seriesWindow = seriesStart ? { createdAt: { $gte: seriesStart, $lt: end } } : null;

    const [onlineRow, offlineRow, onlineDays, offlineDays, onlineRecent, offlineRecent] = await Promise.all([
      Redemption.aggregate([
        { $match: onlineMatch },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: { $toDouble: { $ifNull: ['$totals.final', 0] } } },
            discount: { $sum: { $toDouble: { $ifNull: ['$totals.discount', 0] } } },
            customers: { $addToSet: '$customerId' },
          },
        },
      ]),
      WalkinOrder.aggregate([
        { $match: offlineMatch },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$totals.paid' },
            discount: { $sum: '$totals.discount' },
            customers: { $addToSet: '$customerPhone' },
          },
        },
      ]),
      seriesWindow
        ? Redemption.aggregate([
            { $match: { merchantId, status: { $in: COMPLETED_STATUSES }, ...seriesWindow } },
            { $group: { _id: localDayGroup(), online: { $sum: 1 }, onlineRevenue: { $sum: { $toDouble: { $ifNull: ['$totals.final', 0] } } } } },
          ])
        : [],
      seriesWindow
        ? WalkinOrder.aggregate([
            { $match: { merchantId, ...seriesWindow } },
            { $group: { _id: localDayGroup(), offline: { $sum: 1 }, offlineRevenue: { $sum: '$totals.paid' } } },
          ])
        : [],
      Redemption.find(onlineMatch).sort({ createdAt: -1 }).limit(15).populate('customerId', 'name').select('internalId totals createdAt customerId items').lean(),
      WalkinOrder.find(offlineMatch).sort({ createdAt: -1 }).limit(15).select('orderId totals createdAt customerName customerPhone items').lean(),
    ]);

    const summarize = (row) => ({
      orders: row?.orders || 0,
      revenue: Math.round(row?.revenue || 0),
      discount: Math.round(row?.discount || 0),
      customers: row?.customers?.length || 0,
    });

    let series = [];
    if (seriesWindow) {
      const merged = new Map();
      for (const r of [...onlineDays, ...offlineDays]) merged.set(r._id, { ...merged.get(r._id), ...r });
      series = buildDailySeries(seriesStart, end, [...merged.values()], ['online', 'offline', 'onlineRevenue', 'offlineRevenue']);
    }

    const recent = [
      ...onlineRecent.map((r) => ({
        type: 'online',
        id: String(r._id),
        ref: r.internalId || '',
        customer: r.customerId?.name || 'Offerly customer',
        amount: Math.round(Number(r.totals?.final || 0)),
        items: (r.items || []).reduce((s, it) => s + (Number(it.qty) || 1), 0),
        date: r.createdAt,
      })),
      ...offlineRecent.map((o) => ({
        type: 'offline',
        id: String(o._id),
        ref: o.orderId,
        customer: o.customerName || `+91 ${o.customerPhone}`,
        amount: Math.round(o.totals?.paid || 0),
        items: o.items.reduce((s, it) => s + it.qty, 0),
        date: o.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);

    res.status(200).json({
      success: true,
      data: { period, online: summarize(onlineRow[0]), offline: summarize(offlineRow[0]), series, recent },
    });
  } catch (err) {
    console.error('Sales comparison error:', err);
    res.status(500).json({ success: false, error: 'Could not load the comparison' });
  }
};

// @desc    The customer's in-store (walk-in) purchases, matched by account or phone
// @route   GET /users/me/walkin-purchases
export const getMyWalkinPurchases = async (req, res) => {
  try {
    const phone = normalizePhone(req.user.phone || '');
    const or = [{ userId: req.user._id }];
    if (phone.length === 10) or.push({ customerPhone: phone });
    const orders = await WalkinOrder.find({ $or: or })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('merchantId', 'storeName logo city')
      .select('-customerPhone -verifiedBy')
      .lean();
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    console.error('Get walk-in purchases error:', err);
    res.status(500).json({ success: false, error: 'Could not load your in-store purchases' });
  }
};
