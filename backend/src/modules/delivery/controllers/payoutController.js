import mongoose from 'mongoose';
import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryWithdrawal from '../models/DeliveryWithdrawal.js';
import AdminNotification from '../../admin/models/AdminNotification.js';
import { emitAdminNotification } from '../../../config/socket.js';
import { getDeliverySettings, notifyPartner } from '../services/deliveryService.js';
import { payoutRules, payoutWindow, scheduleText } from '../services/payoutService.js';

// Partner wallet and withdrawals. What a partner can withdraw is what Offerly
// owes them (stats.earningsDue) minus the cash-on-delivery money they still hold
// (stats.cashInHand), which is Offerly's. A request takes its amount out of
// earningsDue straight away; a rejected one puts it back.

const validId = (id) => mongoose.isValidObjectId(id);
const rupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const withdrawalView = (w) => ({
  id: String(w._id),
  amount: w.amount,
  status: w.status,
  payoutTo: w.payoutTo || {},
  reference: w.reference || '',
  rejectReason: w.rejectReason || '',
  createdAt: w.createdAt,
  paidAt: w.paidAt || null,
  rejectedAt: w.rejectedAt || null,
});

const payoutReady = (p) => Boolean(p.bankDetails?.upiId || (p.bankDetails?.accountNumber && p.bankDetails?.ifscCode));
const available = (p) => Math.max(0, Math.floor((p.stats?.earningsDue || 0) - (p.stats?.cashInHand || 0)));

const walletView = async (partner, settings) => {
  const rules = payoutRules(settings);
  const win = payoutWindow(rules);
  const history = await DeliveryWithdrawal.find({ partnerId: partner._id }).sort({ createdAt: -1 }).limit(20).lean();
  const usedThisWindow = win.open && history.some((w) => w.windowKey === win.key && w.status !== 'rejected');
  const pending = history.find((w) => w.status === 'requested');
  const withdrawable = available(partner);
  let blocker = null;
  if (!payoutReady(partner)) blocker = 'Add your UPI ID or bank account in Profile to withdraw.';
  else if (!win.open) blocker = `You can withdraw ${scheduleText(rules)}.`;
  else if (usedThisWindow) blocker = rules.frequency === 'daily' ? 'You have already withdrawn today.' : 'You have already withdrawn this week.';
  else if (withdrawable <= 0) blocker = partner.stats?.cashInHand > 0 ? 'Hand over the cash you collected first; it is more than your earnings.' : 'Nothing to withdraw yet.';
  else if (withdrawable < rules.minAmount) blocker = `The smallest withdrawal is ${rupees(rules.minAmount)}.`;
  return {
    earningsDue: partner.stats?.earningsDue || 0,
    cashInHand: partner.stats?.cashInHand || 0,
    withdrawable,
    totalEarnings: partner.stats?.totalEarnings || 0,
    schedule: { ...rules, text: scheduleText(rules), openNow: win.open, opensAt: win.opensAt || null },
    canWithdraw: !blocker,
    blocker,
    pending: pending ? withdrawalView(pending) : null,
    history: history.map(withdrawalView),
  };
};

// @route GET /delivery/partner/wallet
export const getWallet = async (req, res) => {
  try {
    const [partner, settings] = await Promise.all([DeliveryPartner.findById(req.user._id), getDeliverySettings()]);
    res.status(200).json({ success: true, data: await walletView(partner, settings) });
  } catch (err) {
    console.error('getWallet error:', err);
    res.status(500).json({ success: false, error: 'Failed to load wallet' });
  }
};

// @route POST /delivery/partner/wallet/withdraw  body: { amount }  (omit = everything available)
export const requestWithdrawal = async (req, res) => {
  try {
    const [partner, settings] = await Promise.all([DeliveryPartner.findById(req.user._id), getDeliverySettings()]);
    const before = await walletView(partner, settings);
    if (!before.canWithdraw) return res.status(400).json({ success: false, error: before.blocker });
    const asked = req.body?.amount === undefined ? before.withdrawable : Math.floor(Number(req.body.amount));
    if (!Number.isFinite(asked) || asked < 1) return res.status(400).json({ success: false, error: 'Enter an amount to withdraw' });
    if (asked > before.withdrawable) return res.status(400).json({ success: false, error: `You can withdraw up to ${rupees(before.withdrawable)}` });
    if (asked < before.schedule.minAmount) return res.status(400).json({ success: false, error: `The smallest withdrawal is ${rupees(before.schedule.minAmount)}` });

    const win = payoutWindow(payoutRules(settings));
    // Claim the window first (unique index), then take the money out of
    // earningsDue only if it is still there; undo the claim if it isn't.
    let withdrawal;
    try {
      withdrawal = await DeliveryWithdrawal.create({
        partnerId: partner._id,
        amount: asked,
        windowKey: win.key,
        payoutTo: {
          upiId: partner.bankDetails?.upiId || '',
          accountHolderName: partner.bankDetails?.accountHolderName || '',
          accountNumber: partner.bankDetails?.accountNumber || '',
          ifscCode: partner.bankDetails?.ifscCode || '',
        },
      });
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ success: false, error: 'You have already withdrawn in this payout period' });
      throw err;
    }
    const taken = await DeliveryPartner.updateOne(
      { _id: partner._id, $expr: { $gte: [{ $subtract: ['$stats.earningsDue', { $ifNull: ['$stats.cashInHand', 0] }] }, asked] } },
      { $inc: { 'stats.earningsDue': -asked } }
    );
    if (!taken.modifiedCount) {
      await DeliveryWithdrawal.deleteOne({ _id: withdrawal._id });
      return res.status(409).json({ success: false, error: 'Your balance changed just now. Please try again.' });
    }

    try {
      const note = await AdminNotification.create({
        title: 'Partner withdrawal request',
        body: `${partner.name} (${partner.phone}) asked for ${rupees(asked)}. Pay it from Delivery Partners > Withdrawals.`,
        type: 'delivery',
        data: { withdrawalId: String(withdrawal._id), partnerId: String(partner._id) },
      });
      emitAdminNotification(note);
    } catch (notifyErr) {
      console.error('withdrawal admin notify failed:', notifyErr.message);
    }
    const fresh = await DeliveryPartner.findById(partner._id);
    res.status(201).json({ success: true, data: await walletView(fresh, settings) });
  } catch (err) {
    console.error('requestWithdrawal error:', err);
    res.status(500).json({ success: false, error: 'Failed to request withdrawal' });
  }
};

