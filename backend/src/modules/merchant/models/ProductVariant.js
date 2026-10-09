import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Variant name is required'],
      trim: true,
    },
    // Option values for this combination, e.g. { Size: 'M', Colour: 'Red' }.
    // `name` holds the display label ("M / Red").
    attributes: {
      type: Map,
      of: String,
      default: {},
    },
    sku: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    offerPrice: {
      type: Number,
      required: [true, 'Offer price is required'],
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    // Units held for unexpired booking passes. Available = stock - reserved.
    reserved: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
productVariantSchema.index({ productId: 1, isActive: 1 });

export default mongoose.model('ProductVariant', productVariantSchema);
