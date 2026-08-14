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

export default mongoose.model('Review', reviewSchema);
