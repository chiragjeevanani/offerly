import mongoose from 'mongoose';

// Singleton document (there is only ever one). Global on/off switch for the
// customer-facing Claim Milestones & Rewards feature - see
// services/milestoneService.js (isRewardsEnabled) for how this is read.
const rewardsSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.RewardsSettings ||
  mongoose.model('RewardsSettings', rewardsSettingsSchema);
