import User from '../models/User.js';
import ReferralHistory from '../models/ReferralHistory.js';
import Redemption from '../../booking/models/Redemption.js';
import { notifyUser } from './notificationService.js';

// Takes up to `wanted` referral points off the customer's balance for a new
// pass, capped at what they hold. The conditional update keeps two claims at
// once from spending the same points. Returns the number of points taken.
export const reserveReferralPoints = async (userId, wanted) => {
  const user = await User.findById(userId).select('credits').lean();
  const points = Math.max(0, Math.floor(Math.min(user?.credits || 0, wanted)));
  if (points <= 0) return 0;

  const updated = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: points } },
    { $inc: { credits: -points } },
  );
  return updated ? points : 0;
};

export const refundReferralPoints = async (userId, points) => {
  if (points > 0) await User.findByIdAndUpdate(userId, { $inc: { credits: points } });
};

// Gives back the points spent on a pass that expired or was cancelled.
// Safe to call any number of times: the flag flips once.
export const releaseReferralPoints = async (redemption) => {
  const points = redemption.totals?.referralDiscount || 0;
  if (points <= 0) return;

  const result = await Redemption.updateOne(
    {
      _id: redemption._id,
      status: { $in: ['expired', 'cancelled'] },
      referralPointsRefunded: { $ne: true },
    },
    { $set: { referralPointsRefunded: true } },
  );
  if (result.modifiedCount > 0) {
    await refundReferralPoints(redemption.customerId, points);
  }
};

// Sweeps every expired/cancelled pass whose points haven't been returned yet.
// Run from the expiry cron, which flips passes with a bulk update.
export const releaseUnrefundedReferralPoints = async () => {
  const passes = await Redemption.find({
    status: { $in: ['expired', 'cancelled'] },
    'totals.referralDiscount': { $gt: 0 },
    referralPointsRefunded: { $ne: true },
  }).select('customerId totals status');

  for (const pass of passes) {
    await releaseReferralPoints(pass);
  }
  return passes.length;
};

export const REFERRAL_MIN_REDEMPTION_AMOUNT = 500;
export const REFERRER_BONUS = 50;
export const REFERRED_BONUS = 20;

// A referral only counts once the referred customer completes a redemption
// worth at least REFERRAL_MIN_REDEMPTION_AMOUNT. Credits are paid out once.
export const checkAndAwardReferral = async (redemption) => {
  const amount = redemption.totals?.final > 0 ? redemption.totals.final : redemption.totals?.original || 0;
  if (amount < REFERRAL_MIN_REDEMPTION_AMOUNT) return;

  const user = await User.findById(redemption.customerId).select('name referredBy');
  if (!user?.referredBy) return;

  const referrer = await User.findById(user.referredBy).select('name');
  if (!referrer) return;

  const alreadyRewarded = await ReferralHistory.exists({
    userId: referrer._id,
    referredUserId: user._id,
  });
  if (alreadyRewarded) return;

  await Promise.all([
    User.findByIdAndUpdate(referrer._id, { $inc: { credits: REFERRER_BONUS } }),
    User.findByIdAndUpdate(user._id, { $inc: { credits: REFERRED_BONUS } }),
    ReferralHistory.create({
      userId: referrer._id,
      referredUserId: user._id,
      amount: REFERRER_BONUS,
      description: `Referral bonus for inviting ${user.name}`,
    }),
    ReferralHistory.create({
      userId: user._id,
      referredUserId: referrer._id,
      amount: REFERRED_BONUS,
      description: `Welcome bonus for joining via referral from ${referrer.name}`,
    }),
  ]);

  try {
    await notifyUser(referrer._id.toString(), {
      type: 'referral',
      title: 'Referral reward earned!',
      body: `${user.name} redeemed their first offer. ₹${REFERRER_BONUS} credits added.`,
      data: { amount: REFERRER_BONUS },
      link: '/referral',
    });
  } catch (err) {
    console.error('Referral notification error (non-blocking):', err);
  }
};
