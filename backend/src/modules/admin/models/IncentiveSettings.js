import mongoose from 'mongoose';

// Singleton (there is only ever one). Everything the admin controls about
// customer coupons: Refer & Earn rewards, how referral/reward credits can be
// spent, and the Customer Distribution Fund bonuses paid out of each store's
// discount wallet.

// One bonus rule. `discountType` flat = `value` rupees off; percent = `value`%
// of the order, capped at `maxDiscount` (0 = no cap). Applies only to orders
// of at least `minOrderValue`.
const bonusFields = {
  enabled: { type: Boolean, default: false },
  discountType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
  value: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: 0, min: 0 },
  minOrderValue: { type: Number, default: 0, min: 0 },
};

const occasionSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 60 },
    // IST calendar dates, YYYY-MM-DD, both inclusive
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
  },
  { _id: false }
);

const incentiveSettingsSchema = new mongoose.Schema(
  {
    referral: {
      enabled: { type: Boolean, default: true },
      referrerBonus: { type: Number, default: 50, min: 0 },
      referredBonus: { type: Number, default: 20, min: 0 },
      // The friend's first order must be at least this much to unlock the rewards
      minOrderValue: { type: Number, default: 500, min: 0 },
    },
    // Rules for spending referral / milestone credits on an order
    credits: {
      minOrderValue: { type: Number, default: 0, min: 0 },
      maxPerOrder: { type: Number, default: 0, min: 0 }, // 0 = no limit
    },
    // Smallest amount a store can ask Offerly to pay out (0 = any amount)
    payout: {
      minAmount: { type: Number, default: 100, min: 0 },
    },
    bonuses: {
      newUser: { ...bonusFields },
      returning: {
        ...bonusFields,
        // After a customer gets this bonus, it skips them for this many days
        // (0 = every repeat order). Keeps it from draining store wallets.
        cooldownDays: { type: Number, default: 7, min: 0 },
      },
      welcomeBack: {
        ...bonusFields,
        inactiveDays: { type: Number, default: 30, min: 1 },
      },
      loyal: {
        ...bonusFields,
        minVisits: { type: Number, default: 5, min: 2 },
      },
      specialDay: {
        ...bonusFields,
        birthday: { type: Boolean, default: true },
        // Days either side of the birthday it still applies (0 = the day only)
        birthdayWindowDays: { type: Number, default: 0, min: 0, max: 15 },
        occasions: { type: [occasionSchema], default: [] },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.IncentiveSettings || mongoose.model('IncentiveSettings', incentiveSettingsSchema);
