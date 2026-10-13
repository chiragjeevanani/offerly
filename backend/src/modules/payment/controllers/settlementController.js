import mongoose from 'mongoose';
import Merchant from '../../merchant/models/Merchant.js';
import PayoutRequest from '../models/PayoutRequest.js';
import {
  getSettlementOverview,
  saveBankDetails,
  requestPayout,
  markPayoutPaid,
  rejectPayout,
} from '../services/settlementService.js';

// Service errors carry a status + a message meant for the person; anything
// else is a real failure.
const fail = (res, err, fallback) => {
  if (err?.status) return res.status(err.status).json({ success: false, error: err.message });
  console.error(fallback, err);
  return res.status(500).json({ success: false, error: fallback });
};

// ───────── Merchant (req.user IS the merchant document) ─────────

// @route GET /merchants/me/settlement
export const getMySettlement = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: await getSettlementOverview(req.user._id) });
  } catch (err) {
    fail(res, err, 'Failed to load your wallet');
  }
};

// @route PUT /merchants/me/settlement/bank-details
export const updateMyBankDetails = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: await saveBankDetails(req.user._id, req.body) });
  } catch (err) {
    fail(res, err, 'Failed to save payout details');
  }
};

// @route POST /merchants/me/settlement/payouts
export const createMyPayoutRequest = async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await requestPayout(req.user._id) });
  } catch (err) {
    fail(res, err, 'Failed to request a payout');
  }
};

// ───────── Admin ─────────

// @route GET /admin/payouts?status=pending|paid|rejected|all
export const getPayoutRequests = async (req, res) => {
  try {
    const status = ['pending', 'paid', 'rejected'].includes(req.query.status) ? req.query.status : null;
    const [payouts, owed, pending] = await Promise.all([
      PayoutRequest.find(status ? { status } : {})
        .sort({ createdAt: -1 })
        .limit(200)
        .populate('merchantId', 'storeName phone city logo')
        .lean(),
      Merchant.aggregate([
        {
          $group: {
            _id: null,
            balance: { $sum: { $ifNull: ['$settlementWallet.balance', 0] } },
            pending: { $sum: { $ifNull: ['$settlementWallet.pending', 0] } },
            totalPaid: { $sum: { $ifNull: ['$settlementWallet.totalPaid', 0] } },
          },
        },
      ]),
      PayoutRequest.countDocuments({ status: 'pending' }),
    ]);
    res.status(200).json({
      success: true,
      data: {
        payouts,
        summary: {
          notYetRequested: owed[0]?.balance || 0,
          awaitingPayment: owed[0]?.pending || 0,
          totalPaid: owed[0]?.totalPaid || 0,
          pendingCount: pending,
        },
      },
    });
  } catch (err) {
    fail(res, err, 'Failed to load payout requests');
  }
};

const withPayout = (action, fallback) => async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid payout request' });
  }
  try {
    const payout = await action(req.params.id, { ...req.body, adminId: req.user._id });
    res.status(200).json({ success: true, data: payout });
  } catch (err) {
    fail(res, err, fallback);
  }
};

// @route PUT /admin/payouts/:id/pay   { reference, adminNote? }
export const payPayoutRequest = withPayout(markPayoutPaid, 'Failed to mark the payout as paid');

// @route PUT /admin/payouts/:id/reject   { adminNote }
export const rejectPayoutRequest = withPayout(rejectPayout, 'Failed to decline the payout');
