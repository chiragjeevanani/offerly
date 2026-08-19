import mongoose from 'mongoose';

// Append-only record of offer views.
//
// `Offer.impressions` is kept as a fast lifetime counter, but a counter alone can't
// answer "how many views did this offer get last Tuesday" - which is what the merchant
// insights report needs. So each countable view also lands here as an event.
//
// Deduplication is enforced by the unique index on { offerId, viewerKey, bucket }:
// `bucket` is the 30-minute window the view fell into, so a customer scrolling past
// the same card ten times in a session produces one row, not ten. Writes are issued
// unordered and duplicate-key errors are swallowed by the controller.
const offerViewSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    // Null for logged-out browsing - those views still count towards the merchant's
    // total, they just can't be attributed to a person.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // userId when signed in, otherwise the client's anonymous session id. This is what
    // dedupe and unique-viewer counts key on.
    viewerKey: {
      type: String,
      required: true,
    },
    // Where the view happened, so "detail page opens" can be separated from
    // "scrolled past in the feed" later without another migration.
    source: {
      type: String,
      enum: ['feed', 'detail', 'store', 'search', 'saved', 'other'],
      default: 'other',
    },
    bucket: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// One countable view per viewer, per offer, per 30-minute bucket.
offerViewSchema.index({ offerId: 1, viewerKey: 1, bucket: 1 }, { unique: true });

// Backs the merchant analytics aggregations.
offerViewSchema.index({ merchantId: 1, createdAt: -1 });
offerViewSchema.index({ merchantId: 1, offerId: 1, createdAt: -1 });

// Raw events expire after 180 days. The lifetime totals live on Offer.impressions,
// and the insights report only ever looks back one month, so nothing is lost.
offerViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export default mongoose.model('OfferView', offerViewSchema);
