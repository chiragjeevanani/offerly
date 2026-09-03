import mongoose from "mongoose";

const merchantSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      default: null,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    paymentId: {
      type: String,
      default: null,
    },
    orderId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending"],
      default: "pending",
      index: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    // The plan's list price for the merchant's zone before any wallet discount
    // was applied, and how much of that discount came from the wallet. Kept for
    // audit/display; `amount` above is what was actually charged (listPrice - walletDiscountApplied).
    listPrice: {
      type: Number,
      default: 0,
    },
    walletDiscountApplied: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    planType: {
      type: String,
      enum: ["merchant", "advertisement"],
      default: "merchant",
    },
  },
  { timestamps: true },
);

export default mongoose.models.MerchantSubscription ||
  mongoose.model("MerchantSubscription", merchantSubscriptionSchema);
