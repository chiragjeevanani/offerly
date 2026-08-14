import mongoose from 'mongoose';

const adRequestSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    storeName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['banner', 'featured'],
      default: 'banner',
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    paymentId: {
      type: String,
      required: true,
    },
    adText: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    image: {
      type: String,
      default: '',
    },
    expiryAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
adRequestSchema.index({ status: 1, expiryAt: 1 });
adRequestSchema.index({ merchantId: 1, status: 1 });

export default mongoose.model('AdRequest', adRequestSchema);
