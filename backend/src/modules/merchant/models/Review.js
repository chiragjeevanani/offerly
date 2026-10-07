import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The completed pass this review is for. One review per pass; reviews that
    // predate this field have none, hence the partial index below.
    redemptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Redemption',
    },
    customerName: String,
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index(
  { redemptionId: 1 },
  { unique: true, partialFilterExpression: { redemptionId: { $type: 'objectId' } } }
);
reviewSchema.index({ merchantId: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
