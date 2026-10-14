import mongoose from 'mongoose';
import HomeBanner from '../models/HomeBanner.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseDate = (value) => {
  if (value === null || value === undefined || value === '') return { value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: 'Invalid date' };
  return { value: date };
};

// Returns { value } or { error } from the admin form body. `partial` skips fields not sent.
const buildBanner = (body = {}, partial = false) => {
  const out = {};
  const has = (k) => !partial || body[k] !== undefined;

  if (has('image')) {
    const image = typeof body.image === 'string' ? body.image.trim() : '';
    if (!image) return { error: 'Upload a banner image' };
    out.image = image;
  }
  if (has('title')) out.title = String(body.title ?? '').trim().slice(0, 80);
  if (has('link')) {
    const link = String(body.link ?? '').trim();
    if (link && !/^https?:\/\//i.test(link) && !link.startsWith('/')) {
      return { error: 'Link must start with https:// or / (e.g. /store/<id>)' };
    }
    out.link = link.slice(0, 500);
  }
  if (has('cities')) {
    const cities = Array.isArray(body.cities) ? body.cities : [];
    out.cities = [...new Set(cities.map((c) => String(c).trim()).filter(Boolean))];
  }
  if (has('isActive')) out.isActive = body.isActive !== false;
  for (const key of ['startDate', 'endDate']) {
    if (!has(key)) continue;
    const { value, error } = parseDate(body[key]);
    if (error) return { error: `${key === 'startDate' ? 'Start' : 'End'} date is invalid` };
    out[key] = value;
  }
  if (out.startDate && out.endDate && out.endDate < out.startDate) {
    return { error: 'End date must be after the start date' };
  }
  if (has('sortOrder') && body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    if (Number.isFinite(n)) out.sortOrder = n;
  }
  return { value: out };
};

// @desc    All banners for the admin list (in display order)
// @route   GET /admin/home-banners
export const getHomeBanners = async (req, res) => {
  try {
    const banners = await HomeBanner.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: banners });
  } catch (err) {
    console.error('Get home banners error:', err);
    res.status(500).json({ success: false, error: 'Failed to load banners' });
  }
};

// @route   POST /admin/home-banners
export const createHomeBanner = async (req, res) => {
  try {
    const { value, error } = buildBanner(req.body);
    if (error) return res.status(400).json({ success: false, error });
    // New banners go to the end of the carousel.
    const last = await HomeBanner.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
    const banner = await HomeBanner.create({ ...value, sortOrder: (last?.sortOrder ?? -1) + 1 });
    res.status(201).json({ success: true, data: banner });
  } catch (err) {
    console.error('Create home banner error:', err);
    res.status(500).json({ success: false, error: 'Failed to save banner' });
  }
};

// @route   PUT /admin/home-banners/:id
export const updateHomeBanner = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Banner not found' });
    }
    const banner = await HomeBanner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, error: 'Banner not found' });
    const { value, error } = buildBanner(req.body, true);
    if (error) return res.status(400).json({ success: false, error });
    banner.set(value);
    if (banner.startDate && banner.endDate && banner.endDate < banner.startDate) {
      return res.status(400).json({ success: false, error: 'End date must be after the start date' });
    }
    await banner.save();
    res.status(200).json({ success: true, data: banner });
  } catch (err) {
    console.error('Update home banner error:', err);
    res.status(500).json({ success: false, error: 'Failed to save banner' });
  }
};

// @desc    Save the carousel order
// @route   PUT /admin/home-banners/reorder   body: { ids: [...] }
export const reorderHomeBanners = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => mongoose.isValidObjectId(id)) : [];
    if (!ids.length) return res.status(400).json({ success: false, error: 'Nothing to reorder' });
    await HomeBanner.bulkWrite(
      ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } } }))
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Reorder home banners error:', err);
    res.status(500).json({ success: false, error: 'Failed to save order' });
  }
};

// @route   DELETE /admin/home-banners/:id
export const deleteHomeBanner = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Banner not found' });
    }
    const deleted = await HomeBanner.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Banner not found' });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete home banner error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete banner' });
  }
};

// @desc    Live banners for the customer home carousel
// @route   GET /users/home-banners?city=
export const getPublicHomeBanners = async (req, res) => {
  try {
    const now = new Date();
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const cityMatch = [{ cities: { $size: 0 } }];
    if (city) cityMatch.push({ cities: { $regex: `^${escapeRegex(city)}$`, $options: 'i' } });

    const banners = await HomeBanner.find({
      isActive: true,
      $and: [
        { $or: cityMatch },
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .select('image title link')
      .limit(10)
      .lean();
    res.status(200).json({ success: true, data: banners });
  } catch (err) {
    console.error('Get public home banners error:', err);
    res.status(500).json({ success: false, error: 'Failed to load banners' });
  }
};

// @desc    Count a tap on a banner (for the admin's click stats)
// @route   POST /users/home-banners/:id/click
export const trackHomeBannerClick = async (req, res) => {
  try {
    if (mongoose.isValidObjectId(req.params.id)) {
      await HomeBanner.updateOne({ _id: req.params.id }, { $inc: { clicks: 1 } });
    }
    res.status(204).end();
  } catch (err) {
    console.error('Track home banner click error:', err);
    res.status(204).end();
  }
};
