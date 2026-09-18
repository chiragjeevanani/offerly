import Plan from '../modules/admin/models/Plan.js';
import { clientPlans } from './syncClientPlans.js';

const plans = clientPlans;

export const seedPlans = async () => {
  try {
    const count = await Plan.countDocuments();
    
    if (count === 0) {
      await Plan.insertMany(plans);
      console.log('✅ Subscription plans seeded successfully');
      return true;
    } else {
      console.log('ℹ️  Plans already exist, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error seeding plans:', error.message);
    throw error;
  }
};
