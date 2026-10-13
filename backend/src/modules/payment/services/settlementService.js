import Merchant from '../../merchant/models/Merchant.js';
import Redemption from '../../booking/models/Redemption.js';
import AdminNotification from '../../admin/models/AdminNotification.js';
import SettlementTransaction from '../models/SettlementTransaction.js';
import PayoutRequest from '../models/PayoutRequest.js';
import { notifyMerchant } from '../../user/services/notificationService.js';
import { getIncentiveSettings } from '../../user/services/incentiveService.js';

// The settlement wallet: money Offerly owes a store. When a customer pays part
// of a bill with points, or gets a Distribution Fund bonus, the store collects
// that much less at the counter - so the same amount is credited here once the
// pass is completed, and the store can ask Offerly to pay it out.

const httpError = (status, message) => Object.assign(new Error(message), { status });

const walletOf = (merchant) => ({
  balance: merchant?.settlementWallet?.balance || 0,
  pending: merchant?.settlementWallet?.pending || 0,
  totalEarned: merchant?.settlementWallet?.totalEarned || 0,
  totalPaid: merchant?.settlementWallet?.totalPaid || 0,
});

// Credits the store for a completed pass. Safe to call any number of times:
// the flag on the pass flips once.
export const creditSettlementForRedemption = async (redemption) => {
  const points = Math.max(0, Math.round(redemption.totals?.referralDiscount || 0));
  const bonus = Math.max(0, Math.round(redemption.totals?.walletDiscount || 0));
  const total = points + bonus;
  if (total <= 0) return 0;

  const claimed = await Redemption.updateOne(
    { _id: redemption._id, status: 'completed', settlementCredited: { $ne: true } },
    { $set: { settlementCredited: true } }
  );
  if (claimed.modifiedCount === 0) return 0;

  const merchant = await Merchant.findByIdAndUpdate(
    redemption.merchantId,
    { $inc: { 'settlementWallet.balance': total, 'settlementWallet.totalEarned': total } },
    { new: true }
  ).select('settlementWallet');
  const balanceAfter = walletOf(merchant).balance;

  const pass = redemption.internalId ? ` (#${redemption.internalId})` : '';
  const entries = [];
  if (points > 0) {
    entries.push({
      merchantId: redemption.merchantId,
      type: 'points_discount',
      amount: points,
      balanceAfter: balanceAfter - bonus,
      redemptionId: redemption._id,
      note: `Customer paid ₹${points} with points${pass}`,
    });
  }
  if (bonus > 0) {
    entries.push({
      merchantId: redemption.merchantId,
      type: 'bonus_discount',
      amount: bonus,
      balanceAfter,
      redemptionId: redemption._id,
      note: `${redemption.totals?.bonusLabel || 'Offerly bonus'} ₹${bonus}${pass}`,
    });
  }
  await SettlementTransaction.insertMany(entries);
  return total;
};

const hasPayoutDetails = (bank = {}) =>
  Boolean((bank.upiId || '').trim() || ((bank.accountNumber || '').trim() && (bank.ifscCode || '').trim()));

// Everything the store's wallet screen shows
export const getSettlementOverview = async (merchantId) => {
  const [merchant, transactions, payouts, settings] = await Promise.all([
    Merchant.findById(merchantId).select('settlementWallet bankDetails').lean(),
    SettlementTransaction.find({ merchantId }).sort({ createdAt: -1 }).limit(100).lean(),
    PayoutRequest.find({ merchantId }).sort({ createdAt: -1 }).limit(30).lean(),
    getIncentiveSettings(),
  ]);
  return {
    wallet: walletOf(merchant),
    bankDetails: merchant?.bankDetails || {},
    hasPayoutDetails: hasPayoutDetails(merchant?.bankDetails),
    minPayout: settings.payout?.minAmount ?? 0,
    transactions,
    payouts,
  };
};

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_PATTERN = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;

// Saves where the store wants to be paid: a UPI ID, a bank account, or both.
export const saveBankDetails = async (merchantId, body = {}) => {
  const clean = (v, max) => String(v ?? '').trim().slice(0, max);
  const details = {
    accountHolderName: clean(body.accountHolderName, 80),
    accountNumber: clean(body.accountNumber, 20).replace(/\s/g, ''),
    ifscCode: clean(body.ifscCode, 11).toUpperCase(),
    bankName: clean(body.bankName, 80),
    upiId: clean(body.upiId, 60),
  };

  if (details.upiId && !UPI_PATTERN.test(details.upiId)) throw httpError(400, 'Enter a valid UPI ID, like name@bank');
  const anyBank = details.accountNumber || details.ifscCode;
  if (anyBank) {
    if (!/^\d{9,18}$/.test(details.accountNumber)) throw httpError(400, 'Enter a valid bank account number (9 to 18 digits)');
    if (!IFSC_PATTERN.test(details.ifscCode)) throw httpError(400, 'Enter a valid IFSC code, like SBIN0001234');
    if (!details.accountHolderName) throw httpError(400, 'Enter the account holder name');
  }
  if (!details.upiId && !anyBank) throw httpError(400, 'Add a UPI ID or a bank account');

  await Merchant.updateOne({ _id: merchantId }, { $set: { bankDetails: details } });
  return details;
};

