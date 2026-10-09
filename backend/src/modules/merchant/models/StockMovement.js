import mongoose from 'mongoose';

// One row per change to a tracked product's (or variant's) stock, so a
// merchant can see why a count moved. `stock` is the physical shelf count;
// `reserved` is units set aside for unexpired booking passes.
const stockMovementSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
    // reserved: a pass set units aside   released: an expired/cancelled pass gave them back
    // sold: a pass was completed         adjusted: the merchant changed the count by hand
    type: {
      type: String,
      enum: ['reserved', 'released', 'sold', 'adjusted'],
      required: true,
    },
    stockChange: { type: Number, default: 0 },
    reservedChange: { type: Number, default: 0 },
    stockAfter: { type: Number, default: null },
    reservedAfter: { type: Number, default: null },
    redemptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Redemption', default: null },
    passId: { type: String, default: '' },
    label: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ productId: 1, createdAt: -1 });
stockMovementSchema.index({ merchantId: 1, createdAt: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
