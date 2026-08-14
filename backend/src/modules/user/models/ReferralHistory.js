import mongoose from "mongoose";

const referralHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    amount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.models.ReferralHistory ||
  mongoose.model("ReferralHistory", referralHistorySchema);
