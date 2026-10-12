import mongoose from 'mongoose';

const scratchCardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MilestoneConfig',
      default: null,
    },
    milestoneLevel: {
      type: Number,
      required: true,
    },
    milestoneName: {
      type: String,
      default: '',
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
      default: null,
    },
    // Snapshot of the reward details at award time
    rewardSnapshot: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      discountType: { type: String, default: 'percentage' },
      discountValue: { type: Number, default: 0 },
      couponCode: { type: String, default: '' },
      image: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['unscratched', 'scratched', 'redeemed', 'expired'],
      default: 'unscratched',
      index: true,
    },
    // 'milestone' = a configured level; 'repeat' = the Nth bonus card past the
    // top level (repeatIndex). Older cards have no kind and are milestones.
    kind: {
      type: String,
      enum: ['milestone', 'repeat'],
      default: 'milestone',
    },
    repeatIndex: {
      type: Number,
      default: null,
    },
    // Wallet credits paid out on scratch (rewardSnapshot.discountType 'credits')
    creditsAwarded: {
      type: Number,
      default: 0,
    },
    // Expiry bookkeeping for the credits once paid out. Only tracked when the
    // credits can expire (creditsExpireAt set); see services/rewardCreditService.js.
    creditsRemaining: {
      type: Number,
      default: 0,
    },
    creditsExpireAt: {
      type: Date,
      default: null,
    },
    creditsExpired: {
      type: Boolean,
      default: false,
    },
    scratchedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

scratchCardSchema.index({ userId: 1, milestoneLevel: 1 });
scratchCardSchema.index({ userId: 1, status: 1, createdAt: -1 });
// Expiring credit grants, spent soonest-expiring first
scratchCardSchema.index({ userId: 1, creditsExpireAt: 1 }, { partialFilterExpression: { creditsRemaining: { $gt: 0 } } });

export default mongoose.models.ScratchCard || mongoose.model('ScratchCard', scratchCardSchema);
