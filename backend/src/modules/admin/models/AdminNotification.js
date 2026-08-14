import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema(
  {
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
      enum: ['merchant_signup', 'kyc_update', 'ad_request', 'subscription', 'support', 'general'],
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

export default mongoose.models.AdminNotification || mongoose.model('AdminNotification', adminNotificationSchema);
