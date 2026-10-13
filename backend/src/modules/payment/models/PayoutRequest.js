import mongoose from 'mongoose';

// A store asking Offerly to pay out its settlement wallet. The admin pays
// outside the app (bank / UPI) and marks it paid with a reference.
const payoutRequestSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'rejected'],
      default: 'pending',
      index: true,
    },
    // Where to pay, as it stood when the store asked
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      bankName: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    // Bank / UPI reference the admin enters when paying
    reference: {
      type: String,
      default: '',
    },
    adminNote: {
      type: String,
      default: '',
    },
    processedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  { timestamps: true }
);

payoutRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.PayoutRequest || mongoose.model('PayoutRequest', payoutRequestSchema);
