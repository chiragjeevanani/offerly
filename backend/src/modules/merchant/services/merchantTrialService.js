import Plan from '../../admin/models/Plan.js';
import Merchant from '../models/Merchant.js';
import MerchantSubscription from '../../payment/models/MerchantSubscription.js';
import { notifyMerchant } from '../../user/services/notificationService.js';

// Every new merchant gets one free month of this plan the moment they finish
// registration (admin approval is a fallback for anyone who somehow missed it).
// The trial costs nothing and - unlike a paid purchase - credits nothing
// to the discount wallet; admins can top the wallet up by hand if they want.
export const WELCOME_TRIAL_PLAN_NAME = 'Visible';
export const WELCOME_TRIAL_MONTHS = 1;

const findTrialPlan = () =>
  Plan.findOne({
    name: { $regex: `^${WELCOME_TRIAL_PLAN_NAME}$`, $options: 'i' },
    planType: { $ne: 'advertisement' },
  }).sort({ status: 1 }); // 'active' sorts before 'inactive'

/**
 * Starts the welcome trial for a newly approved merchant. No-op (returns null)
 * if they've had a trial or any membership before, so re-approving a merchant
 * never hands out a second free month.
 */
export const grantWelcomeTrial = async (merchant) => {
  if (!merchant || merchant.hasUsedFreeTrial) return null;

  const hadMembership = await MerchantSubscription.exists({
    merchantId: merchant._id,
    planType: { $ne: 'advertisement' },
  });
  if (hadMembership) return null;

  const plan = await findTrialPlan();
  if (!plan) {
    console.error(`[Trial] No "${WELCOME_TRIAL_PLAN_NAME}" plan found - merchant ${merchant._id} approved without a trial.`);
    return null;
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + WELCOME_TRIAL_MONTHS);

  const subscription = await MerchantSubscription.create({
    userId: merchant.ownerId || merchant._id,
    merchantId: merchant._id,
    planId: plan._id,
    amount: 0,
    listPrice: Number(plan.price || 0),
    walletDiscountApplied: 0,
    status: 'active',
    startDate,
    endDate,
    planType: 'merchant',
    isTrial: true,
  });

  await Merchant.findByIdAndUpdate(merchant._id, { subscriptionPlanId: plan._id, hasUsedFreeTrial: true });

  try {
    await notifyMerchant(merchant._id.toString(), {
      title: 'Your free trial has started 🎁',
      body: `Enjoy ${WELCOME_TRIAL_MONTHS} month of the ${plan.name} plan free, until ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      type: 'payment',
      data: { subscriptionId: subscription._id.toString() },
      link: '/merchant/subscription',
    });
  } catch (err) {
    console.error('[Trial] Notification failed (non-blocking):', err);
  }

  return subscription;
};
