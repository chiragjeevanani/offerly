import MilestoneConfig from '../models/MilestoneConfig.js';
import Reward from '../models/Reward.js';
import ScratchCard from '../models/ScratchCard.js';
import {
  getUserMilestoneProgress,
  revealScratchCard,
  checkAndAwardMilestone,
  getRewardsSettings,
  isRewardsEnabled,
  milestoneTarget,
} from '../services/milestoneService.js';

const rewardsDisabledResponse = (res) =>
  res.status(403).json({
    success: false,
    code: 'REWARDS_DISABLED',
    message: 'Milestones & Rewards are currently unavailable',
  });

// ==========================================
// SETTINGS (global on/off toggle)
// ==========================================

// Public - the customer app reads this to decide whether to show rewards UI
export const getRewardsSettingsConfig = async (_req, res, next) => {
  try {
    const settings = await getRewardsSettings();
    return res.status(200).json({ success: true, enabled: settings.enabled !== false });
  } catch (error) {
    next(error);
  }
};

const SETTINGS_ENUMS = {
  metric: ['claims', 'spent', 'saved', 'stores'],
  progressWindow: ['lifetime', 'rolling', 'monthly', 'yearly'],
  revealMode: ['scratch', 'instant'],
};
// field -> minimum allowed whole number
const SETTINGS_NUMBERS = {
  minBillValue: 0,
  maxClaimsPerStorePerDay: 0,
  rollingDays: 1,
  repeatEvery: 1,
  repeatCredits: 0,
  cardExpiryDays: 0,
  creditExpiryDays: 0,
};
const SETTINGS_BOOLEANS = ['enabled', 'repeatEnabled'];
const SETTINGS_TEXT = { notifyTitle: 80, notifyBody: 240 };

const serializeSettings = (s) => ({
  enabled: s.enabled !== false,
  metric: s.metric,
  minBillValue: s.minBillValue,
  maxClaimsPerStorePerDay: s.maxClaimsPerStorePerDay,
  progressWindow: s.progressWindow,
  rollingDays: s.rollingDays,
  repeatEnabled: s.repeatEnabled,
  repeatEvery: s.repeatEvery,
  repeatCredits: s.repeatCredits,
  revealMode: s.revealMode,
  cardExpiryDays: s.cardExpiryDays,
  creditExpiryDays: s.creditExpiryDays,
  notifyTitle: s.notifyTitle,
  notifyBody: s.notifyBody,
});

export const getAdminRewardsSettings = async (_req, res, next) => {
  try {
    const settings = await getRewardsSettings();
    return res.status(200).json({ success: true, settings: serializeSettings(settings) });
  } catch (error) {
    next(error);
  }
};

// Partial update - only the fields sent are changed
export const updateRewardsSettingsConfig = async (req, res, next) => {
  try {
    const body = req.body || {};
    const settings = await getRewardsSettings();

    for (const field of SETTINGS_BOOLEANS) {
      if (body[field] === undefined) continue;
      if (typeof body[field] !== 'boolean') {
        return res.status(400).json({ success: false, message: `${field} must be true or false` });
      }
      settings[field] = body[field];
    }
    for (const [field, allowed] of Object.entries(SETTINGS_ENUMS)) {
      if (body[field] === undefined) continue;
      if (!allowed.includes(body[field])) {
        return res.status(400).json({ success: false, message: `${field} must be one of ${allowed.join(', ')}` });
      }
      settings[field] = body[field];
    }
    for (const [field, min] of Object.entries(SETTINGS_NUMBERS)) {
      if (body[field] === undefined) continue;
      const n = Number(body[field]);
      if (!Number.isFinite(n) || n < min) {
        return res.status(400).json({ success: false, message: `${field} must be a number of at least ${min}` });
      }
      settings[field] = Math.floor(n);
    }
    for (const [field, max] of Object.entries(SETTINGS_TEXT)) {
      if (body[field] === undefined) continue;
      const text = String(body[field] ?? '').trim();
      if (text.length > max) {
        return res.status(400).json({ success: false, message: `${field} must be at most ${max} characters` });
      }
      settings[field] = text;
    }

    await settings.save();
    return res.status(200).json({ success: true, enabled: settings.enabled, settings: serializeSettings(settings) });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CUSTOMER CONTROLLERS
// ==========================================

export const getMyProgress = async (req, res, next) => {
  try {
    if (!(await isRewardsEnabled())) return rewardsDisabledResponse(res);
    const progress = await getUserMilestoneProgress(req.user._id);
    return res.status(200).json({ success: true, ...progress });
  } catch (error) {
    next(error);
  }
};

export const getMyCards = async (req, res, next) => {
  try {
    if (!(await isRewardsEnabled())) return rewardsDisabledResponse(res);
    const { status } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;

    const cards = await ScratchCard.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, cards });
  } catch (error) {
    next(error);
  }
};

