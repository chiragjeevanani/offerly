import Redemption from '../../booking/models/Redemption.js';
import MilestoneConfig from '../models/MilestoneConfig.js';
import Reward from '../models/Reward.js';
import ScratchCard from '../models/ScratchCard.js';
import { emitUserNotification } from '../../../config/socket.js';

/**
 * Generate unique coupon code for a reward if none is configured
 */
const generateCouponCode = (level, discountType) => {
  const prefix = discountType === 'percentage' ? 'OFF' : 'DEAL';
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OFFERLY-${prefix}${level}-${rand}`;
};

/**
 * Checks and awards any earned milestone scratch cards for a user
 * Triggered after an offer redemption/claim is marked completed
 */
export const checkAndAwardMilestone = async (userId) => {
  try {
    if (!userId) return { awarded: [] };

    // 1. Count total completed claimed offers for this user
    const completedClaimsCount = await Redemption.countDocuments({
      customerId: userId,
      status: 'completed',
    });

    // 2. Find all active milestones that this claim count satisfies
    const eligibleMilestones = await MilestoneConfig.find({
      level: { $lte: completedClaimsCount },
      isActive: true,
    }).sort({ level: 1 });

    if (!eligibleMilestones || eligibleMilestones.length === 0) {
      return { completedClaimsCount, awarded: [] };
    }

    const awardedCards = [];

    // 3. Check each eligible milestone level
    for (const milestone of eligibleMilestones) {
      // Check if user already received a card for this milestone level
      const existingCard = await ScratchCard.findOne({
        userId,
        milestoneLevel: milestone.level,
      });

      if (existingCard) {
        continue; // Already awarded for this level
      }

      // Pick a reward from milestone's specific pool or global pool
      let eligibleRewards = [];
      if (milestone.rewardPool && milestone.rewardPool.length > 0) {
        eligibleRewards = await Reward.find({
          _id: { $in: milestone.rewardPool },
          isActive: true,
        });
      }

      // Fallback to global active rewards if milestone pool is empty
      if (eligibleRewards.length === 0) {
        eligibleRewards = await Reward.find({
          isActive: true,
          isGlobal: true,
        });
      }

      // If still no reward found, pick any active reward
      if (eligibleRewards.length === 0) {
        eligibleRewards = await Reward.find({ isActive: true });
      }

      let selectedReward = null;
      if (eligibleRewards.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleRewards.length);
        selectedReward = eligibleRewards[randomIndex];
      }

      const couponCode =
        selectedReward?.couponCode ||
        generateCouponCode(milestone.level, selectedReward?.discountType || 'percentage');

      const card = await ScratchCard.create({
        userId,
        milestoneId: milestone._id,
        milestoneLevel: milestone.level,
        milestoneName: milestone.name,
        rewardId: selectedReward?._id || null,
        rewardSnapshot: {
          title: selectedReward?.title || `Level ${milestone.level} Milestone Reward`,
          description: selectedReward?.description || `Reward for claiming ${milestone.level} offers on Offerly`,
          discountType: selectedReward?.discountType || 'percentage',
          discountValue: selectedReward?.discountValue || 10,
          couponCode,
          image: selectedReward?.image || '',
        },
        status: 'unscratched',
        expiresAt: new Date(Date.now() + (selectedReward?.expiresInDays || 30) * 24 * 60 * 60 * 1000),
      });

      awardedCards.push(card);

      // Emit real-time notification via WebSocket
      try {
        emitUserNotification(userId.toString(), {
          type: 'milestone_reward_earned',
          title: '🎉 Scratch Card Unlocked!',
          body: `You completed ${completedClaimsCount} claimed offers! Scratch your new reward card now.`,
          cardId: card._id,
          milestoneLevel: milestone.level,
        });
      } catch (socketErr) {
        console.error('[MilestoneService] Socket notification error (non-blocking):', socketErr);
      }
    }

    return { completedClaimsCount, awarded: awardedCards };
  } catch (error) {
    console.error('[MilestoneService] checkAndAwardMilestone error:', error);
    throw error;
  }
};

/**
 * Get user claim count, level progress, roadmap, and scratch cards
 */
export const getUserMilestoneProgress = async (userId) => {
  const completedClaimsCount = await Redemption.countDocuments({
    customerId: userId,
    status: 'completed',
  });

  const allMilestones = await MilestoneConfig.find({ isActive: true }).sort({ level: 1 });
  const userCards = await ScratchCard.find({ userId }).sort({ createdAt: -1 });

  // Find next milestone
  const nextMilestone = allMilestones.find((m) => m.level > completedClaimsCount) || null;
  const currentMilestone = [...allMilestones].reverse().find((m) => m.level <= completedClaimsCount) || null;

  // Calculate percentage to next milestone
  let progressPercent = 100;
  let claimsNeededForNext = 0;

  if (nextMilestone) {
    const prevLevel = currentMilestone ? currentMilestone.level : 0;
    const range = nextMilestone.level - prevLevel;
    const progressInRange = completedClaimsCount - prevLevel;
    progressPercent = Math.min(100, Math.max(0, Math.round((progressInRange / range) * 100)));
    claimsNeededForNext = nextMilestone.level - completedClaimsCount;
  }

  // Build roadmap items
  const roadmap = allMilestones.map((m) => {
    const isUnlocked = completedClaimsCount >= m.level;
    const cardForMilestone = userCards.find((c) => c.milestoneLevel === m.level);
    return {
      _id: m._id,
      level: m.level,
      name: m.name,
      description: m.description,
      badgeIcon: m.badgeIcon,
      isUnlocked,
      hasCard: !!cardForMilestone,
      cardStatus: cardForMilestone ? cardForMilestone.status : null,
      cardId: cardForMilestone ? cardForMilestone._id : null,
    };
  });

  return {
    totalClaimedOffers: completedClaimsCount,
    currentLevel: completedClaimsCount,
    progressPercent,
    claimsNeededForNext,
    currentMilestone,
    nextMilestone,
    roadmap,
    cardsCount: {
      total: userCards.length,
      unscratched: userCards.filter((c) => c.status === 'unscratched').length,
      scratched: userCards.filter((c) => c.status === 'scratched').length,
    },
  };
};

/**
 * Scratch and reveal a card
 */
export const revealScratchCard = async (userId, cardId) => {
  const card = await ScratchCard.findOne({ _id: cardId, userId });

  if (!card) {
    const error = new Error('Scratch card not found');
    error.statusCode = 404;
    throw error;
  }

  if (card.status === 'unscratched') {
    card.status = 'scratched';
    card.scratchedAt = new Date();
    await card.save();
  }

  return card;
};
