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

export default mongoose.models.ScratchCard || mongoose.model('ScratchCard', scratchCardSchema);
