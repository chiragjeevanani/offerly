import mongoose from 'mongoose';

// Singleton document (there is only ever one). Every admin-tunable rule of the
// Claim Milestones & Rewards feature lives here - see services/milestoneService.js
// for how each one is applied.
const rewardsSettingsSchema = new mongoose.Schema(
  {
    // Global on/off switch for the customer-facing feature
    enabled: {
      type: Boolean,
      default: true,
    },

    // What moves a customer up the levels. Every MilestoneConfig.threshold is
    // in this unit: claims = completed claims, spent = ₹ bill value,
    // saved = ₹ discount received, stores = different stores claimed at.
    metric: {
      type: String,
      enum: ['claims', 'spent', 'saved', 'stores'],
      default: 'claims',
    },

    // Qualifying claim rules
    minBillValue: { type: Number, default: 0, min: 0 }, // ₹; 0 = any claim counts
    maxClaimsPerStorePerDay: { type: Number, default: 0, min: 0 }, // 0 = no cap

    // Which completed claims count towards progress. Outside 'lifetime' a
    // level can be won again once the window moves on.
    progressWindow: {
      type: String,
      enum: ['lifetime', 'rolling', 'monthly', 'yearly'],
      default: 'lifetime',
    },
    rollingDays: { type: Number, default: 90, min: 1 },

    // Keep rewarding customers past the top level: one more card every
    // `repeatEvery` units (same unit as `metric`).
    repeatEnabled: { type: Boolean, default: false },
    repeatEvery: { type: Number, default: 5, min: 1 },
    repeatCredits: { type: Number, default: 0, min: 0 },

    // Card & credit behaviour
    revealMode: {
      type: String,
      enum: ['scratch', 'instant'], // instant = credited the moment it's won
      default: 'scratch',
    },
    cardExpiryDays: { type: Number, default: 0, min: 0 }, // unscratched cards; 0 = never
    creditExpiryDays: { type: Number, default: 0, min: 0 }, // credits once paid out; 0 = never

    // Push / in-app text when a card is won. Placeholders: {level} {name}
    // {credits}. Empty = built-in text for the reveal mode.
    notifyTitle: { type: String, default: '', trim: true },
    notifyBody: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.RewardsSettings ||
  mongoose.model('RewardsSettings', rewardsSettingsSchema);
