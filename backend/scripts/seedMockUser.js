import dns from 'dns';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/modules/user/models/User.js';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore
}

async function seedMockUser() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const phone = '9876543210';
  const existing = await User.findOne({ phone });

  if (existing) {
    console.log('User 9876543210 already exists in database:');
    console.log('ID:', existing._id);
    console.log('Name:', existing.name);
    console.log('Phone:', existing.phone);
    console.log('Role:', existing.role);
    console.log('Status:', existing.status);
  } else {
    const user = await User.create({
      name: 'Mock User',
      phone: phone,
      email: 'mockuser@offerly.in',
      role: 'customer',
      status: 'active',
      age: 25,
      gender: 'other',
      city: 'Mumbai',
      address: '123 Demo Street',
      credits: 100,
      referralCode: 'MOCK9876',
      isProfileComplete: true,
    });
    console.log('✅ Mock user created successfully:');
    console.log('ID:', user._id);
    console.log('Name:', user.name);
    console.log('Phone:', user.phone);
  }

  process.exit(0);
}

seedMockUser().catch((err) => {
  console.error('Error seeding mock user:', err);
  process.exit(1);
});
