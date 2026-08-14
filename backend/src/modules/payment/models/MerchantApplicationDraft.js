import mongoose from "mongoose";

const merchantApplicationDraftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    status: {
      type: String,
      enum: ["payment_pending", "payment_verified", "submitted", "failed", "expired"],
      default: "payment_pending",
      index: true,
    },
    applicationData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    orderId: {
      type: String,
      default: "",
      index: true,
    },
    paymentId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.models.MerchantApplicationDraft ||
  mongoose.model("MerchantApplicationDraft", merchantApplicationDraftSchema);
