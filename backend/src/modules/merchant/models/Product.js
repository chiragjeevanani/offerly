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
