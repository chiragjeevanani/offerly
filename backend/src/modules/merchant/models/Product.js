import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
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
    categoryType: {
      type: String,
      enum: ['product_based', 'service_based'],
      default: 'product_based',
    },
    
    // Product-based specific fields
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductCategory',
      required: [true, 'Category is required'],
      index: true,
    },
    isVeg: {
      type: Boolean,
      default: null,
    },
    stock: {
      type: Number,
      default: 0,
    },
    // Inventory. When trackInventory is on, `stock` (simple products) or each
    // ProductVariant's `stock` is checked at add-to-cart/claim and reduced when
    // the merchant completes the redemption. Off by default so legacy products
    // (stock 0, never tracked) don't suddenly show as sold out.
    trackInventory: {
      type: Boolean,
      default: false,
    },
    // e.g. [{ name: 'Size', values: ['S','M','L'] }, { name: 'Colour', values: ['Red','Blue'] }]
    // Each combination is a ProductVariant with its own stock (and optional price).
    variantOptions: {
      type: [
        {
          _id: false,
          name: { type: String, trim: true, required: true },
          values: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    sku: {
      type: String,
      default: '',
    },
    
    // Service-based specific fields
    duration: {
      type: String,
      default: '',
    },
    inclusions: {
      type: [String],
      default: [],
    },
    maxBookings: {
      type: Number,
      default: 0,
    },
    validityDays: {
      type: Number,
      default: 30,
    },
    requiresBooking: {
      type: Boolean,
      default: false,
    },
    
    // Common fields
    isActive: {
      type: Boolean,
      default: true,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
productSchema.index({ merchantId: 1, isActive: 1 });
productSchema.index({ merchantId: 1, categoryType: 1 });

export default mongoose.model('Product', productSchema);
