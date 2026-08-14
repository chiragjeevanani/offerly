import mongoose from 'mongoose';

const servicePlanSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: 0,
    },
    duration: {
      type: String,
      default: '30 days',
    },
    inclusions: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxBookings: {
      type: Number,
      default: 0,
    },
    validityDays: {
      type: Number,
      default: 30,
    },
    requiresBooking: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
servicePlanSchema.index({ merchantId: 1, isActive: 1 });

export default mongoose.model('ServicePlan', servicePlanSchema);
