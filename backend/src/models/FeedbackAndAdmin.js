import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: String,
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Review = mongoose.model('Review', reviewSchema);

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model('Notification', notificationSchema);

// Note: City and Plan models are defined in modules/admin/models/
// Removed from here to avoid duplicate model compilation
