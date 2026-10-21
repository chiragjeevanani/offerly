import mongoose from 'mongoose';
import AdminBroadcast from '../models/AdminBroadcast.js';
import User from '../../user/models/User.js';
import Merchant from '../../merchant/models/Merchant.js';
import Offer from '../../merchant/models/Offer.js';
import { notifyMerchant, notifyUser } from '../../user/services/notificationService.js';

// Admin > Send Notification: one message to all customers, a city's customers,
// one customer, or the same for merchants. Each recipient gets a normal
// notification (bell + live + phone push); sending runs in the background and
// the history row is updated with the counts.

const AUDIENCES = {
  all_customers: { who: 'customer', label: () => 'All customers' },
  city_customers: { who: 'customer', label: (city) => `Customers in ${city}` },
  customer: { who: 'customer', label: () => '' },
  all_merchants: { who: 'merchant', label: () => 'All merchants' },
  city_merchants: { who: 'merchant', label: (city) => `Merchants in ${city}` },
  merchant: { who: 'merchant', label: () => '' },
};

// Taps open an in-app path. Customers: /home, /store/<id>, /offer/<id>.
// Merchants: a few panel pages.
const MERCHANT_LINKS = {
  '/merchant': 'Dashboard',
  '/merchant/subscription': 'My Plan',
  '/merchant/blue-tick': 'Blue Tick',
  '/merchant/wallet': 'Offerly Wallet',
  '/merchant/offers': 'Offers',
};

const escapeRegex = (v = '') => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cityMatch = (city) => new RegExp(`^${escapeRegex(city.trim())}$`, 'i');
const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const PARALLEL = 10;

const recipientQuery = ({ type, city, targetId }) => {
  if (type === 'all_customers') return { status: { $ne: 'blocked' } };
  if (type === 'city_customers') return { status: { $ne: 'blocked' }, city: cityMatch(city) };
  if (type === 'customer') return { _id: targetId };
  if (type === 'all_merchants') return { status: 'approved' };
  if (type === 'city_merchants') return { status: 'approved', city: cityMatch(city) };
  return { _id: targetId };
};

const modelFor = (type) => (AUDIENCES[type].who === 'customer' ? User : Merchant);

// Checks the request; returns { error } or the clean broadcast fields.
const cleanRequest = async (body = {}) => {
  const title = String(body.title || '').trim();
  const message = String(body.body || '').trim();
  const type = String(body.audience?.type || '');
  const city = String(body.audience?.city || '').trim();
  const targetId = body.audience?.targetId || null;
  const link = String(body.link || '').trim();

  if (!title) return { error: 'Add a title' };
  if (title.length > 80) return { error: 'Keep the title to 80 characters' };
  if (!message) return { error: 'Add a message' };
  if (message.length > 300) return { error: 'Keep the message to 300 characters' };
  if (!AUDIENCES[type]) return { error: 'Choose who gets it' };
  if (type.startsWith('city_') && !city) return { error: 'Choose a city' };

  let label = AUDIENCES[type].label(city);
  if (type === 'customer' || type === 'merchant') {
    if (!validId(targetId)) return { error: `Choose the ${type}` };
    const target = type === 'customer'
      ? await User.findById(targetId).select('name phone').lean()
      : await Merchant.findById(targetId).select('storeName phone').lean();
    if (!target) return { error: `That ${type} no longer exists` };
    label = `${target.name || target.storeName || 'Unnamed'}${target.phone ? ` (${target.phone})` : ''}`;
  }

  // Link: must be a page that audience can open.
  let linkLabel = '';
  const who = AUDIENCES[type].who;
  if (link) {
    if (who === 'merchant') {
      if (!MERCHANT_LINKS[link]) return { error: 'Pick a merchant page to open' };
      linkLabel = MERCHANT_LINKS[link];
    } else if (link === '/home') {
      linkLabel = 'Home';
    } else {
      const [, kind, id] = link.match(/^\/(store|offer)\/([a-f0-9]{24})$/) || [];
      if (!kind) return { error: 'Pick a store or offer to open' };
      if (kind === 'store') {
        const store = await Merchant.findOne({ _id: id, status: 'approved' }).select('storeName').lean();
        if (!store) return { error: 'That store is not live' };
        linkLabel = `Store: ${store.storeName}`;
      } else {
        const offer = await Offer.findById(id).select('title').lean();
        if (!offer) return { error: 'That offer no longer exists' };
        linkLabel = `Offer: ${offer.title}`;
      }
    }
  }
  return { value: { title, body: message, audience: { type, city, targetId: targetId || null, label }, link, linkLabel } };
};

