import mongoose from 'mongoose';

const milestoneConfigSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: [true, 'Milestone claim level is required'],
      unique: true,
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
