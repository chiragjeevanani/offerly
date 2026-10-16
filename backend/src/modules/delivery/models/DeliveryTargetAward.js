import mongoose from 'mongoose';

// One row per target a partner hit in one period. The unique index is what makes
// the bonus pay exactly once per target per period, however many deliveries
// land at the same moment. deliveries/bonus are copied from the target at the
// time, so editing a target later never rewrites what was already paid.
const deliveryTargetAwardSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    // e.g. "weekly:2026-10-12" - the period's first day in IST
    windowKey: { type: String, required: true },
    deliveries: { type: Number, required: true },
    bonus: { type: Number, required: true },
    redemptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Redemption' },
  },
  { timestamps: true }
);

deliveryTargetAwardSchema.index({ partnerId: 1, targetId: 1, windowKey: 1 }, { unique: true });
deliveryTargetAwardSchema.index({ partnerId: 1, createdAt: -1 });

export default mongoose.models.DeliveryTargetAward || mongoose.model('DeliveryTargetAward', deliveryTargetAwardSchema);