// Sends to everyone in the audience, a few at a time, then saves the counts.
const deliver = async (broadcast) => {
  const { type } = broadcast.audience;
  const notify = AUDIENCES[type].who === 'customer' ? notifyUser : notifyMerchant;
  let delivered = 0;
  let pushed = 0;
  try {
    const ids = (await modelFor(type).find(recipientQuery(broadcast.audience)).select('_id').lean()).map((r) => String(r._id));
    await AdminBroadcast.updateOne({ _id: broadcast._id }, { $set: { recipients: ids.length } });
    for (let i = 0; i < ids.length; i += PARALLEL) {
      const results = await Promise.all(ids.slice(i, i + PARALLEL).map((id) =>
        notify(id, {
          title: broadcast.title,
          body: broadcast.body,
          type: 'general',
          data: { broadcastId: String(broadcast._id), ...(broadcast.link ? { link: broadcast.link } : {}) },
          link: broadcast.link || (AUDIENCES[type].who === 'customer' ? '/notifications' : '/merchant/notifications'),
        }).catch(() => null)
      ));
      for (const r of results) {
        if (r?.persisted) delivered += 1;
        pushed += r?.push?.sent || 0;
      }
    }
    await AdminBroadcast.updateOne({ _id: broadcast._id }, { $set: { status: 'sent', delivered, pushed, finishedAt: new Date() } });
  } catch (err) {
    console.error('[Broadcast] Send failed:', err);
    await AdminBroadcast.updateOne({ _id: broadcast._id }, { $set: { status: 'failed', delivered, pushed, finishedAt: new Date() } });
  }
};

// @desc    How many people an audience reaches (shown before sending)
// @route   GET /admin/broadcasts/count?type=&city=
export const countAudience = async (req, res) => {
  try {
    const type = String(req.query.type || '');
    const city = String(req.query.city || '');
    if (!AUDIENCES[type] || type === 'customer' || type === 'merchant') return res.status(200).json({ success: true, count: 1 });
    if (type.startsWith('city_') && !city) return res.status(200).json({ success: true, count: 0 });
    const count = await modelFor(type).countDocuments(recipientQuery({ type, city }));
    res.status(200).json({ success: true, count });
  } catch (err) {
    console.error('countAudience error:', err);
    res.status(500).json({ success: false, error: 'Failed to count recipients' });
  }
};

// @desc    Pickers: find a customer, merchant, store or offer by name/phone
// @route   GET /admin/broadcasts/search?kind=customer|merchant|store|offer&q=
export const searchTargets = async (req, res) => {
  try {
    const kind = String(req.query.kind || '');
    const q = String(req.query.q || '').trim().slice(0, 50);
    if (q.length < 2) return res.status(200).json({ success: true, data: [] });
    const rx = new RegExp(escapeRegex(q), 'i');
    let data = [];
    if (kind === 'customer') {
      const rows = await User.find({ $or: [{ name: rx }, { phone: rx }] }).select('name phone city').limit(8).lean();
      data = rows.map((u) => ({ id: String(u._id), title: u.name || 'Unnamed', sub: [u.phone, u.city].filter(Boolean).join(' · ') }));
    } else if (kind === 'merchant' || kind === 'store') {
      const filter = { $or: [{ storeName: rx }, { phone: rx }], ...(kind === 'store' ? { status: 'approved' } : {}) };
      const rows = await Merchant.find(filter).select('storeName phone city status').limit(8).lean();
      data = rows.map((m) => ({ id: String(m._id), title: m.storeName || 'Unnamed store', sub: [m.phone, m.city, kind === 'merchant' ? m.status : ''].filter(Boolean).join(' · ') }));
    } else if (kind === 'offer') {
      const rows = await Offer.find({ title: rx, status: 'active' }).select('title merchantId').populate('merchantId', 'storeName').limit(8).lean();
      data = rows.map((o) => ({ id: String(o._id), title: o.title, sub: o.merchantId?.storeName || '' }));
    }
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('searchTargets error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// @desc    Send a notification now
// @route   POST /admin/broadcasts   body: { title, body, audience: { type, city, targetId }, link }
export const sendBroadcast = async (req, res) => {
  try {
    const { value, error } = await cleanRequest(req.body);
    if (error) return res.status(400).json({ success: false, error });
    const broadcast = await AdminBroadcast.create({ ...value, sentBy: req.user._id });
    // Big audiences take a while; the admin sees progress in the history list.
    deliver(broadcast);
    res.status(201).json({ success: true, data: broadcast });
  } catch (err) {
    console.error('sendBroadcast error:', err);
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
};

// @desc    Past notifications sent by admins
// @route   GET /admin/broadcasts
export const getBroadcasts = async (req, res) => {
  try {
    const data = await AdminBroadcast.find().sort({ createdAt: -1 }).limit(50).lean();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('getBroadcasts error:', err);
    res.status(500).json({ success: false, error: 'Failed to load sent notifications' });
  }
};
