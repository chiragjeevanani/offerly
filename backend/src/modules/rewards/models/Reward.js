import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Reward title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat', 'freebie', 'custom'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    couponCode: {
      type: String,
      default: '',
      trim: true,
    },
    expiresInDays: {
      type: Number,
      default: 30, // Days after card is revealed before reward coupon expires
    },
    image: {
      type: String,
      default: '',
    },
    isGlobal: {
      type: Boolean,
      default: true, // Available as fallback for any milestone level
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

rewardSchema.index({ isActive: 1, isGlobal: 1 });

export default mongoose.models.Reward || mongoose.model('Reward', rewardSchema);
