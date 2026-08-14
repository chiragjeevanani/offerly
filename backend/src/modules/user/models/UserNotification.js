import mongoose from 'mongoose';

const userNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
      enum: ['offer_nearby', 'credit_earned', 'booking_status', 'general'],
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

export default mongoose.models.UserNotification || mongoose.model('UserNotification', userNotificationSchema);
