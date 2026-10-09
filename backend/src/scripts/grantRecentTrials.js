import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Merchant from '../modules/merchant/models/Merchant.js';
import { grantWelcomeTrial } from '../modules/merchant/services/merchantTrialService.js';

dotenv.config();

// One-off backfill: give the free welcome trial to approved merchants who
// registered in the last N days (default 7) and never had a trial or plan.
// Pending merchants are skipped - their trial starts when an admin approves them.
//   node src/scripts/grantRecentTrials.js            -> dry run (lists who would get it)
//   node src/scripts/grantRecentTrials.js --apply    -> actually grants it
//   node src/scripts/grantRecentTrials.js --days=14  -> change the window
const apply = process.argv.includes('--apply');
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const days = daysArg ? Number(daysArg.split('=')[1]) : 7;

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const merchants = await Merchant.find({
    createdAt: { $gte: since },
    hasRequestedStore: true,
    status: 'approved',
    hasUsedFreeTrial: { $ne: true },
  });

  console.log(`${merchants.length} merchant(s) approved, registered since ${since.toISOString()}, without a trial.`);

  let granted = 0;
  for (const m of merchants) {
    if (!apply) {
      console.log(`  would grant: ${m._id} ${m.storeName || '(no name)'} [${m.status}]`);
      continue;
    }
    const sub = await grantWelcomeTrial(m); // skips anyone who already had a plan
    if (sub) granted++;
    console.log(`  ${sub ? 'granted' : 'skipped (already had a plan)'}: ${m._id} ${m.storeName || '(no name)'}`);
  }

  console.log(apply ? `Done. Granted ${granted}.` : 'Dry run only. Re-run with --apply to grant.');
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
