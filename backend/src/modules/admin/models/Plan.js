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
    insightsEnabled: {
      type: Boolean,
      default: false,
    },
    features: [String],
    applicableCities: {
      type: [String],
      default: [], // Empty means global/all cities
    },
    // Per-zone price overrides. zoneId matches the _id of a City.zones subdocument
    // (the same value stored on Merchant.zone). Falls back to `price` when no
    // override matches the merchant's own city+zone.
    zonePricing: {
      type: [
        {
          city: { type: String, trim: true },
          zoneId: { type: String, trim: true },
          zoneName: { type: String, trim: true },
          price: { type: Number, min: 0 },
        },
      ],
      default: [],
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
