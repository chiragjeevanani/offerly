import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Plan from './src/modules/admin/models/Plan.js';
import Merchant from './src/modules/merchant/models/Merchant.js';

dotenv.config();

async function checkPlans() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const plans = await Plan.find({});
  console.log('Total Plans in DB:', plans.length);
  plans.forEach(p => {
    console.log(`- ${p.name}: Price=${p.price}, Cities=[${p.applicableCities.join(', ')}], Status=${p.status}`);
  });

  const merchants = await Merchant.find({}).limit(5);
  console.log('\nRecent Merchants:');
  merchants.forEach(m => {
    console.log(`- ${m.storeName || m.businessName}: City=${m.city}, TrialUsed=${m.hasUsedFreeTrial}`);
  });

  await mongoose.disconnect();
}

checkPlans();
