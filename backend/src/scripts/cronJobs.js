import cron from 'node-cron';
import Redemption from '../modules/booking/models/Redemption.js';

export const initCronJobs = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      // Find and update all pending redemptions where qrExpiry has passed
      const result = await Redemption.updateMany(
        { status: 'pending', qrExpiry: { $lt: now } },
        { $set: { status: 'expired' } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`[Cron] Marked ${result.modifiedCount} pending redemptions as expired.`);
      }
    } catch (err) {
      console.error('[Cron Error] Failed to expire redemptions:', err);
    }
  });

  console.log('Cron jobs initialized: auto-expire redemptions running every 5 min.');
};
