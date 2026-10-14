import mongoose from 'mongoose';

// A sale the merchant rang up at the counter for a walk-in customer (the
// "offline" side of the store's bookings). Deliberately separate from
// Redemption: walk-ins don't touch offers, Offerly bonuses, points, milestones
// or the settlement wallet - the merchant sets the price on each line.
//
// The customer is linked by phone. `userId` is set when they were already on
// Offerly; otherwise the phone was OTP-verified at the counter, and the sale
// shows up in their app once they sign up with that number.
const walkinItemSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['product', 'service', 'custom'], required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
    servicePlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicePlan', default: null },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    // Per unit: the item's list price and what the customer actually paid.
    mrp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const walkinOrderSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    // Human-readable bill number, e.g. W-48213 (W = walk-in).
    orderId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerPhone: { type: String, required: true },
    customerName: { type: String, trim: true, default: '' },
    // How the customer was confirmed: an existing Offerly account, or an OTP at the counter.
    verifiedBy: { type: String, enum: ['account', 'otp'], required: true },
    items: { type: [walkinItemSchema], validate: (v) => v.length > 0 },
    totals: {
      mrp: { type: Number, default: 0 },
      paid: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      discountPercent: { type: Number, default: 0 },
    },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

walkinOrderSchema.index({ merchantId: 1, createdAt: -1 });
walkinOrderSchema.index({ customerPhone: 1, createdAt: -1 });
walkinOrderSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('WalkinOrder', walkinOrderSchema);
