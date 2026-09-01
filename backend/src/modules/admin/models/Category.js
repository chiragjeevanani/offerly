import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a category name'],
      unique: true,
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    type: {
      type: String,
      enum: ['product', 'service'],
      required: [true, 'Please specify category type'],
    },
    offer_mode: {
      type: String,
      enum: ['product', 'service'],
      default: function() {
        return this.type; // Default to same as type for backward compatibility
      },
    },
    requires_booking: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
      default: 'category',
      trim: true,
    },
    color: {
      type: String,
      default: '#3D7A4F',
      match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color code'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    order: {
      type: Number,
      default: 0,
    },
    merchantCount: {
      type: Number,
      default: 0,
    },
    offerCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries. `name` already gets a unique index from the
// schema field above - a second explicit index({ name: 1 }) is redundant.
categorySchema.index({ status: 1, order: 1 });

export default mongoose.model('Category', categorySchema);
