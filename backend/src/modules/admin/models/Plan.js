import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: String,
      required: true,
      enum: ['Lifetime', 'Monthly', 'Yearly'],
    },
    maxProducts: {
      type: Number,
      required: true,
      min: 0,
    },
    maxOffers: {
      type: Number,
      default: 999,
      min: 0,
    },
    trialDays: {
      type: Number,
      default: 0, // 0 means no limit unless it's a fixed duration
    },
    features: [String],
    applicableCities: {
      type: [String],
      default: [], // Empty means global/all cities
    },
    planType: {
      type: String,
      enum: ['merchant', 'advertisement'],
      default: 'merchant',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Plan', planSchema);
