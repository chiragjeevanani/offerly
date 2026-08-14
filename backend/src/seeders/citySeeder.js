import mongoose from 'mongoose';
import dotenv from 'dotenv';
import City from '../modules/admin/models/City.js';

dotenv.config();

const cities = [
  {
    name: 'Guwahati',
    status: 'active',
    zones: [
      { name: 'Beltola', merchantCount: 12 },
      { name: 'GS Road', merchantCount: 18 },
      { name: 'Six Mile', merchantCount: 8 },
      { name: 'Maligaon', merchantCount: 5 },
      { name: 'Zoo Road', merchantCount: 15 }
    ]
  },
  {
    name: 'Delhi',
    status: 'active',
    zones: [
      { name: 'Connaught Place', merchantCount: 45 },
      { name: 'South Delhi', merchantCount: 62 },
      { name: 'Rohini', merchantCount: 22 },
      { name: 'Dwarka', merchantCount: 19 },
      { name: 'Karol Bagh', merchantCount: 30 }
    ]
  },
  {
    name: 'Mumbai',
    status: 'active',
    zones: [
      { name: 'Andheri', merchantCount: 55 },
      { name: 'Bandra', merchantCount: 48 },
      { name: 'Juhu', merchantCount: 32 },
      { name: 'Colaba', merchantCount: 25 },
      { name: 'Worli', merchantCount: 20 }
    ]
  },
  {
    name: 'Bangalore',
    status: 'active',
    zones: [
      { name: 'Indiranagar', merchantCount: 40 },
      { name: 'Koramangala', merchantCount: 50 },
      { name: 'HSR Layout', merchantCount: 35 },
      { name: 'Whitefield', merchantCount: 28 }
    ]
  },
  {
    name: 'Indore',
    status: 'active',
    zones: [
      { name: 'Vijay Nagar', merchantCount: 30 },
      { name: 'Rajwada', merchantCount: 25 },
      { name: 'Palasia', merchantCount: 20 },
      { name: 'Bhawarkua', merchantCount: 15 }
    ]
  }
];

const seedCities = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');

    // Clear existing cities (optional, but good for a clean seed)
    await City.deleteMany({});
    console.log('Existing cities cleared.');

    await City.insertMany(cities);
    console.log('Cities seeded successfully!');

    process.exit();
  } catch (err) {
    console.error('Error seeding cities:', err);
    process.exit(1);
  }
};

seedCities();
