import mongoose from 'mongoose';
import Merchant from '../modules/merchant/models/Merchant.js';
import Plan from '../modules/admin/models/Plan.js';
import { seedImage } from './seedAssets.js';

const merchants = [
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    ownerName: 'Vikram Singh',
    storeName: 'Royal Restaurant',
    category: 'Food',
    city: 'Golaghat',
    locality: 'Golaghat Town',
    address: '12, MG Road, Golaghat Town, Assam 785621',
    phone: '+919800011111',
    email: 'vikram@royalrestaurant.in',
    businessEmail: 'contact@royalrestaurant.in',
    businessPhone: '+919800011111',
    description: 'Experience fine dining at its best with Royal Restaurant. We specialize in authentic Indian curries, tandoori delicacies, and absolutely exquisite desserts. Perfect for family dinners and romantic dates.',
    logo: seedImage('merchant-royal-restaurant-logo'),
    coverImage: seedImage('merchant-royal-restaurant-cover'),
    photos: [
      seedImage('merchant-royal-restaurant-photo'),
      seedImage('merchant-royal-restaurant-photo2'),
    ],
    coordinates: { lat: 26.5012, lng: 93.9681 },
    verified: true,
    status: 'approved',
    avgRating: 4.8,
    totalReviews: 320,
    totalRedemptions: 1240,
    hasRequestedStore: true,
    onboardingStep: 4,
    approvedAt: new Date('2026-02-15T10:00:00Z'),
    joinedAt: new Date('2026-02-15T10:00:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
    ownerName: 'Priya Sharma',
    storeName: 'Style Salon & Spa',
    category: 'Saloon',
    city: 'Golaghat',
    locality: 'Mission Road',
    address: '45, Mission Road, Golaghat, Assam 785621',
    phone: '+919800022222',
    email: 'priya@stylesalon.in',
    businessEmail: 'contact@stylesalon.in',
    businessPhone: '+919800022222',
    description: 'A premium luxury salon providing high-end hair styling, rejuvenating spa treatments, and bridal makeovers. Step in to completely transform your look with our expert stylists.',
    logo: seedImage('merchant-style-salon-spa-logo'),
    coverImage: seedImage('merchant-style-salon-spa-cover'),
    photos: [
      seedImage('merchant-style-salon-spa-photo'),
    ],
    coordinates: { lat: 26.5022, lng: 93.9715 },
    verified: true,
    status: 'approved',
    avgRating: 4.7,
    totalReviews: 215,
    totalRedemptions: 890,
    hasRequestedStore: true,
    onboardingStep: 4,
    approvedAt: new Date('2026-03-01T09:00:00Z'),
    joinedAt: new Date('2026-03-01T09:00:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
    ownerName: 'Rajesh Kumar',
    storeName: 'Fitness Hub Premium',
    category: 'Gym',
    city: 'Golaghat',
    locality: 'Market Area',
    address: '8, Station Road, Golaghat, Assam 785621',
    phone: '+919800033333',
    email: 'rajesh@fitnesshub.in',
    businessEmail: 'contact@fitnesshub.in',
    businessPhone: '+919800033333',
    description: 'Transform your body at Fitness Hub Premium. Equipped with top-tier imported weight stations, crossfit zones, and a dedicated team of certified personal trainers ready to push your limits.',
    logo: seedImage('merchant-fitness-hub-premium-logo'),
    coverImage: seedImage('merchant-fitness-hub-premium-cover'),
    photos: [
      seedImage('merchant-fitness-hub-premium-photo'),
    ],
    coordinates: { lat: 26.4995, lng: 93.9650 },
    verified: true,
    status: 'approved',
    avgRating: 4.9,
    totalReviews: 430,
    totalRedemptions: 1560,
    hasRequestedStore: true,
    onboardingStep: 4,
    approvedAt: new Date('2026-02-20T11:00:00Z'),
    joinedAt: new Date('2026-02-20T11:00:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
    ownerName: 'Amit Patel',
    storeName: 'Fresh Mart Essentials',
    category: 'Shops',
    city: 'Golaghat',
    locality: 'Golaghat Town',
    address: '22, Civil Road, Golaghat, Assam 785621',
    phone: '+919800044444',
    email: 'amit@freshmart.in',
    businessEmail: 'contact@freshmart.in',
    businessPhone: '+919800044444',
    description: 'Your one-stop shop for farm-fresh organic vegetables, imported fruits, and daily household essentials. Quality and freshness guaranteed every single day.',
    logo: seedImage('merchant-fresh-mart-essentials-logo'),
    coverImage: seedImage('merchant-fresh-mart-essentials-cover'),
    photos: [],
    coordinates: { lat: 26.5035, lng: 93.9700 },
    verified: true,
    status: 'approved',
    avgRating: 4.4,
    totalReviews: 120,
    totalRedemptions: 340,
    hasRequestedStore: true,
    onboardingStep: 4,
    approvedAt: new Date('2026-03-10T08:30:00Z'),
    joinedAt: new Date('2026-03-10T08:30:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439015'),
    ownerName: 'Sneha Reddy',
    storeName: 'Green Bakes & Cafe',
    category: 'Cafe',
    city: 'Golaghat',
    locality: 'Mission Road',
    address: '3, Mission Road, Golaghat, Assam 785621',
    phone: '+919800055555',
    email: 'sneha@greenbakes.in',
    businessEmail: 'contact@greenbakes.in',
    businessPhone: '+919800055555',
    description: 'Sip the finest artisanal coffees paired perfectly with our freshly baked croissants, cheesecakes, and custom birthday cakes. The most aesthetic spot in town.',
    logo: seedImage('merchant-green-bakes-cafe-logo'),
    coverImage: seedImage('merchant-green-bakes-cafe-cover'),
    photos: [
      seedImage('merchant-green-bakes-cafe-photo'),
    ],
    coordinates: { lat: 26.5018, lng: 93.9690 },
    verified: true,
    status: 'approved',
    avgRating: 4.8,
    totalReviews: 540,
    totalRedemptions: 2100,
    hasRequestedStore: true,
    onboardingStep: 4,
    approvedAt: new Date('2026-02-25T10:15:00Z'),
    joinedAt: new Date('2026-02-25T10:15:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439016'),
    ownerName: 'Suresh Gupta',
    storeName: 'Super Mart Grocery',
    category: 'Shops',
    city: 'Golaghat',
    locality: 'Market Area',
    address: '67, Market Complex, Golaghat, Assam 785621',
    phone: '+919800066666',
    email: 'suresh@supermart.in',
    businessEmail: 'contact@supermart.in',
    businessPhone: '+919800066666',
    description: 'Bulk groceries, household cleaning supplies, and everyday necessities at discounted wholesale rates. Shop more, save more.',
    logo: seedImage('merchant-super-mart-grocery-logo'),
    coverImage: seedImage('merchant-super-mart-grocery-cover'),
    photos: [],
    coordinates: { lat: 26.5009, lng: 93.9665 },
    verified: false,
    status: 'approved',
    avgRating: 4.1,
    totalReviews: 89,
    totalRedemptions: 156,
    hasRequestedStore: true,
    onboardingStep: 4,
    approvedAt: new Date('2026-03-15T14:00:00Z'),
    joinedAt: new Date('2026-03-15T14:00:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439021'),
    ownerName: 'Adarsh Sharma',
    storeName: 'Indore Food Street',
    category: 'Food',
    city: 'Indore',
    locality: 'Vijay Nagar',
    address: 'Plot 45, Vijay Nagar Main Road, Indore, MP 452010',
    phone: '+918888888881',
    email: 'adarsh@foodstreet.in',
    businessEmail: 'contact@foodstreet.in',
    businessPhone: '+918888888881',
    description: 'The ultimate destination for Indore\'s famous street food. From spicy Poha to crispy Jalebis, we bring the heart of Indore to your plate in a premium hygienic setting.',
    logo: seedImage('merchant-royal-restaurant-logo'),
    coverImage: seedImage('merchant-indore-food-street-cover'),
    photos: [
      seedImage('merchant-royal-restaurant-photo'),
    ],
    coordinates: { lat: 22.7533, lng: 75.8937 },
    verified: true,
    status: 'approved',
    avgRating: 4.9,
    totalReviews: 850,
    totalRedemptions: 3400,
    hasRequestedStore: true,
    onboardingStep: 4,
    approvedAt: new Date('2026-01-10T10:00:00Z'),
    joinedAt: new Date('2026-01-10T10:00:00Z'),
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439022'),
    ownerName: 'Rahul Verma',
    storeName: 'Glamour Salon Indore',
    category: 'Saloon',
    city: 'Indore',
    locality: 'Palasia',
    address: 'Near Greater Kailash Hospital, Palasia, Indore, MP 452001',
    phone: '+919999999991',
    email: 'rahul@glamoursalon.in',
    businessEmail: 'contact@glamoursalon.in',
    businessPhone: '+919999999991',
    description: 'Experience luxury grooming at Glamour Salon Indore. Specialized in modern haircuts, organic facials, and premium bridal packages.',
    logo: seedImage('merchant-style-salon-spa-logo'),
    coverImage: seedImage('merchant-glamour-salon-indore-cover'),
    photos: [
      seedImage('merchant-glamour-salon-indore-photo'),
    ],
    coordinates: { lat: 22.7244, lng: 75.8839 },
    verified: true,
    status: 'approved',
    avgRating: 4.7,
    totalReviews: 420,
    totalRedemptions: 1100,
    hasRequestedStore: true,
    onboardingStep: 4,
    approvedAt: new Date('2026-02-01T09:00:00Z'),
    joinedAt: new Date('2026-02-01T09:00:00Z'),
  },
];

export const seedMerchants = async () => {
  try {
    const count = await Merchant.countDocuments();
    
    if (count === 0) {
      // Get plan IDs
      const freePlan = await Plan.findOne({ name: /Trial/i });
      const proPlan = await Plan.findOne({ name: /Pro/i });
      const premiumPlan = await Plan.findOne({ name: /Enterprise/i });

      // Assign plans to merchants
      merchants[0].subscriptionPlanId = premiumPlan?._id; // Royal Restaurant
      merchants[1].subscriptionPlanId = proPlan?._id; // Style Salon
      merchants[2].subscriptionPlanId = premiumPlan?._id; // Fitness Hub
      merchants[3].subscriptionPlanId = freePlan?._id; // Fresh Mart
      merchants[4].subscriptionPlanId = premiumPlan?._id; // Green Bakes
      merchants[5].subscriptionPlanId = freePlan?._id; // Super Mart
      merchants[6].subscriptionPlanId = premiumPlan?._id; // Indore Food Street
      merchants[7].subscriptionPlanId = premiumPlan?._id; // Glamour Salon Indore

      await Merchant.insertMany(merchants);
      console.log('✅ Merchants seeded successfully');
      return true;
    } else {
      console.log('ℹ️  Merchants already exist, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error seeding merchants:', error.message);
    throw error;
  }
};
