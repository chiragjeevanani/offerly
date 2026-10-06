import mongoose from "mongoose";

// Audit trail for Merchant.discountWallet.balance movements.
const discountWalletTransactionSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "subscription_credit",
        "subscription_redeem",
        "customer_discount_debit",
        // Manual changes made from the admin panel.
        "admin_credit",
        "admin_debit",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantSubscription",
      default: null,
    },
    redemptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Redemption",
      default: null,
    },
    note: {
      type: String,
      default: "",
    },
    // Set for admin_credit / admin_debit.
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true },
);

discountWalletTransactionSchema.index({ merchantId: 1, createdAt: -1 });

export default mongoose.models.DiscountWalletTransaction ||
  mongoose.model("DiscountWalletTransaction", discountWalletTransactionSchema);
