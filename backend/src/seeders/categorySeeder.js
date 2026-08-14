import Category from '../modules/admin/models/Category.js';

const initialCategories = [
  {
    name: 'Food',
    type: 'product',
    icon: 'restaurant',
    color: '#FF6B35',
    description: 'Restaurants, food courts, and dining establishments',
    order: 1,
    status: 'active',
  },
  {
    name: 'Saloon',
    type: 'service',
    icon: 'content_cut',
    color: '#9B59B6',
    description: 'Hair salons, beauty parlors, and grooming services',
    order: 2,
    status: 'active',
  },
  {
    name: 'Shops',
    type: 'product',
    icon: 'storefront',
    color: '#3498DB',
    description: 'Retail stores, supermarkets, and shopping outlets',
    order: 3,
    status: 'active',
  },
  {
    name: 'Gym',
    type: 'service',
    icon: 'fitness_center',
    color: '#E74C3C',
    description: 'Fitness centers, gyms, and workout facilities',
    order: 4,
    status: 'active',
  },
  {
    name: 'Services',
    type: 'service',
    icon: 'build',
    color: '#F39C12',
    description: 'General services, repairs, and maintenance',
    order: 5,
    status: 'active',
  },
  {
    name: 'Cafe',
    type: 'product',
    icon: 'local_cafe',
    color: '#795548',
    description: 'Coffee shops, cafes, and bakeries',
    order: 6,
    status: 'active',
  },
  {
    name: 'Health',
    type: 'service',
    icon: 'health_and_safety',
    color: '#2ECC71',
    description: 'Healthcare, clinics, and wellness centers',
    order: 7,
    status: 'active',
  },
  {
    name: 'Fashion',
    type: 'product',
    icon: 'checkroom',
    color: '#E91E63',
    description: 'Clothing stores, boutiques, and fashion outlets',
    order: 8,
    status: 'active',
  },
];

export const seedCategories = async () => {
  try {
    const count = await Category.countDocuments();
    
    if (count === 0) {
      await Category.insertMany(initialCategories);
      console.log('✅ Initial categories seeded successfully');
    } else {
      console.log('ℹ️  Categories already exist, skipping seed');
    }
  } catch (error) {
    console.error('❌ Error seeding categories:', error.message);
  }
};
