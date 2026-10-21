import mongoose from 'mongoose';

// Singleton document (there is only ever one). The rules a store must meet to
// carry the blue tick (Merchant.verified) in the customer app. Edited by admins
// under Blue Tick; blueTickService re-checks every store hourly and on save.
const blueTickSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    // 1. Rating - every store. minReviews stops one 5-star review from qualifying.
    minRating: { type: Number, default: 4, min: 1, max: 5 },
    minReviews: { type: Number, default: 3, min: 0, max: 1000 },
    // 2. Walk-in sales in the last 7 days - stores that take pickup / dine-in.
    minWalkinsPerWeek: { type: Number, default: 5, min: 0, max: 10000 },
    // 3. Delivery orders marked Ready within this many minutes of accepting
    //    (last 30 days), as a share of the accepted orders.
    readyWithinMinutes: { type: Number, default: 20, min: 1, max: 240 },
    minOnTimePercent: { type: Number, default: 80, min: 0, max: 100 },
    // 4. Delivery orders the store declined or never answered, last 7 days.
    maxRejectionsPerWeek: { type: Number, default: 2, min: 0, max: 1000 },
  },
  { timestamps: true }
);

export default mongoose.models.BlueTickSettings || mongoose.model('BlueTickSettings', blueTickSettingsSchema);
