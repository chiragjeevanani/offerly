import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Plan from '../modules/admin/models/Plan.js';

dotenv.config();

export const clientPlans = [
  {
    badge: 'PLAN 1',
    name: 'Existance',
    tagline: 'Get started. Be on Offerly.',
    description: 'Put your business on the map and start reaching new customers.',
    price: 1000,
    duration: 'Monthly',
    maxProducts: 50,
    maxOffers: 15,
    trialDays: 0,
    insightsEnabled: false,
    isPopular: false,
    popularBadgeText: 'Most Popular',
    cardTheme: 'standard',
    characterImage: '/assets/plans/plan1-pointing.jpg',
    floatingTagline: '',
    buttonText: 'Choose Existance Plan ->',
    structuredFeatures: [
      {
        title: '15 Offers Per Month',
        description: 'Show exciting offers to attract customers',
        icon: 'tag'
      },
      {
        title: 'Card View Listing',
        description: 'Your store will be visible in card view',
        icon: 'grid'
      },
      {
        title: 'Basic Store Profile',
        description: 'Show your store details, photos and info',
        icon: 'eye'
      },
      {
        title: 'No Ads',
        description: 'A clean and simple listing experience',
        icon: 'no_ads'
      }
    ],
    features: [
      '15 Offers Per Month',
      'Card View Listing',
      'Basic Store Profile',
      'No Ads'
    ],
    applicableCities: [],
    zonePricing: [],
    planType: 'merchant',
    status: 'active',
    sortOrder: 1
  },
  {
    badge: 'PLAN 2',
    name: 'Visible',
    tagline: 'Get Seen. Get Discovered.',
    description: 'More visibility for businesses ready to grow.',
    price: 1500,
    duration: 'Monthly',
    maxProducts: 100,
    maxOffers: 40,
    trialDays: 0,
    insightsEnabled: true,
    isPopular: false,
    popularBadgeText: 'Most Popular',
    cardTheme: 'standard',
    characterImage: '/assets/plans/plan2-thumbsup.jpg',
    floatingTagline: '',
    buttonText: 'Choose Visible Plan ->',
    structuredFeatures: [
      {
        title: '40 Offers Per Month',
        description: 'Show more deals and attract more customers',
        icon: 'tag'
      },
      {
        title: 'Featured Store Listing',
        description: 'Get highlighted in discovery',
        icon: 'star'
      },
      {
        title: 'Map Visibility',
        description: 'Help nearby customers find you',
        icon: 'map_pin'
      },
      {
        title: 'In-App Promotional Placement',
        description: 'More promotional exposure',
        icon: 'megaphone'
      },
      {
        title: 'Basic Insights',
        description: 'Understand views and offer activity',
        icon: 'chart'
      },
      {
        title: 'Priority Support',
        description: 'Faster assistance',
        icon: 'support'
      }
    ],
    features: [
      '40 Offers Per Month',
      'Featured Store Listing',
      'Map Visibility',
      'In-App Promotional Placement',
      'Basic Insights',
      'Priority Support'
    ],
    applicableCities: [],
    zonePricing: [],
    planType: 'merchant',
    status: 'active',
    sortOrder: 2
  },
  {
    badge: 'PLAN 3',
    name: 'Dominate',
    tagline: 'Be the Local Leader.',
    description: 'Maximum visibility, Maximum growth. Take your business to the next level.',
    price: 3000,
    duration: 'Monthly',
    maxProducts: 999,
    maxOffers: 999,
    trialDays: 0,
    insightsEnabled: true,
    isPopular: true,
    popularBadgeText: 'Most Popular',
    cardTheme: 'highlighted',
    characterImage: '/assets/plans/plan3-cheering.jpg',
    floatingTagline: 'More Reach More Sales!',
    buttonText: 'Choose Dominate Plan ->',
    structuredFeatures: [
      {
        title: 'Unlimited Offers',
        description: 'Run as many offers as you want',
        icon: 'tag'
      },
      {
        title: 'Premium Featured Listing',
        description: 'Top placement in search & category',
        icon: 'crown'
      },
      {
        title: 'Priority Map Placement',
        description: 'Show at the top for nearby customers',
        icon: 'map_pin'
      },
      {
        title: 'In-App Banner Promotions',
        description: 'Get featured in Offerly promotions',
        icon: 'megaphone'
      },
      {
        title: 'Advanced Insights',
        description: 'Detailed analytics & customer insights',
        icon: 'chart'
      },
      {
        title: 'Dedicated Account Manager',
        description: 'Personal support for better results',
        icon: 'manager'
      }
    ],
    features: [
      'Unlimited Offers',
      'Premium Featured Listing',
      'Priority Map Placement',
      'In-App Banner Promotions',
      'Advanced Insights',
      'Dedicated Account Manager'
    ],
    applicableCities: [],
    zonePricing: [],
    planType: 'merchant',
    status: 'active',
    sortOrder: 3
  }
];

export const syncPlans = async () => {
  try {
    await connectDB();
    console.log('🔄 Syncing client plans into database...');

    // Deactivate old test/legacy merchant plans so only the clean 3 tiers are active
    await Plan.updateMany(
      { 
        name: { $nin: ['Existance', 'Visible', 'Dominate'] },
        $or: [{ planType: 'merchant' }, { planType: { $exists: false } }, { planType: null }]
      },
      { status: 'inactive' }
    );

    for (const planData of clientPlans) {
      const existing = await Plan.findOne({ name: planData.name, planType: 'merchant' });
      if (existing) {
        await Plan.findByIdAndUpdate(existing._id, planData, { new: true });
        console.log(`✅ Updated existing plan: ${planData.name}`);
      } else {
        await Plan.create(planData);
        console.log(`✅ Created new plan: ${planData.name}`);
      }
    }

    console.log('🎉 Client plans synchronized successfully!');
  } catch (error) {
    console.error('❌ Error syncing plans:', error);
    process.exit(1);
  }
};

// If run directly from CLI
if (process.argv[1]?.endsWith('syncClientPlans.js')) {
  syncPlans().then(() => {
    mongoose.disconnect();
    process.exit(0);
  });
}
