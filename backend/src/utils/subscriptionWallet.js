import DiscountWalletTransaction from "../modules/payment/models/DiscountWalletTransaction.js";
import WalletSettings from "../modules/admin/models/WalletSettings.js";

// Fraction of a merchant-plan purchase's list price that gets credited back into
// the merchant's discount wallet on every purchase/renewal.
const WALLET_CREDIT_RATE = 0.3;

// Looks up a per-zone price override on the plan. `merchantLike` just needs a
// `zone` field (a City.zones subdocument id, as stored on Merchant.zone) - works
// for a full Merchant doc or a plain { zone } object.
export const getEffectivePlanPrice = (plan, merchantLike = {}) => {
  const basePrice = Number(plan?.price || 0);
  const zoneId = merchantLike?.zone ? String(merchantLike.zone) : "";

  if (!zoneId || !Array.isArray(plan?.zonePricing) || plan.zonePricing.length === 0) {
    return basePrice;
  }

  const override = plan.zonePricing.find((entry) => String(entry?.zoneId || "") === zoneId);
  return override && typeof override.price === "number" ? override.price : basePrice;
};

// Whatever is left in the merchant's wallet is applied first, capped at the
// plan's price - the wallet never expires or resets on its own, it just keeps
// accumulating (and depleting) across cycles.
export const computeSubscriptionCharge = (plan, merchant) => {
  const listPrice = Math.round(getEffectivePlanPrice(plan, merchant));
  const walletBalance = Math.max(0, Number(merchant?.discountWallet?.balance || 0));
  const walletDiscount = Math.round(Math.min(walletBalance, listPrice));
  const payable = Math.max(0, listPrice - walletDiscount);

  return { listPrice, walletDiscount, payable };
};

// Applies the wallet side-effects of a completed merchant-plan purchase/renewal:
// spends the walletDiscount that funded this cycle's payment, then credits 30%
// of the list price back in (for next cycle's discount and for customer
// discounts in the meantime). Mutates and saves `merchantDoc`.
export const applySubscriptionWalletEffects = async ({ merchantDoc, plan, listPrice, walletDiscount, subscriptionId }) => {
  const currentBalance = Math.max(0, Number(merchantDoc.discountWallet?.balance || 0));
  const credit = Math.round(listPrice * WALLET_CREDIT_RATE);
  const afterRedeem = Math.max(0, currentBalance - walletDiscount);
  const newBalance = afterRedeem + credit;

  merchantDoc.discountWallet = merchantDoc.discountWallet || {};
  merchantDoc.discountWallet.balance = newBalance;
  await merchantDoc.save();

  const txns = [];
  if (walletDiscount > 0) {
    txns.push({
      merchantId: merchantDoc._id,
      type: "subscription_redeem",
      amount: walletDiscount,
      balanceAfter: afterRedeem,
      subscriptionId: subscriptionId || null,
      note: `Applied toward ${plan.name} purchase`,
    });
  }
  if (credit > 0) {
    txns.push({
      merchantId: merchantDoc._id,
      type: "subscription_credit",
      amount: credit,
      balanceAfter: newBalance,
      subscriptionId: subscriptionId || null,
      note: `30% credit from ${plan.name} purchase`,
    });
  }
  if (txns.length > 0) {
    await DiscountWalletTransaction.insertMany(txns);
  }

  return { creditAdded: credit, newBalance };
};

export const getWalletSettings = async () => {
  const settings = await WalletSettings.findOne();
  return settings || WalletSettings.create({});
};
