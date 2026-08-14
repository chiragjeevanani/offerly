import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["merchant_plan"],
      default: "merchant_plan",
      index: true,
    },
    provider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay",
      index: true,
    },
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
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    draftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MerchantApplicationDraft",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },
    orderId: {
      type: String,
      default: "",
      index: true,
    },
    paymentId: {
      type: String,
      default: "",
      index: true,
    },
    signature: {
      type: String,
      default: "",
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    webhooks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
