import Plan from '../modules/admin/models/Plan.js';

const plans = [
  {
    name: 'Free Starter',
    price: 0,
    duration: 'Lifetime',
    maxOffers: 5,
    maxProducts: 5,
    features: [
      'Basic Analytics',
      'Standard Support',
      '5 Product Listings',
      '5 Offer Listings',
      'Unlimited Duration'
    ],
    status: 'active',
  },
  {
    name: 'Business Pro',
    price: 999,
    duration: 'Monthly',
    maxOffers: 50,
    maxProducts: 50,
    features: [
      'Advanced Analytics',
      'Priority Support',
      '50 Product Listings',
      '50 Offer Listings',
      'Featured on Search',
      'Email Notifications'
    ],
    status: 'active',
  },
  {
    name: 'Enterprise Plus',
    price: 9999,
    duration: 'Yearly',
    maxOffers: 999,
    maxProducts: 999,
    features: [
      'Unlimited Listings',
      'Dedicated Account Manager',
      'Custom Banner Promotions',
      'Push Notifications to Customers',
      'Advanced Analytics Dashboard',
      'API Access'
    ],
    status: 'active',
  },
];

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
