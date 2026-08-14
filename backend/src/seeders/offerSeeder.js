import mongoose from 'mongoose';
import Offer from '../modules/merchant/models/Offer.js';

const offers = [
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Royal Restaurant
    title: 'Flat 20% OFF on All Orders',
    description: 'Enjoy 20% discount on your entire order at Royal Restaurant. Valid on dine-in and takeaway. Minimum order ₹200.',
    offerType: 'generic',
    discountType: 'percentage',
    discountValue: 20,
    validFrom: new Date('2026-04-01T00:00:00Z'),
    validTo: new Date('2026-04-30T23:59:59Z'),
    maxRedemptions: 500,
    currentRedemptions: 342,
    image: 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?w=1000&q=80',
    status: 'active',
    category: 'Food',
    isTrending: true,
    isNew: false,
    impressions: 2340,
    saves: 128,
    terms: [
      'Valid on dine-in and takeaway',
      'Min order ₹200',
      'Cannot be combined with other offers',
      'One redemption per customer per day'
    ],
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'), // Style Salon
    title: 'Get 30% OFF on All Services',
    description: 'Book any hair or beauty service at Style Salon and get flat 30% off. No minimum spend.',
    offerType: 'generic',
    discountType: 'percentage',
    discountValue: 30,
    validFrom: new Date('2026-04-01T00:00:00Z'),
    validTo: new Date('2026-04-30T23:59:59Z'),
    maxRedemptions: 200,
    currentRedemptions: 89,
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1000&q=80',
    status: 'active',
    category: 'Saloon',
    isTrending: true,
    isNew: false,
    impressions: 1820,
    saves: 89,
    terms: [
      'Valid Mon–Sat 10am–7pm',
      'Prior appointment recommended',
      'Not valid on Sundays and public holidays'
    ],
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'), // Fitness Hub
    title: 'Free Trial Class — First Visit',
    description: 'New members get a completely free trial class at Fitness Hub. Try any batch — morning, afternoon, or evening.',
    offerType: 'generic',
    discountType: 'flat',
    discountValue: 0,
    validFrom: new Date('2026-04-01T00:00:00Z'),
    validTo: new Date('2026-05-31T23:59:59Z'),
    maxRedemptions: 100,
    currentRedemptions: 67,
    image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1000&q=80',
    status: 'active',
    category: 'Gym',
    isTrending: true,
    isNew: false,
    impressions: 3100,
    saves: 245,
    terms: [
      'First-time visitors only',
      'Valid ID required',
      'Batch subject to availability'
    ],
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'), // Fresh Mart
    title: 'Get 5% OFF on Fresh Produce',
    description: 'Save 5% on all fresh fruits and vegetables at Fresh Mart. No minimum spend.',
    offerType: 'generic',
    discountType: 'percentage',
    discountValue: 5,
    validFrom: new Date('2026-04-01T00:00:00Z'),
    validTo: new Date('2026-04-15T23:59:59Z'),
    maxRedemptions: 300,
    currentRedemptions: 132,
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&q=80',
    status: 'active',
    category: 'Shops',
    isTrending: false,
    isNew: true,
    impressions: 980,
    saves: 67,
    terms: [
      'Valid on fresh produce section only',
      'Cannot be clubbed with weekly sale'
    ],
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439015'), // Green Bakes
    title: 'Flat 15% OFF on Bakery Items',
    description: 'Celebrate the season with 15% off on all bakery items at Green Bakes. Includes cakes, bread, and pastries.',
    offerType: 'generic',
    discountType: 'percentage',
    discountValue: 15,
    validFrom: new Date('2026-04-01T00:00:00Z'),
    validTo: new Date('2026-04-20T23:59:59Z'),
    maxRedemptions: 400,
    currentRedemptions: 189,
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000&q=80',
    status: 'active',
    category: 'Cafe',
    isTrending: false,
    isNew: true,
    impressions: 2100,
    saves: 156,
    terms: [
      'Valid on all bakery items',
      'Min purchase ₹150',
      'Cannot be combined with combo deals'
    ],
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'), // Indore Food Street
    title: 'Flat 50% OFF on Chappan Bhog',
    description: 'Celebrate the taste of Indore with flat 50% off on our signature Chappan Bhog platter. Valid only this weekend!',
    offerType: 'generic',
    discountType: 'percentage',
    discountValue: 50,
    validFrom: new Date('2026-04-01T00:00:00Z'),
    validTo: new Date('2026-04-30T23:59:59Z'),
    maxRedemptions: 1000,
    currentRedemptions: 450,
    image: 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?w=1000&q=80',
    status: 'active',
    category: 'Food',
    isTrending: true,
    isNew: true,
    impressions: 4500,
    saves: 890,
    terms: ['One platter per person', 'Valid for dine-in only'],
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439022'), // Glamour Salon
    title: 'Get 40% OFF on Luxury Bridal Makeover',
    description: 'Book your dream bridal makeover at Glamour Salon Indore and get flat 40% off. Limited slots available.',
    offerType: 'generic',
    discountType: 'percentage',
    discountValue: 40,
    validFrom: new Date('2026-04-01T00:00:00Z'),
    validTo: new Date('2026-05-31T23:59:59Z'),
    maxRedemptions: 50,
    currentRedemptions: 12,
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1000&q=80',
    status: 'active',
    category: 'Saloon',
    isTrending: true,
    isNew: true,
    impressions: 1200,
    saves: 230,
    terms: ['Prior booking required', 'Valid till May 31st'],
  },
];

export const seedOffers = async () => {
  try {
    const count = await Offer.countDocuments();
    
    if (count === 0) {
      await Offer.insertMany(offers);
      console.log('✅ Offers seeded successfully');
      return true;
    } else {
      console.log('ℹ️  Offers already exist, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error seeding offers:', error.message);
    throw error;
  }
};
