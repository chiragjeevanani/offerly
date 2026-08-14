import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const admins = await Admin.find({});
    console.log(`Found ${admins.length} admins.`);
    
    for (const admin of admins) {
      console.log(`\nEmail: ${admin.email}`);
      const isMatch = await bcrypt.compare('Admin@123', admin.password);
      console.log(`Matches 'Admin@123'? ${isMatch}`);
      if (!isMatch) {
         // Maybe it matches something else?
         const isMatch2 = await bcrypt.compare('admin123', admin.password);
         console.log(`Matches 'admin123'? ${isMatch2}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkAdmin();
