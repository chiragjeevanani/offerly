import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Merchant from '../src/modules/merchant/models/Merchant.js';
import Product from '../src/modules/merchant/models/Product.js';
import { isServiceCategory } from '../src/utils/storeTypeHelper.js';

const run = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/offerly';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // 1. Find all merchants and check their category
    const merchants = await Merchant.find({});
    let updatedMerchantsCount = 0;
    for (const m of merchants) {
      if (isServiceCategory(m.category) && m.storeType !== 'service_based') {
        m.storeType = 'service_based';
        await m.save();
        updatedMerchantsCount++;
        console.log(`Updated merchant "${m.storeName}" (${m.category}) -> storeType: service_based`);
      }
    }

    // 2. Find all products belonging to service_based merchants and sanitize isVeg and categoryType
    const serviceMerchants = await Merchant.find({ storeType: 'service_based' }).select('_id');
    const serviceMerchantIds = serviceMerchants.map(m => m._id);

    const productResult = await Product.updateMany(
      { merchantId: { $in: serviceMerchantIds } },
      { $set: { categoryType: 'service_based', isVeg: null } }
    );
    console.log(`Updated ${productResult.modifiedCount} products of service merchants to categoryType: 'service_based' and isVeg: null`);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error in migration:', err);
    process.exit(1);
  }
};

run();
