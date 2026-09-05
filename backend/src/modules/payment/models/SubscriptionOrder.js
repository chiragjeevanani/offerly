import mongoose from "mongoose";

// Server-side record of a Razorpay order created for a merchant-plan purchase.
// Exists so `verifySubscription` can bind a payment proof back to the exact
// plan/amount it was created for, instead of trusting the client-supplied
// planId at verify time (see purchaseSubscription/verifySubscription).
const subscriptionOrderSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    listPrice: {
      type: Number,
      default: 0,
    },
    walletDiscountApplied: {
      type: Number,
      default: 0,
    },
    planType: {
      type: String,
      enum: ["merchant", "advertisement"],
      default: "merchant",
    },
    status: {
      type: String,
      enum: ["created", "consumed"],
      default: "created",
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.SubscriptionOrder ||
  mongoose.model("SubscriptionOrder", subscriptionOrderSchema);
