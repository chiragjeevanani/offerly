import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    offerType: {
      type: String,
      enum: ['product', 'service', 'generic'],
      default: 'generic', // For backward compatibility
    },
    // Product-based offer fields
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      default: null,
    },
    applyToAllVariants: {
      type: Boolean,
      default: false,
    },
    // Service-based offer fields
    servicePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServicePlan',
      default: null,
    },
    bookingRequired: {
      type: Boolean,
      default: false,
    },
    bookingWindowDays: {
      type: Number,
      default: 7,
    },
    // Common fields
    title: {
      type: String,
      required: [true, 'Please add an offer title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
    },
    image: {
      type: String,
      required: [true, 'Please add an image'],
    },
    customImage: {
      type: String,
      default: null,
    },
    useCustomImage: {
      type: Boolean,
      default: false,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat', 'bogo', 'custom', 'fixed'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: true,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validTo: {
      type: Date,
      required: true,
    },
    maxRedemptions: {
      type: Number,
      default: 100,
    },
    currentRedemptions: {
      type: Number,
      default: 0,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    saves: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'active',
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    isNew: {
      type: Boolean,
      default: true,
    },
    terms: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
offerSchema.index({ isNew: 1, status: 1 });
offerSchema.index({ isTrending: 1, status: 1 });
offerSchema.index({ merchantId: 1, status: 1 });
offerSchema.index({ category: 1, status: 1 });
offerSchema.index({ createdAt: -1 });
offerSchema.index({ status: 1, validTo: 1 });
offerSchema.index({ status: 1, merchantId: 1, createdAt: -1 });
offerSchema.index({ status: 1, isTrending: 1, createdAt: -1 });
offerSchema.index({ status: 1, isNew: 1, createdAt: -1 });
offerSchema.index({ status: 1, saves: -1, createdAt: -1 });

export default mongoose.model('Offer', offerSchema);
