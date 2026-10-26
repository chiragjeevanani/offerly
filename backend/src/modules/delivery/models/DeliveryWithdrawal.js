import mongoose from 'mongoose';

// A partner asking to be paid what Offerly owes them. The amount leaves
// stats.earningsDue when requested (so it can't be asked for twice) and goes
// back if the admin rejects it. The admin pays outside the app (UPI / bank) and
// marks it paid with a reference.
const deliveryWithdrawalSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['requested', 'paid', 'rejected'], default: 'requested' },
    // Where to send it, copied from the partner's payout details at request time.
    payoutTo: {
      upiId: String,
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
    },
    // The payout period it was made in ("daily:2026-10-26" / "weekly:2026-10-26"):
    // one request per period.
    windowKey: { type: String, required: true },
    reference: { type: String, default: '' },
    rejectReason: { type: String, default: '' },
    paidAt: Date,
    rejectedAt: Date,
  },
  { timestamps: true }
);

deliveryWithdrawalSchema.index({ partnerId: 1, createdAt: -1 });
deliveryWithdrawalSchema.index({ status: 1, createdAt: 1 });
// At most one live (not rejected) request per partner per payout period.
deliveryWithdrawalSchema.index(
  { partnerId: 1, windowKey: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['requested', 'paid'] } } }
);

export default mongoose.models.DeliveryWithdrawal || mongoose.model('DeliveryWithdrawal', deliveryWithdrawalSchema);
