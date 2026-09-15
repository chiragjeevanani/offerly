import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../modules/merchant/models/Product.js';
import ProductCategory from '../modules/merchant/models/ProductCategory.js';
import ServicePlan from '../modules/merchant/models/ServicePlan.js';
import { seedImage } from './seedAssets.js';

dotenv.config();

// The two dev-OTP-bypass merchant accounts used for manual testing
// (see DEFAULT_MERCHANT_DEV_NUMBERS) - a product-based cafe and a
// service-based salon, so both storeType flows can be exercised end to end.
const CAFE_ID = new mongoose.Types.ObjectId('6a7f075616104c604054ddb2'); // Offerly Cafe & Bistro
const SALON_ID = new mongoose.Types.ObjectId('69e9d2546069f6d0f39eab82'); // Fizzy Hairs

const withDiscount = (price, discountPercent) => ({
  discount: discountPercent,
  offerPrice: Math.round(((price * (100 - discountPercent)) / 100) * 100) / 100,
});

const upsertCategory = async (merchantId, name, discountPercent) => {
  return ProductCategory.findOneAndUpdate(
    { merchantId, name },
    { merchantId, name, discountPercent, isActive: true },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
};

export const seedMockCatalog = async () => {
  const existingCafeProducts = await Product.countDocuments({ merchantId: CAFE_ID });
  if (existingCafeProducts === 0) {
    const beverages = await upsertCategory(CAFE_ID, 'Coffee & Beverages', 20);
    const breakfast = await upsertCategory(CAFE_ID, 'All Day Breakfast', 15);
    const desserts = await upsertCategory(CAFE_ID, 'Desserts', 25);

    await Product.insertMany([
      {
        merchantId: CAFE_ID,
        name: 'Cappuccino',
        description: 'Rich espresso topped with steamed milk foam',
        categoryId: beverages._id,
        price: 180,
        ...withDiscount(180, 20),
        images: [seedImage('catalog-cappuccino-img')],
        isVeg: true,
        isActive: true,
      },
      {
        merchantId: CAFE_ID,
        name: 'Cold Brew Latte',
        description: 'Smooth cold brew coffee with chilled milk',
        categoryId: beverages._id,
        price: 220,
        ...withDiscount(220, 20),
        images: [seedImage('catalog-cold-brew-latte-img')],
        isVeg: true,
        isActive: true,
      },
      {
        merchantId: CAFE_ID,
        name: 'Masala Chai',
        description: 'Traditional spiced Indian tea',
        categoryId: beverages._id,
        price: 90,
        ...withDiscount(90, 20),
        images: [seedImage('catalog-masala-chai-img')],
        isVeg: true,
        isActive: true,
      },
      {
        merchantId: CAFE_ID,
        name: 'Avocado Toast',
        description: 'Sourdough toast topped with smashed avocado and chili flakes',
        categoryId: breakfast._id,
        price: 320,
        ...withDiscount(320, 15),
        images: [seedImage('catalog-avocado-toast-img')],
        isVeg: true,
        isActive: true,
      },
      {
        merchantId: CAFE_ID,
        name: 'Eggs Benedict',
        description: 'Poached eggs and hollandaise sauce on an English muffin',
        categoryId: breakfast._id,
        price: 350,
        ...withDiscount(350, 15),
        images: [seedImage('catalog-eggs-benedict-img')],
        isVeg: false,
        isActive: true,
      },
      {
        merchantId: CAFE_ID,
        name: 'Belgian Waffle',
        description: 'Crisp waffle served with maple syrup and berries',
        categoryId: desserts._id,
        price: 280,
        ...withDiscount(280, 25),
        images: [seedImage('catalog-belgian-waffle-img')],
        isVeg: true,
        isActive: true,
      },
      {
        merchantId: CAFE_ID,
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with a molten centre, served with ice cream',
        categoryId: desserts._id,
        price: 240,
        ...withDiscount(240, 25),
        images: [seedImage('catalog-chocolate-lava-cake-img')],
        isVeg: true,
        isActive: true,
      },
    ]);
    console.log('Seeded products for Offerly Cafe & Bistro');
  } else {
    console.log('Offerly Cafe & Bistro already has products, skipping');
  }

  const existingSalonProducts = await Product.countDocuments({ merchantId: SALON_ID });
  if (existingSalonProducts === 0) {
    const hairServices = await upsertCategory(SALON_ID, 'Hair Services', 30);
    const spa = await upsertCategory(SALON_ID, 'Spa & Grooming', 25);

    await Product.insertMany([
      {
        merchantId: SALON_ID,
        name: 'Premium Haircut & Styling',
        description: 'Professional haircut with wash and styling',
        categoryId: hairServices._id,
        price: 500,
        ...withDiscount(500, 30),
        images: [seedImage('product-premium-haircut-wash-img')],
        isVeg: null,
        categoryType: 'service_based',
        duration: '45 mins',
        isActive: true,
      },
      {
        merchantId: SALON_ID,
        name: 'Hair Spa Treatment',
        description: 'Deep conditioning hair spa for smooth, healthy hair',
        categoryId: hairServices._id,
        price: 800,
        ...withDiscount(800, 30),
        images: [seedImage('catalog-hair-spa-treatment-img')],
        isVeg: null,
        categoryType: 'service_based',
        duration: '60 mins',
        isActive: true,
      },
      {
        merchantId: SALON_ID,
        name: 'Beard Grooming & Shave',
        description: 'Precision beard trim and hot towel shave',
        categoryId: hairServices._id,
        price: 300,
        ...withDiscount(300, 30),
        images: [seedImage('catalog-beard-grooming-shave-img')],
        isVeg: null,
        categoryType: 'service_based',
        duration: '30 mins',
        isActive: true,
      },
      {
        merchantId: SALON_ID,
        name: 'Deep Cleansing Facial',
        description: 'Rejuvenating facial to clear and brighten skin',
        categoryId: spa._id,
        price: 900,
        ...withDiscount(900, 25),
        images: [seedImage('catalog-deep-cleansing-facial-img')],
        isVeg: null,
        categoryType: 'service_based',
        duration: '50 mins',
        isActive: true,
      },
      {
        merchantId: SALON_ID,
        name: 'Head & Shoulder Massage',
        description: 'Relaxing massage to relieve tension',
        categoryId: spa._id,
        price: 450,
        ...withDiscount(450, 25),
        images: [seedImage('product-deep-tissue-massage-img')],
        isVeg: null,
        categoryType: 'service_based',
        duration: '30 mins',
        isActive: true,
      },
    ]);
    console.log('Seeded products for Fizzy Hairs');
  } else {
    console.log('Fizzy Hairs already has products, skipping');
  }

  const existingServicePlans = await ServicePlan.countDocuments({ merchantId: SALON_ID });
  if (existingServicePlans === 0) {
    await ServicePlan.insertMany([
      {
        merchantId: SALON_ID,
        name: 'Premium Haircut & Styling',
        description: 'Professional haircut with wash and styling',
        basePrice: 500,
        duration: '45 mins',
        isActive: true,
      },
      {
        merchantId: SALON_ID,
        name: 'Hair Spa Treatment',
        description: 'Deep conditioning hair spa for smooth, healthy hair',
        basePrice: 800,
        duration: '60 mins',
        isActive: true,
      },
      {
        merchantId: SALON_ID,
        name: 'Deep Cleansing Facial',
        description: 'Rejuvenating facial to clear and brighten skin',
        basePrice: 900,
        duration: '50 mins',
        isActive: true,
      },
    ]);
    console.log('Seeded service plans for Fizzy Hairs');
  } else {
    console.log('Fizzy Hairs already has service plans, skipping');
  }
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected...');
    await seedMockCatalog();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding mock catalog:', error);
    process.exit(1);
  });
