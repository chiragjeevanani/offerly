import Joi from 'joi';
import mongoose from 'mongoose';
import Redemption from '../../booking/models/Redemption.js';
import Review from '../models/Review.js';
import Merchant from '../models/Merchant.js';

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  const schema = Joi.object({
    redemptionId: Joi.string().required(),
    // merchantId/offerId are still accepted from older clients but the pass decides them.
    merchantId: Joi.string(),
    offerId: Joi.string().allow(null),
    rating: Joi.number().min(1).max(5).required(),
    text: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { redemptionId, rating, text } = req.body;

    if (!mongoose.isValidObjectId(redemptionId)) {
      return res.status(400).json({ success: false, error: 'Invalid booking' });
    }

    // Only a customer who actually completed a pass can review that store, and
    // each pass can be reviewed once.
    const redemption = await Redemption.findOne({
      _id: redemptionId,
      customerId: req.user.id,
      status: 'completed',
    }).select('merchantId offerId');

    if (!redemption) {
      return res.status(403).json({ success: false, error: 'You can only review a store after a completed booking' });
    }

    const merchantId = redemption.merchantId;

    let review;
    try {
      review = await Review.create({
        merchantId,
        offerId: redemption.offerId || undefined,
        redemptionId: redemption._id,
        customerId: req.user.id,
        customerName: req.user.name?.trim() || 'Customer',
        rating,
        text,
      });
    } catch (createErr) {
      if (createErr.code === 11000) {
        return res.status(409).json({ success: false, error: 'You have already reviewed this booking' });
      }
      throw createErr;
    }

    // Update merchant average rating
    const [stats] = await Review.aggregate([
      { $match: { merchantId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    await Merchant.findByIdAndUpdate(merchantId, {
      avgRating: Number((stats?.avg || 0).toFixed(1)),
      totalReviews: stats?.count || 0,
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get reviews for a merchant
// @route   GET /api/reviews/merchant/:merchantId
// @access  Public
export const getMerchantReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ merchantId: req.params.merchantId })
      .sort('-createdAt')
      .limit(20);

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
