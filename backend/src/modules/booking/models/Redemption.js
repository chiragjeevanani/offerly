import mongoose from 'mongoose';

const itemSnapshotSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    category: String,
    price: Number,
    offerPrice: Number,
    isVeg: mongoose.Schema.Types.Mixed,
    duration: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const redemptionItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    product: {
      type: itemSnapshotSchema,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const redemptionSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired', 'cancelled'],
      default: 'pending',
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
    },
    qrExpiry: {
      type: Date,
      required: true,
    },
    scannedAt: Date,
    hasReview: {
      type: Boolean,
      default: false,
    },
    items: {
      type: [redemptionItemSchema],
      default: [],
    },
    totals: {
      base: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      final: {
        type: Number,
        default: 0,
      },
      original: {
        type: Number,
        default: 0,
      },
    },
    internalId: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for feed and analytics performance
redemptionSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
redemptionSchema.index({ offerId: 1, status: 1, createdAt: -1 });
redemptionSchema.index({ customerId: 1, createdAt: -1 });
redemptionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Redemption', redemptionSchema);
