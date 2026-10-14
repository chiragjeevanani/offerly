import mongoose from 'mongoose';

const otpSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['customer', 'merchant'],
    },
    purpose: {
      type: String,
      required: true,
      // walkin: a merchant confirming a walk-in customer's number at the counter
      enum: ['login', 'register', 'walkin'],
    },
    // Only for purpose 'walkin': the store that asked, so another store can't use the code.
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

otpSessionSchema.index({ phone: 1, role: 1, purpose: 1 }, { unique: true });

export default mongoose.model('OtpSession', otpSessionSchema);
