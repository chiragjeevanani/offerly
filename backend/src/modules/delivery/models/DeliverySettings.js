import mongoose from 'mongoose';

// Singleton document (there is only ever one). Everything an admin controls
// about home delivery of product orders. With `enabled` off the whole module
// disappears: customers only see pickup, and new delivery orders are refused.
// Orders already placed still run to the end.
const deliverySettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    // Flat charge per delivery order, waived once the items total reaches
    // freeDeliveryMinOrder (0 = never free).
    deliveryFee: { type: Number, default: 30, min: 0 },
    freeDeliveryMinOrder: { type: Number, default: 0, min: 0 },
    // On: a new order (once paid, if online) waits for the admin, who calls the
    // customer and then sends it on to the store. Off: it goes straight to the store.
    adminVerification: { type: Boolean, default: false },
    // Offerly's UPI ID for the "scan & pay" QR the partner shows at the door for
    // a cash-on-delivery order. Empty = the partner only offers cash.
    collectUpiId: { type: String, trim: true, default: '' },
    collectUpiName: { type: String, trim: true, default: 'Offerly' },
    // Which ways a delivery order can be paid. At least one stays on.
    allowCod: { type: Boolean, default: true },
    allowOnline: { type: Boolean, default: true },
    // Stores further than this from the customer's pin can't deliver (0 = no limit).
    maxDistanceKm: { type: Number, default: 0, min: 0 },
    // What a delivery partner earns per completed delivery, paid out by admin.
    partnerPayoutPerDelivery: { type: Number, default: 0, min: 0 },
    // Orders one partner can carry at once.
    maxActiveOrdersPerPartner: { type: Number, default: 3, min: 1, max: 20 },
    // Pool shows only area/pincode until a partner accepts; off = full address + phone up front.
    hideDropUntilAccepted: { type: Boolean, default: true },
    // Incentive targets: deliver `deliveries` orders within the period and earn
    // `bonus` on top of the per-delivery payout. Several can run at once (say a
    // daily one and a weekly one). Periods follow IST calendar days, Monday-start
    // weeks and calendar months.
    targets: {
      type: [
        {
          period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
          deliveries: { type: Number, required: true, min: 1, max: 5000 },
          bonus: { type: Number, required: true, min: 1, max: 1000000 },
          active: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    // A free item for orders at or above minOrderValue, described by the admin.
    freeGift: {
      enabled: { type: Boolean, default: false },
      minOrderValue: { type: Number, default: 0, min: 0 },
      title: { type: String, trim: true, default: '' },
      description: { type: String, trim: true, default: '' },
      // 'delivery' = only delivery orders get it, 'all' = pickup orders too.
      appliesTo: { type: String, enum: ['delivery', 'all'], default: 'delivery' },
    },
  },
  { timestamps: true }
);

export default mongoose.models.DeliverySettings || mongoose.model('DeliverySettings', deliverySettingsSchema);
