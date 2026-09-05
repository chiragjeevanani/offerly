import MilestoneConfig from '../models/MilestoneConfig.js';
import Reward from '../models/Reward.js';
import ScratchCard from '../models/ScratchCard.js';
import {
  getUserMilestoneProgress,
  revealScratchCard,
  checkAndAwardMilestone,
} from '../services/milestoneService.js';

// ==========================================
// CUSTOMER CONTROLLERS
// ==========================================

export const getMyProgress = async (req, res, next) => {
  try {
    const progress = await getUserMilestoneProgress(req.user._id);
    return res.status(200).json({ success: true, ...progress });
  } catch (error) {
    next(error);
  }
};

export const getMyCards = async (req, res, next) => {
  try {
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

export const getAdminMilestones = async (_req, res, next) => {
  try {
    const milestones = await MilestoneConfig.find()
      .populate('rewardPool', 'title discountType discountValue couponCode isActive')
      .sort({ level: 1 });
    return res.status(200).json({ success: true, milestones });
  } catch (error) {
    next(error);
  }
};

export const createAdminMilestone = async (req, res, next) => {
  try {
    const { level, name, description, badgeIcon, rewardPool, isActive } = req.body;

    if (!level || !name) {
      return res.status(400).json({ success: false, message: 'Level and Name are required' });
    }

    const existing = await MilestoneConfig.findOne({ level });
    if (existing) {
      return res.status(400).json({ success: false, message: `Milestone for Level ${level} already exists` });
    }

    const milestone = await MilestoneConfig.create({
      level: Number(level),
      name,
      description: description || '',
      badgeIcon: badgeIcon || 'medal',
      rewardPool: Array.isArray(rewardPool) ? rewardPool : [],
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({ success: true, milestone });
  } catch (error) {
    next(error);
  }
};

export const updateAdminMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { level, name, description, badgeIcon, rewardPool, isActive } = req.body;

    const milestone = await MilestoneConfig.findById(id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    if (level !== undefined && Number(level) !== milestone.level) {
      const existing = await MilestoneConfig.findOne({ level: Number(level), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Milestone for Level ${level} already exists` });
      }
      milestone.level = Number(level);
    }

    if (name !== undefined) milestone.name = name;
    if (description !== undefined) milestone.description = description;
    if (badgeIcon !== undefined) milestone.badgeIcon = badgeIcon;
    if (rewardPool !== undefined) milestone.rewardPool = rewardPool;
    if (isActive !== undefined) milestone.isActive = isActive;

    await milestone.save();
    return res.status(200).json({ success: true, milestone });
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
