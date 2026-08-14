import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dropIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB');

    const collections = await mongoose.connection.db.listCollections().toArray();
    const merchantCollection = collections.find(c => c.name === 'merchants');

    if (merchantCollection) {
      console.log('🧹 Dropping indexes for merchants collection...');
      await mongoose.connection.db.collection('merchants').dropIndexes();
      console.log('✅ Merchant indexes dropped');
    } else {
      console.log('ℹ️ Merchants collection not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error dropping indexes:', error);
    process.exit(1);
  }
};

dropIndexes();
