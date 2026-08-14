import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedCategories } from './categorySeeder.js';
import { seedPlans } from './planSeeder.js';
import { seedMerchants } from './merchantSeeder.js';
import { seedProducts } from './productSeeder.js';
import { seedOffers } from './offerSeeder.js';
import { seedAdRequests } from './adRequestSeeder.js';
import { seedUsers } from './userSeeder.js';
import { seedRedemptions } from './redemptionSeeder.js';
import { seedReviews } from './reviewSeeder.js';
import City from '../modules/admin/models/City.js';
import Category from '../modules/admin/models/Category.js';
import Plan from '../modules/admin/models/Plan.js';
import Merchant from '../modules/merchant/models/Merchant.js';
import Product from '../modules/merchant/models/Product.js';
import Offer from '../modules/merchant/models/Offer.js';
import AdRequest from '../modules/admin/models/AdRequest.js';
import User from '../modules/user/models/User.js';
import Admin from '../modules/admin/models/Admin.js';
import Redemption from '../modules/booking/models/Redemption.js';
import Review from '../modules/merchant/models/Review.js';

dotenv.config();

// Cities data (inline since citySeeder.js has process.exit)
const cities = [
  {
    name: 'Golaghat',
    status: 'active',
    coordinates: { lat: 26.5012, lng: 93.9681 },
    zones: [
      { name: 'Golaghat Town', merchantCount: 3 },
      { name: 'Mission Road', merchantCount: 2 },
      { name: 'Market Area', merchantCount: 2 },
    ]
  },
  {
    name: 'Jorhat',
    status: 'active',
    coordinates: { lat: 26.7509, lng: 94.2037 },
    zones: [
      { name: 'Baruah Road', merchantCount: 1 },
      { name: 'N-Ali', merchantCount: 0 },
    ]
  },
  {
    name: 'Guwahati',
    status: 'active',
    coordinates: { lat: 26.1445, lng: 91.7362 },
    zones: [
      { name: 'Beltola', merchantCount: 0 },
      { name: 'GS Road', merchantCount: 0 },
      { name: 'Six Mile', merchantCount: 0 },
      { name: 'Maligaon', merchantCount: 0 },
      { name: 'Zoo Road', merchantCount: 0 }
    ]
  },
  {
    name: 'Delhi',
    status: 'active',
    coordinates: { lat: 28.7041, lng: 77.1025 },
    zones: [
      { name: 'Connaught Place', merchantCount: 0 },
      { name: 'South Delhi', merchantCount: 0 },
      { name: 'Rohini', merchantCount: 0 },
      { name: 'Dwarka', merchantCount: 0 },
      { name: 'Karol Bagh', merchantCount: 0 }
    ]
  },
  {
    name: 'Mumbai',
    status: 'active',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    zones: [
      { name: 'Andheri', merchantCount: 0 },
      { name: 'Bandra', merchantCount: 0 },
      { name: 'Juhu', merchantCount: 0 },
      { name: 'Colaba', merchantCount: 0 },
      { name: 'Worli', merchantCount: 0 }
    ]
  },
  {
    name: 'Bangalore',
    status: 'active',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    zones: [
      { name: 'Indiranagar', merchantCount: 0 },
      { name: 'Koramangala', merchantCount: 0 },
      { name: 'HSR Layout', merchantCount: 0 },
      { name: 'Whitefield', merchantCount: 0 }
    ]
  }
];

const seedCities = async () => {
  try {
    const count = await City.countDocuments();
    
    if (count === 0) {
      await City.insertMany(cities);
      console.log('✅ Cities seeded successfully');
      return true;
    } else {
      console.log('ℹ️  Cities already exist, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error seeding cities:', error.message);
    throw error;
  }
};

const clearAllData = async () => {
  console.log('🗑️  Clearing existing data...');
  await City.deleteMany({});
  await Category.deleteMany({});
  await Plan.deleteMany({});
  await AdRequest.deleteMany({});
  await Offer.deleteMany({});
  await Product.deleteMany({});
  await Merchant.deleteMany({});
  
  // Drop indexes specifically for merchants to avoid geo index conflicts
  try {
    await Merchant.collection.dropIndexes();
    console.log('🧹 Merchant indexes dropped');
  } catch (e) {
    console.log('ℹ️ No indexes to drop or collection missing');
  }
  
  await User.deleteMany({});
  await Admin.deleteMany({});
  await Redemption.deleteMany({});
  await Review.deleteMany({});
  console.log('✅ All data cleared');
};

const masterSeeder = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 MongoDB connected...\n');

    // Check for --force flag
    const forceFlag = process.argv.includes('--force');
    
    if (forceFlag) {
      await clearAllData();
      console.log('');
    }

    console.log('🌱 Starting database seeding...\n');

    // Seed in dependency order
    console.log('1️⃣  Seeding Cities...');
    await seedCities();
    console.log('');

    console.log('2️⃣  Seeding Categories...');
    await seedCategories();
    console.log('');

    console.log('3️⃣  Seeding Subscription Plans...');
    await seedPlans();
    console.log('');

    console.log('4️⃣  Seeding Users & Admins...');
    await seedUsers();
    console.log('');

    console.log('5️⃣  Seeding Merchants...');
    await seedMerchants();
    console.log('');

    console.log('6️⃣  Seeding Products...');
    await seedProducts();
    console.log('');

    console.log('7️⃣  Seeding Offers...');
    await seedOffers();
    console.log('');

    console.log('8️⃣  Seeding Ad Requests...');
    await seedAdRequests();
    console.log('');

    console.log('9️⃣  Seeding Redemptions & Reviews...');
    await seedRedemptions();
    await seedReviews();
    console.log('');

    console.log('✨ Database seeding completed successfully!\n');
    
    // Print summary
    const citiesCount = await City.countDocuments();
    const categoriesCount = await Category.countDocuments();
    const plansCount = await Plan.countDocuments();
    const usersCount = await User.countDocuments();
    const adminsCount = await Admin.countDocuments();
    const merchantsCount = await Merchant.countDocuments();
    const productsCount = await Product.countDocuments();
    const offersCount = await Offer.countDocuments();
    const adsCount = await AdRequest.countDocuments();
    const redemptionsCount = await Redemption.countDocuments();
    const reviewsCount = await Review.countDocuments();

    console.log('📊 Database Summary:');
    console.log(`   Cities: ${citiesCount}`);
    console.log(`   Categories: ${categoriesCount}`);
    console.log(`   Plans: ${plansCount}`);
    console.log(`   Users: ${usersCount}`);
    console.log(`   Admins: ${adminsCount}`);
    console.log(`   Merchants: ${merchantsCount}`);
    console.log(`   Products: ${productsCount}`);
    console.log(`   Offers: ${offersCount}`);
    console.log(`   Ad Requests: ${adsCount}`);
    console.log(`   Redemptions: ${redemptionsCount}`);
    console.log(`   Reviews: ${reviewsCount}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

// Run the seeder
masterSeeder();
