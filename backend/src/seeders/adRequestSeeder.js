import mongoose from 'mongoose';
import AdRequest from '../modules/admin/models/AdRequest.js';

const adRequests = [
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Royal Restaurant
    storeName: 'Royal Restaurant',
    type: 'banner',
    status: 'approved',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80',
    expiryAt: new Date('2026-05-15T23:59:59Z'),
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'), // Style Salon
    storeName: 'Style Salon & Spa',
    type: 'featured',
    status: 'approved',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80',
    expiryAt: new Date('2026-04-30T23:59:59Z'),
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'), // Indore Food Street
    storeName: 'Indore Food Street',
    type: 'banner',
    status: 'approved',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80',
    expiryAt: new Date('2026-06-30T23:59:59Z'),
  },
];

export const seedAdRequests = async () => {
  try {
    const count = await AdRequest.countDocuments();
    
    if (count === 0) {
      await AdRequest.insertMany(adRequests);
      console.log('✅ Ad requests seeded successfully');
      return true;
    } else {
      console.log('ℹ️  Ad requests already exist, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error seeding ad requests:', error.message);
    throw error;
  }
};
