import mongoose from 'mongoose';

// One row each time a partner accepted an order and then gave it up (released
// it before pickup). Counted against the admin's cancellation limit: a partner
// at or over it in a target's period gets no bonus for that period.
const deliveryReleaseSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true },
    redemptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Redemption', required: true },
    // The order was given by auto-assign: recorded (so it isn't given back to
    // them) but not counted as a cancellation.
    autoAssigned: { type: Boolean },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

deliveryReleaseSchema.index({ partnerId: 1, createdAt: -1 });

export default mongoose.models.DeliveryRelease || mongoose.model('DeliveryRelease', deliveryReleaseSchema);
