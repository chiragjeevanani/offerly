import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Merchant from '../modules/merchant/models/Merchant.js';
import Product from '../modules/merchant/models/Product.js';
import { getOrCreateUncategorized } from '../modules/merchant/controllers/productCategoryController.js';

dotenv.config();

const backfillProductCategories = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    const merchants = await Merchant.find({}).select('_id');
    console.log(`Found ${merchants.length} merchants`);

    let updatedTotal = 0;
    for (const merchant of merchants) {
      const uncategorized = await getOrCreateUncategorized(merchant._id);
      const result = await Product.updateMany(
        { merchantId: merchant._id, categoryId: { $exists: false } },
        { $set: { categoryId: uncategorized._id } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  Merchant ${merchant._id}: bucketed ${result.modifiedCount} product(s) into "Uncategorized"`);
        updatedTotal += result.modifiedCount;
      }
    }

    console.log(`\n✅ Backfill complete! Total products updated: ${updatedTotal}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error backfilling product categories:', error);
    process.exit(1);
  }
};

backfillProductCategories();
