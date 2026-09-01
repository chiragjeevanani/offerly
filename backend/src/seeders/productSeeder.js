import mongoose from 'mongoose';
import Product from '../modules/merchant/models/Product.js';
import ProductCategory from '../modules/merchant/models/ProductCategory.js';

const ROYAL_RESTAURANT_ID = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
const STYLE_SALON_ID = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');

// Each category carries its own merchant-set discount %; product offerPrice/discount
// is derived from this at seed time the same way productController does at runtime.
const categoryDefs = [
  { merchantId: ROYAL_RESTAURANT_ID, name: 'Main Course', discountPercent: 20 },
  { merchantId: ROYAL_RESTAURANT_ID, name: 'Starters', discountPercent: 20 },
  { merchantId: STYLE_SALON_ID, name: 'Hair Services', discountPercent: 30 },
  { merchantId: STYLE_SALON_ID, name: 'Spa Treatments', discountPercent: 30 },
];

const withDiscount = (price, discountPercent) => ({
  discount: discountPercent,
  offerPrice: Math.round(((price * (100 - discountPercent)) / 100) * 100) / 100,
});

export const seedProducts = async () => {
  try {
    const count = await Product.countDocuments();

    if (count !== 0) {
      console.log('ℹ️  Products already exist, skipping seed');
      return false;
    }

    const categoriesByKey = {};
    for (const def of categoryDefs) {
      const category = await ProductCategory.create(def);
      categoriesByKey[`${def.merchantId}:${def.name}`] = category;
    }
    const categoryId = (merchantId, name) => categoriesByKey[`${merchantId}:${name}`]._id;

    const products = [
      {
        merchantId: ROYAL_RESTAURANT_ID,
        name: 'Chicken Biryani',
        description: 'Aromatic basmati rice cooked with tender chicken pieces and authentic spices',
        categoryId: categoryId(ROYAL_RESTAURANT_ID, 'Main Course'),
        price: 250,
        ...withDiscount(250, 20),
        images: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80'],
        isVeg: false,
        isActive: true,
      },
      {
        merchantId: ROYAL_RESTAURANT_ID,
        name: 'Paneer Butter Masala',
        description: 'Cottage cheese cubes in rich creamy tomato gravy',
        categoryId: categoryId(ROYAL_RESTAURANT_ID, 'Main Course'),
        price: 200,
        ...withDiscount(200, 20),
        images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80'],
        isVeg: true,
        isActive: true,
      },
      {
        merchantId: ROYAL_RESTAURANT_ID,
        name: 'Crispy Chilli Babycorn',
        description: 'Crispy fried babycorn tossed in spicy chilli sauce',
        categoryId: categoryId(ROYAL_RESTAURANT_ID, 'Starters'),
        price: 150,
        ...withDiscount(150, 20),
        images: ['https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&q=80'],
        isVeg: true,
        isActive: true,
      },
      {
        merchantId: STYLE_SALON_ID,
        name: 'Premium Haircut & Wash',
        description: 'Professional haircut with hair wash and styling',
        categoryId: categoryId(STYLE_SALON_ID, 'Hair Services'),
        price: 500,
        ...withDiscount(500, 30),
        images: ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80'],
        isVeg: null,
        isActive: true,
        categoryType: 'service_based'
      },
      {
        merchantId: STYLE_SALON_ID,
        name: 'Deep Tissue Massage',
        description: 'Relaxing full body massage with aromatic oils',
        categoryId: categoryId(STYLE_SALON_ID, 'Spa Treatments'),
        price: 1200,
        ...withDiscount(1200, 30),
        images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&q=80'],
        isVeg: null,
        isActive: true,
        categoryType: 'service_based'
      },
    ];

    await Product.insertMany(products);
    console.log('✅ Products seeded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error seeding products:', error.message);
    throw error;
  }
};