export const scratchCard = async (req, res, next) => {
  try {
    if (!(await isRewardsEnabled())) return rewardsDisabledResponse(res);
    const { cardId } = req.params;
    const card = await revealScratchCard(req.user._id, cardId);
    return res.status(200).json({ success: true, card });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN CONTROLLERS: MILESTONES
// ==========================================

const BADGE_ICONS = ['medal', 'trophy', 'star', 'crown', 'gift'];
const withTarget = (m) => ({ ...m.toObject(), target: milestoneTarget(m) });

// Higher levels must need more progress, or the roadmap reads backwards
const checkTargetOrder = async (id, level, target) => {
  const others = await MilestoneConfig.find(id ? { _id: { $ne: id } } : {}).lean();
  const below = others.filter((m) => m.level < level).map(milestoneTarget);
  const above = others.filter((m) => m.level > level).map(milestoneTarget);
  const floor = below.length ? Math.max(...below) : 0;
  const ceil = above.length ? Math.min(...above) : Infinity;
  if (target <= floor || target >= ceil) {
    return ceil === Infinity
      ? `Level ${level} needs a target above ${floor}`
      : `Level ${level} needs a target above ${floor} and below ${ceil}`;
  }
  return null;
};

const parseTarget = (value) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : null;
};

export const getAdminMilestones = async (_req, res, next) => {
  try {
    const milestones = await MilestoneConfig.find().sort({ level: 1 });
    return res.status(200).json({ success: true, milestones: milestones.map(withTarget) });
  } catch (error) {
    next(error);
  }
};

export const createAdminMilestone = async (req, res, next) => {
  try {
    const { level, threshold, name, description, badgeIcon, rewardCredits, isActive } = req.body;

    const levelNum = parseTarget(level);
    const target = parseTarget(threshold);
    if (!levelNum || !name || !target) {
      return res.status(400).json({ success: false, message: 'Level, target and name are required' });
    }

    const existing = await MilestoneConfig.findOne({ level: levelNum });
    if (existing) {
      return res.status(400).json({ success: false, message: `Milestone for Level ${levelNum} already exists` });
    }
    const orderError = await checkTargetOrder(null, levelNum, target);
    if (orderError) return res.status(400).json({ success: false, message: orderError });

    const milestone = await MilestoneConfig.create({
      level: levelNum,
      threshold: target,
      name,
      description: description || '',
      badgeIcon: BADGE_ICONS.includes(badgeIcon) ? badgeIcon : 'medal',
      rewardCredits: Math.max(0, Math.floor(Number(rewardCredits) || 0)),
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({ success: true, milestone: withTarget(milestone) });
  } catch (error) {
    next(error);
  }
};

export const updateAdminMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { level, threshold, name, description, badgeIcon, rewardCredits, isActive } = req.body;

    const milestone = await MilestoneConfig.findById(id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    if (level !== undefined) {
      const levelNum = parseTarget(level);
      if (!levelNum) return res.status(400).json({ success: false, message: 'Level must be 1 or more' });
      if (levelNum !== milestone.level) {
        const existing = await MilestoneConfig.findOne({ level: levelNum, _id: { $ne: id } });
        if (existing) {
          return res.status(400).json({ success: false, message: `Milestone for Level ${levelNum} already exists` });
        }
        milestone.level = levelNum;
      }
    }
    if (threshold !== undefined) {
      const target = parseTarget(threshold);
      if (!target) return res.status(400).json({ success: false, message: 'Target must be 1 or more' });
      milestone.threshold = target;
    }
    if (level !== undefined || threshold !== undefined) {
      const orderError = await checkTargetOrder(id, milestone.level, milestoneTarget(milestone));
      if (orderError) return res.status(400).json({ success: false, message: orderError });
    }

    if (name !== undefined) milestone.name = name;
    if (description !== undefined) milestone.description = description;
    if (badgeIcon !== undefined && BADGE_ICONS.includes(badgeIcon)) milestone.badgeIcon = badgeIcon;
    if (rewardCredits !== undefined) milestone.rewardCredits = Math.max(0, Math.floor(Number(rewardCredits) || 0));
    if (isActive !== undefined) milestone.isActive = isActive;

    await milestone.save();
    return res.status(200).json({ success: true, milestone: withTarget(milestone) });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    await MilestoneConfig.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Milestone deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN CONTROLLERS: REWARDS POOL
// ==========================================

export const getAdminRewards = async (_req, res, next) => {
  try {
    const rewards = await Reward.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, rewards });
  } catch (error) {
    next(error);
  }
};

export const createAdminReward = async (req, res, next) => {
  try {
    const {
      title,
      description,
      discountType,
      discountValue,
      couponCode,
      expiresInDays,
      image,
      isGlobal,
      isActive,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Reward title is required' });
    }

    const reward = await Reward.create({
      title,
      description: description || '',
      discountType: discountType || 'percentage',
      discountValue: discountValue ? Number(discountValue) : 0,
      couponCode: couponCode || '',
      expiresInDays: expiresInDays ? Number(expiresInDays) : 30,
      image: image || '',
      isGlobal: isGlobal !== undefined ? isGlobal : true,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({ success: true, reward });
  } catch (error) {
    next(error);
  }
};

export const updateAdminReward = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reward = await Reward.findById(id);
    if (!reward) {
      return res.status(404).json({ success: false, message: 'Reward not found' });
    }

    const allowedFields = [
      'title',
      'description',
      'discountType',
      'discountValue',
      'couponCode',
      'expiresInDays',
      'image',
      'isGlobal',
      'isActive',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        reward[field] = req.body[field];
      }
    }

    await reward.save();
    return res.status(200).json({ success: true, reward });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminReward = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Reward.findByIdAndDelete(id);
    // Remove reference from milestone pools
    await MilestoneConfig.updateMany({ rewardPool: id }, { $pull: { rewardPool: id } });
    return res.status(200).json({ success: true, message: 'Reward deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN CONTROLLERS: ISSUED SCRATCH CARDS
// ==========================================

export const getAdminCards = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;

    const cards = await ScratchCard.find(query)
      .populate('userId', 'name phone email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await ScratchCard.countDocuments(query);

    return res.status(200).json({
      success: true,
      cards,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const card = await ScratchCard.findByIdAndDelete(id);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Scratch card not found' });
    }
    return res.status(200).json({ success: true, message: 'Scratch card deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Manual award / trigger helper for admin testing
export const triggerMilestoneCheckAdmin = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const targetUserId = userId || req.user._id;
    const result = await checkAndAwardMilestone(targetUserId);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
};
