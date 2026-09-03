import mongoose from 'mongoose';

const kybDocumentSchema = new mongoose.Schema(
  {
    // Keep key name as "type" because onboarding flow depends on values like "aadhaar_front".
    type: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      default: '',
      trim: true,
    },
    url: {
      type: String,
      required: true,
      default: '',
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    size: {
      type: Number,
      default: 0,
      min: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const merchantSchema = new mongoose.Schema(
  {
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      unique: true,
      sparse: true,
    },
    storeName: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    locality: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    // References a zone subdocument _id nested under City.zones (City model).
    zone: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    password: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      default: 'merchant',
    },
    logo: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    photos: {
      type: [String],
      default: [],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // Manual open/closed toggle the merchant flips themselves - independent
    // of businessHours (that's a schedule; this is "are we taking orders right now").
    isOpen: {
      type: Boolean,
      default: true,
    },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    hasUsedFreeTrial: {
      type: Boolean,
      default: false,
    },
    // Funds the extra "new user" discount at checkout, and rolls forward as a
    // subscription-renewal credit. See utils/subscriptionWallet.js.
    discountWallet: {
      balance: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    coordinates: {
      lat: {
        type: Number,
        default: 0,
      },
      lng: {
        type: Number,
        default: 0,
      },
    },
    hasRequestedStore: {
      type: Boolean,
      default: false,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalRedemptions: {
      type: Number,
      default: 0,
    },
    distance: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    joinedAt: {
      type: Date,
      default: null,
    },
    businessType: {
      type: String,
      default: '',
    },
    storeType: {
      type: String,
      enum: ['product_based', 'service_based'],
      default: 'product_based',
    },
    onboardingStep: {
      type: Number,
      enum: [0, 1, 2, 3, 4], // 0=not started, 1=account, 2=business, 3=kyb, 4=location (completed)
      default: 0,
    },
    businessHours: {
      monday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      friday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, isClosed: { type: Boolean, default: true } },
    },
    businessEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    businessPhone: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    pincode: {
      type: String,
      default: '',
    },
    gstNumber: {
      type: String,
      default: '',
    },
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      bankName: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    documents: {
      type: [kybDocumentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
merchantSchema.index({ city: 1, status: 1 });
merchantSchema.index({ category: 1, status: 1 });
merchantSchema.index({ totalRedemptions: -1 });
merchantSchema.index({ status: 1, createdAt: -1 });
// `phone` already gets a unique index from the schema field above.
merchantSchema.index({ coordinates: '2d' }); // For geospatial queries
merchantSchema.index({ status: 1, city: 1, avgRating: -1 });
merchantSchema.index({ status: 1, city: 1, totalRedemptions: -1 });
merchantSchema.index({ status: 1, zone: 1 });

export default mongoose.model('Merchant', merchantSchema);
