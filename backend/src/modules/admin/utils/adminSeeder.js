import Admin from '../models/Admin.js';

/**
 * Seeds a default admin account if no admins exist in the collection.
 * Uses credentials from environment variables.
 */
export const seedDefaultAdmin = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    
    if (adminCount === 0) {
      console.log('No admin accounts found. Seeding default admin...');
      
      const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL;
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
      
      if (!defaultEmail || !defaultPassword) {
        console.warn('Seeding skipped: ADMIN_DEFAULT_EMAIL or ADMIN_DEFAULT_PASSWORD not found in .env');
        return;
      }
      
      await Admin.create({
        name: 'Super Admin',
        email: defaultEmail.toLowerCase(),
        password: defaultPassword,
        role: 'admin',
        status: 'active'
      });
      
      console.log(`Default admin created: ${defaultEmail}`);
    }
  } catch (error) {
    console.error('Error seeding default admin:', error);
  }
};
