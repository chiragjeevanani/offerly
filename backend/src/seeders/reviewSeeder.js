import mongoose from 'mongoose';
import Review from '../modules/merchant/models/Review.js';

const reviews = [
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    offerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
    customerId: new mongoose.Types.ObjectId('65f8a2b5e4b0a1a2b3c4d5e1'),
    customerName: 'Arjun Sharma',
    rating: 5,
    text: 'Excellent food and great service! The 20% discount made it even better. Highly recommend the butter chicken.',
    createdAt: new Date('2026-03-20T16:00:00Z')
  }
];

export const seedReviews = async () => {
  try {
    const count = await Review.countDocuments();
    if (count === 0) {
      await Review.insertMany(reviews);
      console.log('✅ Reviews seeded successfully');
      return true;
    } else {
      console.log('ℹ️  Reviews already exist, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error seeding reviews:', error.message);
    throw error;
  }
};
