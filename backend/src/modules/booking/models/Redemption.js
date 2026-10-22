import mongoose from 'mongoose';

const itemSnapshotSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    category: String,
    price: Number,
    offerPrice: Number,
    image: String,
    // "M / Red" - also folded into `name` so every existing view shows it.
    variantLabel: String,
    isVeg: mongoose.Schema.Types.Mixed,
    foodType: String,
    duration: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const redemptionItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    // Size/colour combination, for products with variants. Stock is taken from
    // this variant when the redemption completes.
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      default: null,
    },
    product: {
      type: itemSnapshotSchema,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const redemptionSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired', 'cancelled'],
      default: 'pending',
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
    },
    qrExpiry: {
      type: Date,
      required: true,
    },
    scannedAt: Date,
    hasReview: {
      type: Boolean,
      default: false,
    },
    items: {
      type: [redemptionItemSchema],
      default: [],
    },
    totals: {
      base: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      final: {
        type: Number,
        default: 0,
      },
      original: {
        type: Number,
        default: 0,
      },
      // Extra discount funded from the merchant's discount wallet, granted to
      // platform-first-time customers. Already folded into `discount`/`final`.
      walletDiscount: {
        type: Number,
        default: 0,
      },
      // Referral points the customer chose to spend on this pass (1 point = ₹1).
      // Deducted from User.credits at claim time; also folded into `discount`/`final`.
      referralDiscount: {
        type: Number,
        default: 0,
      },
      // Which Distribution Fund bonus `walletDiscount` is (newUser, returning,
      // welcomeBack, loyal, specialDay) and the rule as it stood at claim time,
      // so an item edit re-applies the same rule. Empty on older passes, whose
      // walletDiscount is always the new-user discount.
      bonusType: {
        type: String,
        default: '',
      },
      bonusLabel: {
        type: String,
        default: '',
      },
      bonusRule: {
        discountType: String,
        value: Number,
        maxDiscount: Number,
        minOrderValue: Number,
      },
      // Credit-spending rules at claim time (0 = none)
      creditsMinOrder: {
        type: Number,
        default: 0,
      },
      creditsMaxPerOrder: {
        type: Number,
        default: 0,
      },
    },
    // Set once the referral points above have been given back after the pass
    // expired or was cancelled, so they can never be refunded twice.
    referralPointsRefunded: {
      type: Boolean,
      default: false,
    },
    // Set once the store has been credited (settlement wallet) for the points
    // and bonus on this pass, so it can never be credited twice.
    settlementCredited: {
      type: Boolean,
      default: false,
    },
    // Stock set aside for this pass. 'held' while pending; 'released' once an
    // expired/cancelled pass gives it back; 'consumed' when completed. Passes
    // created before reservations existed stay 'none' and are deducted the
    // old way at completion.
    stockHold: {
      status: {
        type: String,
        enum: ['none', 'held', 'released', 'consumed'],
        default: 'none',
      },
      lines: {
        type: [
          {
            _id: false,
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
            qty: Number,
            label: String,
          },
        ],
        default: [],
      },
    },
    internalId: String,
    // 'pickup' = the customer shows the QR at the store (the original flow).
    // 'delivery' = a delivery partner brings it; see `delivery` below.
    fulfillment: {
      type: String,
      enum: ['pickup', 'delivery'],
      default: 'pickup',
    },
    // Free item the order qualified for (admin-set gift), frozen at claim time.
    freeGift: {
      title: String,
      description: String,
    },
    // Delivery orders only (no defaults, so pickup passes carry nothing).
    // `totals.final` stays the items bill (store revenue); the customer pays
    // totals.final + delivery.fee.
    delivery: {
      status: {
        type: String,
        // returning/returned: picked up but couldn't be delivered, so the partner
        // takes it back and the store confirms receipt (order itself is cancelled).
        // verifying: admin's "call the customer" step, before the store sees the order.
        enum: ['awaiting_payment', 'verifying', 'placed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled', 'returning', 'returned'],
      },
      address: {
        name: String,
        phone: String,
        line1: String,
        line2: String,
        landmark: String,
        pincode: String,
        lat: Number,
        lng: Number,
      },
      // Store's city, so partners only see orders in their own city.
      city: String,
      distanceKm: Number,
      fee: Number,
      paymentMode: { type: String, enum: ['cod', 'online'] },
      paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'refund_pending', 'refunded', 'refund_failed'],
      },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      refundId: String,
      // True when the customer cancelled, refused it or wasn't reachable: the
      // refund then leaves out the delivery fee. Set with the cancel, so the
      // cron's and admin's refund retries refund the same amount.
      feeRetained: Boolean,
      refundAmount: Number,
      // Told to the partner by the customer at the door; never sent to the
      // store or the partner.
      otp: { type: String, select: false },
      partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },
      partnerName: String,
      partnerPhone: String,
      partnerPayout: Number,
      cashCollected: Number,
      // How a cash-on-delivery order was paid at the door. UPI goes straight to
      // Offerly's account, so it is not cash in the partner's hand.
      collectedVia: { type: String, enum: ['cash', 'upi'] },
      // Set once the store's settlement wallet got the items bill.
      storeCredited: Boolean,
      cancelReason: String,
      cancelledBy: String,
      placedAt: Date,
      verifiedAt: Date,
      verifiedBy: String,
      acceptedAt: Date,
      readyAt: Date,
      assignedAt: Date,
      pickedUpAt: Date,
      deliveredAt: Date,
      cancelledAt: Date,
      returnStartedAt: Date,
      returnedAt: Date,
      returnConfirmedBy: String,
      // The partner couldn't deliver and asked Offerly support what to do.
      supportRequestedAt: Date,
      supportReason: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for feed and analytics performance
redemptionSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
redemptionSchema.index({ offerId: 1, status: 1, createdAt: -1 });
redemptionSchema.index({ customerId: 1, createdAt: -1 });
redemptionSchema.index({ status: 1, createdAt: -1 });
// Backs the acquisition and repeat-customer aggregations, which group by customer
// within a merchant before filtering on date.
redemptionSchema.index({ merchantId: 1, customerId: 1, status: 1, createdAt: 1 });
// Backs the per-offer performance rollup.
redemptionSchema.index({ merchantId: 1, offerId: 1, status: 1, createdAt: -1 });
// Delivery partner's open pool (city + stage, unassigned) and their own orders.
redemptionSchema.index({ fulfillment: 1, 'delivery.city': 1, 'delivery.status': 1, 'delivery.partnerId': 1 });
redemptionSchema.index({ 'delivery.partnerId': 1, 'delivery.status': 1, updatedAt: -1 });
redemptionSchema.index({ 'delivery.razorpayOrderId': 1 }, { sparse: true });

export default mongoose.model('Redemption', redemptionSchema);
