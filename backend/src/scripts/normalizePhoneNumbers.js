import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../modules/user/models/User.js';
import Merchant from '../modules/merchant/models/Merchant.js';
import { normalizePhone } from '../utils/phone.js';

dotenv.config();

const normalizeAllPhoneNumbers = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    // Normalize User phone numbers
    console.log('\n📱 Normalizing User phone numbers...');
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    let userUpdated = 0;
    for (const user of users) {
      const originalPhone = user.phone;
      const normalizedPhone = normalizePhone(originalPhone);
      
      if (originalPhone !== normalizedPhone) {
        console.log(`  User ${user._id}: "${originalPhone}" → "${normalizedPhone}"`);
        user.phone = normalizedPhone;
        await user.save();
        userUpdated++;
      }
    }
    console.log(`✅ Updated ${userUpdated} user phone numbers`);

    // Normalize Merchant phone numbers
    console.log('\n📱 Normalizing Merchant phone numbers...');
    const merchants = await Merchant.find({});
    console.log(`Found ${merchants.length} merchants`);

    let merchantUpdated = 0;
    for (const merchant of merchants) {
      const originalPhone = merchant.phone;
      const normalizedPhone = normalizePhone(originalPhone);
      
      if (originalPhone !== normalizedPhone) {
        console.log(`  Merchant ${merchant._id}: "${originalPhone}" → "${normalizedPhone}"`);
        merchant.phone = normalizedPhone;
        await merchant.save();
        merchantUpdated++;
      }
    }
    console.log(`✅ Updated ${merchantUpdated} merchant phone numbers`);

    console.log('\n✅ Phone number normalization complete!');
    console.log(`Total updated: ${userUpdated + merchantUpdated}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error normalizing phone numbers:', error);
    process.exit(1);
  }
};

normalizeAllPhoneNumbers();
