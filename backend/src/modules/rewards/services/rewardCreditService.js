import ScratchCard from '../models/ScratchCard.js';
import User from '../../user/models/User.js';
import ReferralHistory from '../../user/models/ReferralHistory.js';

// Milestone credits land in the same User.credits wallet as referral points,
// so a customer spends them the same way at checkout. When the admin sets a
// credit expiry, each card remembers how much of its payout is still unspent
// (creditsRemaining) so the cron can take back exactly that on expiry.
//
// Spending order: credits closest to expiring go first, then everything else.
// Wallet balance itself is never split - this is bookkeeping on the cards.

const DAY_MS = 24 * 60 * 60 * 1000;

const cardLabel = (card) =>
  card.kind === 'repeat' ? 'Bonus reward' : `Level ${card.milestoneLevel} milestone reward`;

/**
 * Pays a card's credits into the customer's wallet. Callers must guarantee it
 * runs once per card (it follows a conditional status flip / fresh insert).
 */
export const payOutCardCredits = async (card, { creditExpiryDays = 0 } = {}) => {
  const credits = card.creditsAwarded || 0;
  if (credits <= 0) return card;

  const expireAt = creditExpiryDays > 0 ? new Date(Date.now() + creditExpiryDays * DAY_MS) : null;
  await User.findByIdAndUpdate(card.userId, { $inc: { credits } });
  if (expireAt) {
    await ScratchCard.updateOne(
      { _id: card._id },
      { $set: { creditsRemaining: credits, creditsExpireAt: expireAt } }
    );
    card.creditsRemaining = credits;
    card.creditsExpireAt = expireAt;
  }
  // Shows up in the wallet / referral history list alongside referral bonuses
  await ReferralHistory.create({ userId: card.userId, amount: credits, description: cardLabel(card) });
  return card;
};

const activeGrants = (userId) =>
  ScratchCard.find({
    userId,
    creditsRemaining: { $gt: 0 },
    creditsExpireAt: { $gt: new Date() },
    creditsExpired: { $ne: true },
  }).sort({ creditsExpireAt: 1 });

/**
 * Customer spent `points` from their wallet - draw them from expiring grants
 * first. Called by reserveReferralPoints after the balance was debited.
 */
export const consumeRewardCredits = async (userId, points) => {
  let left = Math.floor(points);
  if (left <= 0) return;
  for (const grant of await activeGrants(userId)) {
    if (left <= 0) break;
    const take = Math.min(left, grant.creditsRemaining);
    const res = await ScratchCard.updateOne(
      { _id: grant._id, creditsRemaining: { $gte: take } },
      { $inc: { creditsRemaining: -take } }
    );
    if (res.modifiedCount) left -= take;
  }
};

/**
 * Points went back into the wallet (pass expired / cancelled / shrank) - put
 * them back on the still-live grants they most likely came from. Anything
 * that doesn't fit (its grant expired meanwhile, or it was referral points)
 * simply stays in the wallet as non-expiring.
 */
export const restoreRewardCredits = async (userId, points) => {
  let left = Math.floor(points);
  if (left <= 0) return;
  const grants = await ScratchCard.find({
    userId,
    creditsExpireAt: { $gt: new Date() },
    creditsExpired: { $ne: true },
    $expr: { $lt: ['$creditsRemaining', '$creditsAwarded'] },
  }).sort({ creditsExpireAt: 1 });

  for (const grant of grants) {
    if (left <= 0) break;
    const give = Math.min(left, grant.creditsAwarded - grant.creditsRemaining);
    if (give <= 0) continue;
    await ScratchCard.updateOne({ _id: grant._id }, { $inc: { creditsRemaining: give } });
    left -= give;
  }
};

/**
 * Cron sweep: takes back whatever is still unspent from grants past their
 * expiry. Never pushes a wallet below zero. Returns the number of grants expired.
 */
export const expireRewardCredits = async (now = new Date()) => {
  const due = await ScratchCard.find({
    creditsRemaining: { $gt: 0 },
    creditsExpireAt: { $lte: now },
    creditsExpired: { $ne: true },
  }).select('_id');

  let expired = 0;
  for (const { _id } of due) {
    // Flip first so two overlapping sweeps can't both deduct
    const grant = await ScratchCard.findOneAndUpdate(
      { _id, creditsExpired: { $ne: true } },
      { $set: { creditsExpired: true } }
    );
    if (!grant) continue;

    const amount = grant.creditsRemaining;
    await User.updateOne(
      { _id: grant.userId },
      [{ $set: { credits: { $max: [0, { $subtract: [{ $ifNull: ['$credits', 0] }, amount] }] } } }],
      { updatePipeline: true }
    );
    await ScratchCard.updateOne({ _id }, { $set: { creditsRemaining: 0 } });
    await ReferralHistory.create({
      userId: grant.userId,
      amount: -amount,
      description: `${cardLabel(grant)} - unused credits expired`,
    });
    expired += 1;
  }
  return expired;
};

/**
 * Cron sweep: unscratched cards past their expiry can no longer be revealed.
 */
export const expireUnscratchedCards = async (now = new Date()) => {
  const res = await ScratchCard.updateMany(
    { status: 'unscratched', expiresAt: { $ne: null, $lte: now } },
    { $set: { status: 'expired' } }
  );
  return res.modifiedCount || 0;
};
