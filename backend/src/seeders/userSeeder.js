import mongoose from 'mongoose';
import User from '../modules/user/models/User.js';
import Admin from '../modules/admin/models/Admin.js';
import Merchant from '../modules/merchant/models/Merchant.js';

const users = [
  {
    _id: new mongoose.Types.ObjectId('65f8a2b5e4b0a1a2b3c4d5e1'),
    name: 'Arjun Sharma',
    phone: '+919876543210',
    email: 'arjun@example.com',
    password: 'offerly123',
    role: 'customer',
    city: 'Golaghat',
    credits: 120,
    lifetimeSavings: 120,
    status: 'active',
    isProfileComplete: true
  },
  {
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Matching Royal Restaurant ownerId
    name: 'Vikram Singh',
    phone: '+919800011111',
    email: 'vikram@royalrestaurant.in',
    password: 'offerly123',
    role: 'customer', // In the model, merchants are often just users with a specific role or linked merchant profile
    city: 'Golaghat',
    status: 'active'
  }
];

const admins = [
  {
    name: 'Super Admin',
    email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@offerly.in',
    password: process.env.ADMIN_DEFAULT_PASSWORD || 'offerly123',
    role: 'admin',
    status: 'active'
  }
];

export const seedUsers = async () => {
  try {
    // Seed Admins
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      // Use loop to trigger pre-save hooks for hashing
      for (const adminData of admins) {
        await Admin.create(adminData);
      }
      console.log('✅ Admins seeded successfully');
    } else {
      console.log('ℹ️  Admins already exist, skipping seed');
    }

    // Seed Users (Customers/Merchant Owners)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      for (const userData of users) {
        await User.create(userData);
      }
      console.log('✅ Users seeded successfully');
      
      // Special logic: Link the mock merchant to its user
      const merchant = await Merchant.findOne({ phone: '+919800011111' });
      if (merchant) {
        merchant.ownerId = users[1]._id;
        await merchant.save();
        console.log('🔗 Linked Vikram to Royal Restaurant');
      }
      
      return true;
    } else {
      console.log('ℹ️  Users already exist, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    throw error;
  }
};
