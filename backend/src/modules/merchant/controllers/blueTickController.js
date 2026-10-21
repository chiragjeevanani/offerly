import Merchant from '../models/Merchant.js';
import {
  getBlueTickSettings,
  shapeBlueTickSettings,
  refreshBlueTick,
  refreshAllBlueTicks,
} from '../services/blueTickService.js';

// Admin-editable numbers: [field, min, max, label]
const NUMBER_FIELDS = [
  ['minRating', 1, 5, 'Minimum rating'],
  ['minReviews', 0, 1000, 'Minimum reviews'],
  ['minWalkinsPerWeek', 0, 10000, 'Walk-in sales per week'],
  ['readyWithinMinutes', 1, 240, 'Ready within (minutes)'],
  ['minOnTimePercent', 0, 100, 'On-time share (%)'],
  ['maxRejectionsPerWeek', 0, 1000, 'Rejections per week'],
];

// @desc    The store's blue tick status and progress on each rule (fresh check)
// @route   GET /merchants/me/blue-tick
// @access  Private (Merchant)
export const getMyBlueTick = async (req, res) => {
  try {
    const data = await refreshBlueTick(req.user._id);
    if (!data) return res.status(404).json({ success: false, error: 'Store not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('getMyBlueTick error:', err);
    res.status(500).json({ success: false, error: 'Failed to load blue tick status' });
  }
};

const withCounts = async (settings) => {
  const [verified, approved] = await Promise.all([
    Merchant.countDocuments({ status: 'approved', verified: true }),
    Merchant.countDocuments({ status: 'approved' }),
  ]);
  return { ...shapeBlueTickSettings(settings), counts: { verified, approved } };
};

// @desc    Blue tick rules + how many stores have the tick
// @route   GET /admin/blue-tick-settings
// @access  Private (Admin)
export const getBlueTickConfig = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: await withCounts(await getBlueTickSettings()) });
  } catch (err) {
    console.error('getBlueTickConfig error:', err);
    res.status(500).json({ success: false, error: 'Failed to load blue tick settings' });
  }
};

// @desc    Update the blue tick rules, then re-check every store
// @route   PUT /admin/blue-tick-settings
// @access  Private (Admin)
export const updateBlueTickConfig = async (req, res) => {
  try {
    const settings = await getBlueTickSettings();
    const body = req.body || {};
    if (body.enabled !== undefined) settings.enabled = Boolean(body.enabled);
    for (const [field, min, max, label] of NUMBER_FIELDS) {
      if (body[field] === undefined) continue;
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value < min || value > max) {
        return res.status(400).json({ success: false, error: `${label} must be between ${min} and ${max}` });
      }
      settings[field] = field === 'minRating' ? Math.round(value * 10) / 10 : Math.round(value);
    }
    await settings.save();
    const result = await refreshAllBlueTicks();
    res.status(200).json({ success: true, data: await withCounts(settings), result });
  } catch (err) {
    console.error('updateBlueTickConfig error:', err);
    res.status(500).json({ success: false, error: 'Failed to save blue tick settings' });
  }
};
