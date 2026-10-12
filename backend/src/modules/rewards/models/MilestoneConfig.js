import mongoose from 'mongoose';

const milestoneConfigSchema = new mongoose.Schema(
  {
    // Ordinal shown to customers ("Level 2"). Unique.
    level: {
      type: Number,
      required: [true, 'Milestone claim level is required'],
      unique: true,
      min: 1,
    },
    // Progress needed to reach this level, in RewardsSettings.metric units
    // (claims, ₹ spent, ₹ saved or stores). Older docs have none - their
    // level number doubled as the claim count, see milestoneTarget().
    threshold: {
      type: Number,
      default: null,
      min: 1,
    },
    name: {
      type: String,
      required: [true, 'Milestone name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    badgeIcon: {
      type: String,
      default: 'medal', // 'medal' | 'trophy' | 'star' | 'crown' | 'gift'
    },
    // Wallet credits (₹, 1 credit = ₹1) the customer gets when they scratch
    // this level's card. Spent at checkout like referral points. 0 = badge
    // only, no scratch card is issued.
    rewardCredits: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Legacy: random pick from Reward docs. No longer set from the admin UI;
    // kept so old milestones and already-issued cards still resolve.
    rewardPool: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reward',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

milestoneConfigSchema.index({ level: 1, isActive: 1 });

export default mongoose.models.MilestoneConfig || mongoose.model('MilestoneConfig', milestoneConfigSchema);