// Moves the store's whole balance into a payout request for the admin.
// One open request at a time, so the admin always sees a single amount to pay.
export const requestPayout = async (merchantId) => {
  const [merchant, settings, open] = await Promise.all([
    Merchant.findById(merchantId).select('storeName settlementWallet bankDetails').lean(),
    getIncentiveSettings(),
    PayoutRequest.exists({ merchantId, status: 'pending' }),
  ]);
  if (!merchant) throw httpError(404, 'Store not found');
  if (open) throw httpError(400, 'You already have a payout request waiting. A new one can be made once it is paid.');
  if (!hasPayoutDetails(merchant.bankDetails)) throw httpError(400, 'Add your UPI ID or bank account first');

  const amount = Math.floor(walletOf(merchant).balance);
  const minAmount = settings.payout?.minAmount ?? 0;
  if (amount <= 0) throw httpError(400, 'There is nothing to pay out yet');
  if (amount < minAmount) throw httpError(400, `You can request a payout once your balance reaches ₹${minAmount}`);

  // Conditional so two taps (or an order completing meanwhile) can't overdraw
  const held = await Merchant.findOneAndUpdate(
    { _id: merchantId, 'settlementWallet.balance': { $gte: amount } },
    { $inc: { 'settlementWallet.balance': -amount, 'settlementWallet.pending': amount } },
    { new: true }
  ).select('settlementWallet');
  if (!held) throw httpError(409, 'Your balance changed. Please try again.');

  let payout;
  try {
    payout = await PayoutRequest.create({ merchantId, amount, bankDetails: merchant.bankDetails });
  } catch (err) {
    await Merchant.updateOne(
      { _id: merchantId },
      { $inc: { 'settlementWallet.balance': amount, 'settlementWallet.pending': -amount } }
    );
    throw err;
  }

  await SettlementTransaction.create({
    merchantId,
    type: 'payout_requested',
    amount,
    balanceAfter: walletOf(held).balance,
    payoutId: payout._id,
    note: `Payout of ₹${amount} requested`,
  });

  try {
    const { emitAdminNotification } = await import('../../../config/socket.js');
    const notification = await AdminNotification.create({
      title: 'Payout requested',
      body: `${merchant.storeName || 'A store'} asked for a payout of ₹${amount}.`,
      type: 'general',
      data: { merchantId, payoutId: payout._id },
    });
    emitAdminNotification(notification);
  } catch (err) {
    console.error('Payout admin notification error (non-blocking):', err);
  }

  return payout;
};

const tellMerchant = async (merchantId, title, body) => {
  try {
    await notifyMerchant(String(merchantId), { type: 'payment', title, body, link: '/merchant/wallet' });
  } catch (err) {
    console.error('Payout merchant notification error (non-blocking):', err);
  }
};

// Admin: the request was paid outside the app. The status flips once.
export const markPayoutPaid = async (payoutId, { reference = '', adminNote = '', adminId = null } = {}) => {
  const ref = String(reference).trim().slice(0, 80);
  if (!ref) throw httpError(400, 'Enter the payment reference (UTR / UPI transaction ID)');

  const payout = await PayoutRequest.findOneAndUpdate(
    { _id: payoutId, status: 'pending' },
    { $set: { status: 'paid', reference: ref, adminNote: String(adminNote).trim().slice(0, 300), processedAt: new Date(), processedBy: adminId } },
    { new: true }
  );
  if (!payout) throw httpError(409, 'This request has already been processed');

  const merchant = await Merchant.findByIdAndUpdate(
    payout.merchantId,
    { $inc: { 'settlementWallet.pending': -payout.amount, 'settlementWallet.totalPaid': payout.amount } },
    { new: true }
  ).select('settlementWallet');
  await SettlementTransaction.create({
    merchantId: payout.merchantId,
    type: 'payout_paid',
    amount: payout.amount,
    balanceAfter: walletOf(merchant).balance,
    payoutId: payout._id,
    note: `Paid by Offerly · Ref ${ref}`,
  });
  await tellMerchant(payout.merchantId, 'Payout sent', `Offerly paid you ₹${payout.amount}. Reference: ${ref}.`);
  return payout;
};

// Admin: decline a request; the money goes back to the store's balance.
export const rejectPayout = async (payoutId, { adminNote = '', adminId = null } = {}) => {
  const note = String(adminNote).trim().slice(0, 300);
  if (!note) throw httpError(400, 'Tell the store why the request was declined');

  const payout = await PayoutRequest.findOneAndUpdate(
    { _id: payoutId, status: 'pending' },
    { $set: { status: 'rejected', adminNote: note, processedAt: new Date(), processedBy: adminId } },
    { new: true }
  );
  if (!payout) throw httpError(409, 'This request has already been processed');

  const merchant = await Merchant.findByIdAndUpdate(
    payout.merchantId,
    { $inc: { 'settlementWallet.pending': -payout.amount, 'settlementWallet.balance': payout.amount } },
    { new: true }
  ).select('settlementWallet');
  await SettlementTransaction.create({
    merchantId: payout.merchantId,
    type: 'payout_rejected',
    amount: payout.amount,
    balanceAfter: walletOf(merchant).balance,
    payoutId: payout._id,
    note: `Request declined: ${note}`,
  });
  await tellMerchant(payout.merchantId, 'Payout request declined', `${note} ₹${payout.amount} is back in your balance.`);
  return payout;
};
