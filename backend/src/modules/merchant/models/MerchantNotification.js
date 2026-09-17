import mongoose from 'mongoose';

const merchantNotificationSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      // 'new_booking' matches what Bookings.jsx already listens for on the
      // socket; keep the two in step or the notification emits fine but never
      // persists, and the merchant's list silently misses every booking.
      enum: [
        'new_booking',
        'offer_approved',
        'subscription_expiry',
        'ad_status',
        'payment',
        'store_status',
        'merchant_application',
        'general',
      ],
      default: 'general',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.MerchantNotification || mongoose.model('MerchantNotification', merchantNotificationSchema);
