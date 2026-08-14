import Joi from 'joi';
import Review from '../models/Review.js';
import Merchant from '../models/Merchant.js';

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  const schema = Joi.object({
    merchantId: Joi.string().required(),
    offerId: Joi.string().allow(null),
    rating: Joi.number().min(1).max(5).required(),
    text: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const { merchantId, offerId, rating, text } = req.body;

    const review = await Review.create({
      merchantId,
      offerId,
      customerId: req.user.id,
      customerName: req.user.name,
      rating,
      text,
    });

    // Update merchant average rating
    const reviews = await Review.find({ merchantId });
    const avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
    
    await Merchant.findByIdAndUpdate(merchantId, {
      avgRating: avgRating.toFixed(1),
      totalReviews: reviews.length,
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
