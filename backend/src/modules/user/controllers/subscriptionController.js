import Plan from "../../admin/models/Plan.js";
import CustomerSubscription from "../../payment/models/CustomerSubscription.js";
import SubscriptionOrder from "../../payment/models/SubscriptionOrder.js";
import { createRazorpayOrder, verifyRazorpayPayment } from "../../../utils/razorpay.js";
import {
  computeSubscriptionEndDate,
  getCustomerSubscriptionStatus,
} from "../../../utils/customerSubscription.js";
import { serializeCustomerSubscription } from "../../../utils/serializers.js";

// @desc    Get the logged-in customer's subscription status (whether the
//          gate is enabled platform-wide, and whether this customer is subscribed)
// @route   GET /api/users/me/subscription
// @access  Private (Customer)
export const getMySubscriptionStatus = async (req, res) => {
  try {
    const { enabled, isSubscribed, subscription } = await getCustomerSubscriptionStatus(req.user._id);
    const populated = subscription ? await subscription.populate("planId") : null;

    return res.status(200).json({
      success: true,
      enabled,
      isSubscribed,
      subscription: serializeCustomerSubscription(populated),
    });
  } catch (err) {
    console.error("getMySubscriptionStatus error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch subscription status" });
  }
};

// @desc    Start a customer subscription purchase - creates a Razorpay order
//          for paid plans, or activates directly for a free plan
// @route   POST /api/users/me/subscription/purchase
// @access  Private (Customer)
export const purchaseCustomerSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await Plan.findById(planId);

    if (!plan || plan.planType !== "customer" || plan.status !== "active") {
      return res.status(404).json({ success: false, error: "Plan not found" });
    }

    const price = Number(plan.price || 0);

    if (price > 0) {
      try {
        const order = await createRazorpayOrder(
          price,
          "INR",
          `cust_${req.user._id.toString().slice(-8)}_${Date.now()}`,
          {
            planId: plan._id.toString(),
            planName: plan.name,
            planType: "customer",
            userId: req.user._id.toString(),
          },
        );

        await SubscriptionOrder.create({
          userId: req.user._id,
          merchantId: null,
          planId: plan._id,
          orderId: order.id,
          amount: price,
          listPrice: price,
          walletDiscountApplied: 0,
          planType: "customer",
        });

        return res.status(200).json({
          success: true,
          requiresPayment: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID,
          plan: { id: plan._id.toString(), name: plan.name, price, duration: plan.duration },
          customerDetails: {
            name: req.user.name,
            email: req.user.email,
            contact: req.user.phone,
          },
        });
      } catch (err) {
        console.error("Razorpay order error:", err);
        return res.status(500).json({ success: false, error: "Payment gateway error. Please try again later." });
      }
    }

    // Free plan - activate directly, no payment needed
    const startDate = new Date();
    const endDate = computeSubscriptionEndDate(plan.duration, startDate);

    await CustomerSubscription.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        planId: plan._id,
        amount: 0,
        status: "active",
        startDate,
        endDate,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({ success: true, requiresPayment: false, message: `${plan.name} activated successfully!` });
  } catch (err) {
    console.error("purchaseCustomerSubscription error:", err);
    return res.status(500).json({ success: false, error: "Failed to start subscription purchase" });
  }
};

// @desc    Verify a Razorpay payment and activate the customer subscription
// @route   POST /api/users/me/subscription/verify
// @access  Private (Customer)
export const verifyCustomerSubscription = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    const isValid = verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }

    // Look up (without claiming yet) so a mismatched planId can be rejected
    // without burning the order - a client sending back the wrong planId
    // (bug or stale state) must still be able to retry with the right one
    // instead of permanently losing an already-paid-for order.
    const pendingOrder = await SubscriptionOrder.findOne({
      orderId: razorpay_order_id,
      userId: req.user._id,
      planType: "customer",
      status: "created",
    });
    if (!pendingOrder) {
      return res.status(400).json({ success: false, error: "This order was not found, does not belong to you, or has already been used" });
    }
    if (planId && String(planId) !== String(pendingOrder.planId)) {
      return res.status(400).json({ success: false, error: "Plan does not match the plan this payment was created for" });
    }

    // Now atomically claim it so it can only ever be verified once. The
    // plan/amount actually paid for is whatever was recorded when the order
    // was created - never trust req.body.planId for the activation itself.
    const order = await SubscriptionOrder.findOneAndUpdate(
      { _id: pendingOrder._id, status: "created" },
      { status: "consumed" },
      { new: true },
    );
    if (!order) {
      return res.status(400).json({ success: false, error: "This order was not found, does not belong to you, or has already been used" });
    }

    const plan = await Plan.findById(order.planId);
    if (!plan) {
      return res.status(404).json({ success: false, error: "Plan not found" });
    }

    const startDate = new Date();
    const endDate = computeSubscriptionEndDate(plan.duration, startDate);

    const subscription = await CustomerSubscription.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        planId: plan._id,
        amount: order.amount,
        status: "active",
        startDate,
        endDate,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: `Payment verified. ${plan.name} activated!`,
      subscription: serializeCustomerSubscription(await subscription.populate("planId")),
    });
  } catch (err) {
    console.error("verifyCustomerSubscription error:", err);
    return res.status(500).json({ success: false, error: "Failed to verify subscription payment" });
  }
};
