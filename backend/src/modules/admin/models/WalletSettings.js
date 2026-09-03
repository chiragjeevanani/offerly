import mongoose from 'mongoose';

// Singleton document (there is only ever one). Holds admin-configured knobs for
// the merchant discount wallet feature - currently just the flat rupee amount
// given to platform-first-time customers, funded from the merchant's wallet.
const walletSettingsSchema = new mongoose.Schema(
  {
    newUserDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.WalletSettings || mongoose.model('WalletSettings', walletSettingsSchema);
