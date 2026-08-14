import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Merchant from '../src/modules/merchant/models/Merchant.js';
import Plan from '../src/modules/admin/models/Plan.js';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore
}

async function seedMockMerchant() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const phone = '9999999999';
  const plan = await Plan.findOne({ name: /Business Pro|Pro/i }) || await Plan.findOne({});

  const merchantData = {
    ownerName: 'Mock Merchant',
    storeName: 'Offerly Cafe & Bistro',
    category: 'Food',
    description: 'Premier culinary destination with curated chef specials and artisanal coffee.',
    phone,
    email: 'merchant@offerly.in',
    businessEmail: 'contact@offerlybistro.com',
    businessPhone: phone,
    role: 'merchant',
    status: 'approved',
    verified: true,
    onboardingStep: 4,
    city: 'Mumbai',
    locality: 'Bandra West',
    address: 'Plot 42, Hill Road, Bandra West',
    state: 'Maharashtra',
    pincode: '400050',
    coordinates: {
      lat: 19.0596,
      lng: 72.8295,
    },
    subscriptionPlanId: plan?._id || null,
    hasRequestedStore: true,
    avgRating: 4.8,
    totalReviews: 24,
    totalRedemptions: 110,
    logo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&auto=format&fit=crop&q=60',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=60',
    photos: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&auto=format&fit=crop&q=60',
    ],
    businessHours: {
      monday: { open: '09:00', close: '22:00', isClosed: false },
      tuesday: { open: '09:00', close: '22:00', isClosed: false },
      wednesday: { open: '09:00', close: '22:00', isClosed: false },
      thursday: { open: '09:00', close: '22:00', isClosed: false },
      friday: { open: '09:00', close: '23:00', isClosed: false },
      saturday: { open: '09:00', close: '23:00', isClosed: false },
      sunday: { open: '10:00', close: '22:00', isClosed: false },
    },
    bankDetails: {
      accountHolderName: 'Offerly Cafe Private Limited',
      accountNumber: '99990001234567',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      upiId: 'offerlybistro@hdfcbank',
    },
    gstNumber: '27AABCO1234M1Z5',
  };

  const existing = await Merchant.findOne({ phone });

  if (existing) {
    Object.assign(existing, merchantData);
    await existing.save();
    console.log('✅ Mock merchant updated successfully:');
    console.log('ID:', existing._id);
    console.log('Store:', existing.storeName);
    console.log('Phone:', existing.phone);
    console.log('Status:', existing.status);
  } else {
    const merchant = await Merchant.create(merchantData);
    console.log('✅ Mock merchant created successfully:');
    console.log('ID:', merchant._id);
    console.log('Store:', merchant.storeName);
    console.log('Phone:', merchant.phone);
    console.log('Status:', merchant.status);
  }

  process.exit(0);
}

seedMockMerchant().catch((err) => {
  console.error('Error seeding mock merchant:', err);
  process.exit(1);
});
