import mongoose from 'mongoose';
import Product from '../modules/merchant/models/Product.js';

const products = [
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Royal Restaurant
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice cooked with tender chicken pieces and authentic spices',
    category: 'Main Course',
    price: 250,
    offerPrice: 200,
    images: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'],
    isVeg: false,
    isActive: true,
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Royal Restaurant
    name: 'Paneer Butter Masala',
    description: 'Cottage cheese cubes in rich creamy tomato gravy',
    category: 'Main Course',
    price: 200,
    offerPrice: 160,
    images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80'],
    isVeg: true,
    isActive: true,
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Royal Restaurant
    name: 'Crispy Chilli Babycorn',
    description: 'Crispy fried babycorn tossed in spicy chilli sauce',
    category: 'Starters',
    price: 150,
    offerPrice: 120,
    images: ['https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80'],
    isVeg: true,
    isActive: true,
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'), // Style Salon
    name: 'Premium Haircut & Wash',
    description: 'Professional haircut with hair wash and styling',
    category: 'Hair Services',
    price: 500,
    offerPrice: 350,
    images: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80'],
    isVeg: null,
    isActive: true,
    categoryType: 'service_based'
  },
  {
    merchantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'), // Style Salon
    name: 'Deep Tissue Massage',
    description: 'Relaxing full body massage with aromatic oils',
    category: 'Spa Treatments',
    price: 1200,
    offerPrice: 840,
    images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&q=80'],
    isVeg: null,
    isActive: true,
    categoryType: 'service_based'
  },
];

export const seedProducts = async () => {
  try {
    const count = await Product.countDocuments();
    
    if (count === 0) {
      await Product.insertMany(products);
      console.log('✅ Products seeded successfully');
      return true;
    } else {
      console.log('ℹ️  Products already exist, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error seeding products:', error.message);
    throw error;
  }
};
