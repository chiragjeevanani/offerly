import mongoose from 'mongoose';

// A notification an admin sent from Admin > Send Notification, kept as history.
// Each recipient gets an ordinary notification (bell + live + phone push)
// through notificationService; this row records what was sent and the counts.
const adminBroadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    body: { type: String, required: true, trim: true, maxlength: 300 },
    audience: {
      // all_customers | city_customers | customer | all_merchants | city_merchants | merchant
      type: { type: String, required: true },
      city: { type: String, default: '' },
      targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
      // Human label for the history list, e.g. "All customers in Digboi", "Rahul (9876543210)".
      label: { type: String, default: '' },
    },
    // Where a tap opens: an in-app path like /store/<id>, or '' for the notifications page.
    link: { type: String, default: '' },
    linkLabel: { type: String, default: '' },
    status: { type: String, enum: ['sending', 'sent', 'failed'], default: 'sending' },
    recipients: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 }, // in-app notifications saved
    pushed: { type: Number, default: 0 }, // phones a push reached
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    finishedAt: Date,
  },
  { timestamps: true }
);

adminBroadcastSchema.index({ createdAt: -1 });

export default mongoose.models.AdminBroadcast || mongoose.model('AdminBroadcast', adminBroadcastSchema);
