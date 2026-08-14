import mongoose from 'mongoose';
import Redemption from '../modules/booking/models/Redemption.js';

const redemptions = [
  {
    offerId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    customerId: new mongoose.Types.ObjectId('65f8a2b5e4b0a1a2b3c4d5e1'),
    customerName: 'Arjun Sharma',
    status: 'completed',
    qrToken: 'MOCK-QR-TOKEN-001',
    qrExpiry: new Date('2026-03-20T15:30:00Z'),
    scannedAt: new Date('2026-03-20T15:20:00Z'),
    hasReview: true,
    totals: {
      base: 250,
      discount: 50,
      final: 200,
      original: 250
    },
    internalId: 'red_001',
    createdAt: new Date('2026-03-20T15:05:00Z')
  }
];

export const seedRedemptions = async () => {
  try {
    const count = await Redemption.countDocuments();
    if (count === 0) {
      await Redemption.insertMany(redemptions);
      console.log('✅ Redemptions seeded successfully');
      return true;
    } else {
      console.log('ℹ️  Redemptions already exist, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error seeding redemptions:', error.message);
    throw error;
  }
};
