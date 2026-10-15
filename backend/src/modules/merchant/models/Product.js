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
    // veg | non_veg | egg for food items (null = not food / not set). isVeg is
    // kept in step for older screens: true only for veg.
    foodType: {
      type: String,
      enum: ['veg', 'non_veg', 'egg', null],
      default: null,
    },
    stock: {
      type: Number,
      default: 0,
    },
    // Units held for unexpired booking passes. Available = stock - reserved.
    // Set aside when a pass is generated, released if it expires or is
    // cancelled, and moved out of `stock` when the merchant completes it.
    reserved: {
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
    // Whether tapping the item in the store opens its full product page. Off =
    // the item stays a plain row the customer can only add to the cart.
    showDetailPage: {
      type: Boolean,
      default: true,
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
// Keep foodType and isVeg in step whichever one a client sent
productSchema.pre('validate', function syncFoodType() {
  if (this.isModified('foodType')) {
    this.isVeg = this.foodType ? this.foodType === 'veg' : null;
  } else if (this.isModified('isVeg')) {
    this.foodType = this.isVeg === true ? 'veg' : this.isVeg === false ? 'non_veg' : null;
  }
});

productSchema.index({ merchantId: 1, isActive: 1 });
productSchema.index({ merchantId: 1, categoryType: 1 });

export default mongoose.model('Product', productSchema);
