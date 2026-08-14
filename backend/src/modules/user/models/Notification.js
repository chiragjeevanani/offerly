import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    body: {
      type: String,
      trim: true,
      required: true,
    },
    type: {
      type: String,
      default: "general",
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
