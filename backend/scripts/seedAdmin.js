import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../src/modules/admin/models/Admin.js';

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const email = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@offerly.com').toLowerCase();
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log('Admin user already exists:', existing._id);
    process.exit(0);
  }

  const admin = await Admin.create({
    name: 'Admin User',
    email,
    password, // Pre-save hook in Admin model will handle hashing
    role: 'admin',
    status: 'active',
  });

  console.log('✅ Admin user created successfully in Admin collection!');
  console.log('   Email:', email);
  console.log('   Password:', password);
  console.log('   ID:', admin._id);

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
