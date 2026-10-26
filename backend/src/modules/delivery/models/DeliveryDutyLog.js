import mongoose from 'mongoose';

// One row each time a partner goes online or offline (their own switch, the
// admin turning delivery off, or the account being blocked). Shift rules read
// these to see when a partner started and how long they were off during a shift.
const deliveryDutyLogSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true },
    online: { type: Boolean, required: true },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

deliveryDutyLogSchema.index({ partnerId: 1, at: 1 });

export default mongoose.models.DeliveryDutyLog || mongoose.model('DeliveryDutyLog', deliveryDutyLogSchema);
