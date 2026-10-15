import mongoose from 'mongoose';

// Ledger for Merchant.settlementWallet - what Offerly owes a store for the
// discounts Offerly gave that store's customers.
const settlementTransactionSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'points_discount', // customer paid part of a bill with points/credits
        'bonus_discount', // Distribution Fund bonus on a bill
        'delivery_order', // items bill of a delivered order (Offerly/its partner collected it)
        'payout_requested', // balance moved into an open payout request
        'payout_paid', // Offerly paid the request
        'payout_rejected', // request declined, money back in the balance
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    // Requestable balance after this entry
    balanceAfter: {
      type: Number,
      default: 0,
    },
    redemptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Redemption',
      default: null,
    },
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayoutRequest',
      default: null,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

settlementTransactionSchema.index({ merchantId: 1, createdAt: -1 });

export default mongoose.models.SettlementTransaction || mongoose.model('SettlementTransaction', settlementTransactionSchema);
