import cron from 'node-cron';
import Redemption from '../modules/booking/models/Redemption.js';
import Merchant from '../modules/merchant/models/Merchant.js';
import { hasBusinessHours, isWithinBusinessHours } from '../utils/businessHours.js';
import { invalidateFeedCache } from '../utils/feedCache.js';
import { releaseUnrefundedReferralPoints } from '../modules/user/services/referralService.js';

/**
 * Keeps each merchant's open/closed toggle in step with their business hours.
 * Only acts on a transition (opening or closing time reached since the last
 * tick), so a merchant can still override the toggle by hand in between.
 */
export const syncStoreOpenWithHours = async (now = new Date()) => {
  const merchants = await Merchant.find({ status: 'approved' })
    .select('businessHours isOpen scheduleOpen city')
    .lean();

  const ops = [];
  const cities = new Set();
  for (const m of merchants) {
    if (!hasBusinessHours(m.businessHours)) continue;
    const scheduleOpen = isWithinBusinessHours(m.businessHours, now);
    if (m.scheduleOpen === scheduleOpen) continue;

    ops.push({
      updateOne: {
        filter: { _id: m._id },
        update: { $set: { scheduleOpen, isOpen: scheduleOpen } },
      },
    });
    if (m.isOpen !== scheduleOpen) cities.add(m.city || '');
  }

  if (ops.length) {
    await Merchant.bulkWrite(ops);
    cities.forEach((city) => invalidateFeedCache({ city }));
  }
  return ops.length;
};

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

      const refunded = await releaseUnrefundedReferralPoints();
      if (refunded > 0) {
        console.log(`[Cron] Returned referral points for ${refunded} expired/cancelled pass(es).`);
      }
    } catch (err) {
      console.error('[Cron Error] Failed to expire redemptions:', err);
    }
  });

  // Every minute, so a store flips within a minute of its opening/closing time.
  cron.schedule('* * * * *', async () => {
    try {
      const changed = await syncStoreOpenWithHours();
      if (changed > 0) console.log(`[Cron] Synced open/closed status for ${changed} store(s) with business hours.`);
    } catch (err) {
      console.error('[Cron Error] Failed to sync store hours:', err);
    }
  });

  console.log('Cron jobs initialized: auto-expire redemptions (5 min), store hours sync (1 min).');
};