/* ── Admin ── */

// @route GET /delivery/admin/withdrawals?status=requested|paid|rejected
export const getAdminWithdrawals = async (req, res) => {
  try {
    const status = ['requested', 'paid', 'rejected'].includes(req.query.status) ? req.query.status : null;
    const [rows, counts] = await Promise.all([
      DeliveryWithdrawal.find(status ? { status } : {})
        .sort(status === 'requested' ? { createdAt: 1 } : { createdAt: -1 })
        .limit(200)
        .populate('partnerId', 'name phone city')
        .lean(),
      DeliveryWithdrawal.aggregate([{ $group: { _id: '$status', n: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
    ]);
    res.status(200).json({
      success: true,
      data: rows.map((w) => ({
        ...withdrawalView(w),
        partner: w.partnerId ? { id: String(w.partnerId._id), name: w.partnerId.name, phone: w.partnerId.phone, city: w.partnerId.city } : null,
      })),
      counts: Object.fromEntries(counts.map((c) => [c._id, { n: c.n, amount: c.amount }])),
    });
  } catch (err) {
    console.error('getAdminWithdrawals error:', err);
    res.status(500).json({ success: false, error: 'Failed to load withdrawals' });
  }
};

// @route POST /delivery/admin/withdrawals/:id/paid  body: { reference }
export const markWithdrawalPaid = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid request' });
  const reference = String(req.body?.reference || '').trim().slice(0, 120);
  try {
    const w = await DeliveryWithdrawal.findOneAndUpdate(
      { _id: req.params.id, status: 'requested' },
      { $set: { status: 'paid', paidAt: new Date(), reference } },
      { new: true }
    );
    if (!w) return res.status(400).json({ success: false, error: 'This request is not waiting for payment' });
    await DeliveryPartner.updateOne(
      { _id: w.partnerId },
      { $push: { settlements: { cashReceived: 0, earningsPaid: w.amount, note: `Withdrawal${reference ? ` (ref ${reference})` : ''}`, at: new Date() } } }
    );
    notifyPartner(w.partnerId, {
      type: 'settled',
      title: 'Withdrawal paid',
      body: `Offerly sent you ${rupees(w.amount)}${reference ? ` (ref ${reference})` : ''}.`,
      link: '/delivery/earnings',
    });
    res.status(200).json({ success: true, data: withdrawalView(w) });
  } catch (err) {
    console.error('markWithdrawalPaid error:', err);
    res.status(500).json({ success: false, error: 'Failed to update withdrawal' });
  }
};

// @route POST /delivery/admin/withdrawals/:id/reject  body: { reason }
export const rejectWithdrawal = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid request' });
  const reason = String(req.body?.reason || '').trim().slice(0, 200);
  if (!reason) return res.status(400).json({ success: false, error: 'Tell the partner why' });
  try {
    const w = await DeliveryWithdrawal.findOneAndUpdate(
      { _id: req.params.id, status: 'requested' },
      { $set: { status: 'rejected', rejectedAt: new Date(), rejectReason: reason } },
      { new: true }
    );
    if (!w) return res.status(400).json({ success: false, error: 'This request is not waiting for payment' });
    // The money goes back to what Offerly owes them.
    await DeliveryPartner.updateOne({ _id: w.partnerId }, { $inc: { 'stats.earningsDue': w.amount } });
    notifyPartner(w.partnerId, {
      type: 'settled',
      title: 'Withdrawal not paid',
      body: `Your ${rupees(w.amount)} withdrawal was declined: ${reason}. The amount is back in your wallet.`,
      link: '/delivery/earnings',
    });
    res.status(200).json({ success: true, data: withdrawalView(w) });
  } catch (err) {
    console.error('rejectWithdrawal error:', err);
    res.status(500).json({ success: false, error: 'Failed to update withdrawal' });
  }
};
