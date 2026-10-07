import Plan from "../../admin/models/Plan.js";
import Merchant from "../../merchant/models/Merchant.js";
import CustomerSubscription from "../models/CustomerSubscription.js";
import MerchantSubscription from "../models/MerchantSubscription.js";
import SubscriptionOrder from "../models/SubscriptionOrder.js";
import { applySubscriptionWalletEffects } from "../../../utils/subscriptionWallet.js";
import { computeSubscriptionEndDate } from "../../../utils/customerSubscription.js";
import { invalidateFeedCache } from "../../../utils/feedCache.js";

// Both the browser's /verify call and Razorpay's webhook land here, so whichever
// arrives first activates the plan and the other finds it already done. The
// atomic created -> consumed flip on SubscriptionOrder is what makes that safe.

const merchantEndDate = (plan, from = new Date()) => {
  const endDate = new Date(from);
  if (plan.duration === "Monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (plan.duration === "Yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else if (plan.duration === "Lifetime") {
    endDate.setFullYear(endDate.getFullYear() + 100);
  }
  return endDate;
};

const activateMerchantOrder = async (order, plan, paymentId) => {
  const merchant = await Merchant.findById(order.merchantId);
  if (!merchant) {
    throw new Error("Merchant not found for paid order");
  }

  const startDate = new Date();
  const endDate = merchantEndDate(plan, startDate);

  if (order.planType === "advertisement") {
    // Each ad purchase is its own record and never touches the core membership.
    await MerchantSubscription.create({
      userId: order.userId,
      merchantId: merchant._id,
      planId: plan._id,
      amount: order.amount,
      status: "active",
      startDate,
      endDate,
      paymentId,
      orderId: order.orderId,
      planType: "advertisement",
    });
    return;
  }

  // Use the listPrice/walletDiscount locked in when the order was created, not a
  // fresh computeSubscriptionCharge() - the wallet may have changed since, and
  // what was actually charged must not drift.
  const { amount, listPrice, walletDiscountApplied } = order;

  const subscription = await MerchantSubscription.findOneAndUpdate(
    { merchantId: merchant._id, planType: { $ne: "advertisement" } },
    {
      userId: order.userId,
      merchantId: merchant._id,
      planId: plan._id,
      amount,
      listPrice,
      walletDiscountApplied,
      status: "active",
      startDate,
      endDate,
      paymentId,
      orderId: order.orderId,
      planType: "merchant",
    },
    { upsert: true, returnDocument: "after" },
  );

  await Merchant.findByIdAndUpdate(merchant._id, { subscriptionPlanId: plan._id });

  await applySubscriptionWalletEffects({
    merchantDoc: merchant,
    plan,
    listPrice,
    walletDiscount: walletDiscountApplied,
    subscriptionId: subscription._id,
  });

  // The feed hides stores without a running membership, so a renewal should
  // show up straight away rather than after the cache TTL.
  invalidateFeedCache({ city: merchant.city || "" });
};

const activateCustomerOrder = async (order, plan, paymentId) => {
  const startDate = new Date();
  await CustomerSubscription.findOneAndUpdate(
    { userId: order.userId },
    {
      userId: order.userId,
      planId: plan._id,
      amount: order.amount,
      status: "active",
      startDate,
      endDate: computeSubscriptionEndDate(plan.duration, startDate),
      paymentId,
      orderId: order.orderId,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

/**
 * Claims a `created` SubscriptionOrder matching `filter` and activates what it
 * paid for. Resolves to `{ order, plan }` on success, or `null` when there was
 * nothing to claim (already activated, or another request is doing it now). If
 * activation throws, the order is released so a retry - the webhook, or the
 * user hitting verify again - can finish the job instead of the payment being
 * stranded.
 */
export const claimAndActivateOrder = async (filter, paymentId) => {
  const order = await SubscriptionOrder.findOneAndUpdate(
    { ...filter, status: "created" },
    { status: "consumed" },
    { new: true },
  );
  if (!order) return null;

  try {
    const plan = await Plan.findById(order.planId);
    if (!plan) {
      throw new Error(`Plan ${order.planId} not found for paid order ${order.orderId}`);
    }

    if (order.planType === "customer") {
      await activateCustomerOrder(order, plan, paymentId);
    } else {
      await activateMerchantOrder(order, plan, paymentId);
    }
    return { order, plan };
  } catch (err) {
    await SubscriptionOrder.updateOne({ _id: order._id }, { status: "created" });
    throw err;
  }
};
