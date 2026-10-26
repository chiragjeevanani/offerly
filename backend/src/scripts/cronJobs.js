import cron from 'node-cron';
import Redemption from '../modules/booking/models/Redemption.js';
import Merchant from '../modules/merchant/models/Merchant.js';
import { hasBusinessHours, isWithinBusinessHours } from '../utils/businessHours.js';
import { invalidateFeedCache } from '../utils/feedCache.js';
import { releaseUnrefundedReferralPoints } from '../modules/user/services/referralService.js';
import { releaseUnreleasedStockHolds } from '../modules/merchant/services/stockService.js';
import { expireRewardCredits, expireUnscratchedCards } from '../modules/rewards/services/rewardCreditService.js';
import { sweepAutoAssign } from '../modules/delivery/services/autoAssignService.js';
import { sweepLapsedDeliveryOrders, sweepUnansweredOrderAlerts } from '../modules/delivery/services/deliveryService.js';
import { refreshAllBlueTicks } from '../modules/merchant/services/blueTickService.js';
import { backfillStoreSlugs } from '../utils/storeSlug.js';

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
  // Short store links for stores saved before slugs existed (also re-run hourly
  // below, for stores named through an update that skips the save hook).
  backfillStoreSlugs(Merchant)
    .then((n) => n > 0 && console.log(`[Boot] Gave ${n} store(s) a short link.`))
    .catch((err) => console.error('[Boot] Store link backfill failed:', err));

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      // Find and update all pending redemptions where qrExpiry has passed
      // A delivery order already with the partner is never expired from under them.
      const result = await Redemption.updateMany(
        { status: 'pending', qrExpiry: { $lt: now }, 'delivery.status': { $ne: 'picked_up' } },
        { $set: { status: 'expired' } }
      );

      if (result.modifiedCount > 0) {
        console.log(`[Cron] Marked ${result.modifiedCount} pending redemptions as expired.`);
      }

      const restocked = await releaseUnreleasedStockHolds();
      if (restocked > 0) {
        console.log(`[Cron] Returned held stock for ${restocked} expired/cancelled pass(es).`);
      }

      const refunded = await releaseUnrefundedReferralPoints();
      if (refunded > 0) {
        console.log(`[Cron] Returned referral points for ${refunded} expired/cancelled pass(es).`);
      }

      const deliveryRefunds = await sweepLapsedDeliveryOrders();
      if (deliveryRefunds > 0) console.log(`[Cron] Refunded ${deliveryRefunds} online payment(s) on lapsed delivery orders.`);

      // Milestone rewards: unscratched cards and unspent credits past their expiry
      const expiredCards = await expireUnscratchedCards(now);
      if (expiredCards > 0) console.log(`[Cron] Expired ${expiredCards} unscratched reward card(s).`);
      const expiredGrants = await expireRewardCredits(now);
      if (expiredGrants > 0) console.log(`[Cron] Took back unspent credits from ${expiredGrants} expired reward(s).`);
    } catch (err) {
      console.error('[Cron Error] Failed to expire redemptions:', err);
    }
  });

  // Every minute, so a store flips within a minute of its opening/closing time.
  cron.schedule('* * * * *', async () => {
    try {
      const changed = await syncStoreOpenWithHours();
      await sweepUnansweredOrderAlerts().catch((err) => console.error('[Cron Error] Order alert sweep failed:', err.message));
      const autoAssigned = await sweepAutoAssign().catch((err) => { console.error('[Cron Error] Auto-assign failed:', err.message); return 0; });
      if (autoAssigned > 0) console.log(`[Cron] Auto-assigned ${autoAssigned} delivery order(s).`);
      if (changed > 0) console.log(`[Cron] Synced open/closed status for ${changed} store(s) with business hours.`);
    } catch (err) {
      console.error('[Cron Error] Failed to sync store hours:', err);
    }
  });

  // Hourly, at :07 so it doesn't land on the 5-minute sweep. Blue tick rules
  // look at the last 7 / 30 days, so an hour's lag is fine.
  cron.schedule('7 * * * *', async () => {
    try {
      await backfillStoreSlugs(Merchant);
      const { checked, verified, changed } = await refreshAllBlueTicks();
      if (changed > 0) console.log(`[Cron] Blue tick: ${verified}/${checked} store(s) verified, ${changed} changed.`);
    } catch (err) {
      console.error('[Cron Error] Failed to refresh blue ticks:', err);
    }
  });

  console.log('Cron jobs initialized: auto-expire redemptions (5 min), store hours sync (1 min), blue ticks (hourly).');
};
