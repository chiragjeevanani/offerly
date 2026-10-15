import IncentiveSettings from '../../admin/models/IncentiveSettings.js';
import WalletSettings from '../../admin/models/WalletSettings.js';
import Redemption from '../../booking/models/Redemption.js';
import User from '../models/User.js';

export const BONUS_TYPES = ['newUser', 'returning', 'welcomeBack', 'loyal', 'specialDay'];

export const BONUS_LABELS = {
  newUser: 'New User Bonus',
  returning: 'Returning User Bonus',
  welcomeBack: 'Welcome Back Bonus',
  loyal: 'Loyal Customer Bonus',
  specialDay: 'Special Day Bonus',
};

const DAY_MS = 24 * 60 * 60 * 1000;

// The single settings document. Created on first use; the new-user bonus is
// seeded from the old flat "new-customer wallet discount" so nothing changes
// for customers until the admin edits it.
export const getIncentiveSettings = async () => {
  const existing = await IncentiveSettings.findOne();
  if (existing) return existing;

  const legacy = await WalletSettings.findOne().lean();
  const legacyAmount = Math.max(0, Number(legacy?.newUserDiscountAmount || 0));
  return IncentiveSettings.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        'bonuses.newUser': {
          enabled: legacyAmount > 0,
          discountType: 'flat',
          value: legacyAmount,
          maxDiscount: 0,
          minOrderValue: 0,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// YYYY-MM-DD of `date` in India
export const istDateString = (date) => new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Rupees off `subtotal` under one bonus rule, before the store-wallet cap.
export const bonusAmountFor = (rule, subtotal) => {
  if (!rule?.enabled || !(subtotal > 0)) return 0;
  if (subtotal < (rule.minOrderValue || 0)) return 0;
  let amount =
    rule.discountType === 'percent'
      ? (subtotal * Math.min(100, rule.value || 0)) / 100
      : rule.value || 0;
  if (rule.discountType === 'percent' && rule.maxDiscount > 0) amount = Math.min(amount, rule.maxDiscount);
  return Math.max(0, Math.round(Math.min(amount, subtotal)));
};

const isBirthdayWindow = (dob, windowDays, now) => {
  if (!dob) return false;
  const birth = istDateString(dob).slice(5); // MM-DD
  for (let d = -windowDays; d <= windowDays; d += 1) {
    if (istDateString(now.getTime() + d * DAY_MS).slice(5) === birth) return true;
  }
  return false;
};

// The occasion running today (IST), if any
const activeOccasion = (occasions = [], now) => {
  const today = istDateString(now);
  return occasions.find((o) => o.startDate <= today && today <= o.endDate) || null;
};

// Which bonuses this customer qualifies for right now, ignoring order value.
// Visits are completed redemptions anywhere on Offerly.
const qualifyingBonuses = async (customerId, settings, now) => {
  const b = settings.bonuses;
  const cooldownDays = b.returning?.enabled ? b.returning.cooldownDays || 0 : 0;
  const [visits, last, user, recentReturning] = await Promise.all([
    Redemption.countDocuments({ customerId, status: 'completed' }),
    Redemption.findOne({ customerId, status: 'completed' }).sort({ createdAt: -1 }).select('scannedAt updatedAt createdAt').lean(),
    b.specialDay?.enabled && b.specialDay.birthday ? User.findById(customerId).select('dob').lean() : null,
    // A Returning bonus on a live or completed pass within the gap blocks another
    cooldownDays > 0
      ? Redemption.exists({
          customerId,
          status: { $in: ['pending', 'completed'] },
          'totals.bonusType': 'returning',
          createdAt: { $gte: new Date(now.getTime() - cooldownDays * DAY_MS) },
        })
      : null,
  ]);

  const found = [];
  if (visits === 0) found.push({ type: 'newUser' });
  if (visits >= 1 && !recentReturning) found.push({ type: 'returning' });
  if (visits >= (b.loyal?.minVisits || Infinity)) found.push({ type: 'loyal' });
  if (visits >= 1 && last) {
    const lastVisit = new Date(last.scannedAt || last.updatedAt || last.createdAt);
    if (now - lastVisit >= (b.welcomeBack?.inactiveDays || 30) * DAY_MS) found.push({ type: 'welcomeBack' });
  }
  if (b.specialDay?.enabled) {
    const occasion = activeOccasion(b.specialDay.occasions, now);
    if (b.specialDay.birthday && isBirthdayWindow(user?.dob, b.specialDay.birthdayWindowDays || 0, now)) {
      found.push({ type: 'specialDay', label: 'Birthday Bonus' });
    } else if (occasion) {
      found.push({ type: 'specialDay', label: `${occasion.name} Bonus` });
    }
  }
  return found;
};

// The one Distribution Fund bonus for this order: the biggest the customer
// qualifies for, capped by the store's discount wallet and the order value.
// Returns null when nothing applies.
export const evaluateCustomerBonus = async (args) => (await evaluateBonusOptions(args)).best;

// The bonus that applies now (`best`), and the nearest bigger one the customer
// would unlock by spending more (`next`): { label, minOrderValue, amount, gain }.
// `gain` is the extra rupees off versus what they get now, at that minimum.
export const evaluateBonusOptions = async ({ customerId, merchantDoc, subtotal, settings, now = new Date() }) => {
  const none = { best: null, next: null };
  const config = settings || (await getIncentiveSettings());
  const walletBalance = Math.max(0, Math.round(Number(merchantDoc?.discountWallet?.balance || 0)));
  if (!(subtotal > 0) || walletBalance <= 0) return none;
  if (!BONUS_TYPES.some((t) => config.bonuses[t]?.enabled)) return none;

  let best = null;
  const qualifying = await qualifyingBonuses(customerId, config, now);
  for (const q of qualifying) {
    const rule = config.bonuses[q.type];
    const amount = bonusAmountFor(rule, subtotal);
    if (amount > 0 && (!best || amount > best.amount)) {
      best = {
        type: q.type,
        label: q.label || BONUS_LABELS[q.type],
        amount,
        rule: {
          discountType: rule.discountType,
          value: rule.value,
          maxDiscount: rule.maxDiscount,
          minOrderValue: rule.minOrderValue,
        },
      };
    }
  }
  if (best) best.amount = Math.min(best.amount, walletBalance);
  const current = best && best.amount > 0 ? best.amount : 0;

  let next = null;
  for (const q of qualifying) {
    const rule = config.bonuses[q.type];
    const target = Math.round(rule?.minOrderValue || 0);
    if (!rule?.enabled || target <= subtotal) continue;
    const amount = Math.min(bonusAmountFor(rule, target), walletBalance);
    const gain = amount - current;
    if (gain <= 0) continue;
    if (!next || target < next.minOrderValue || (target === next.minOrderValue && gain > next.gain)) {
      next = { type: q.type, label: q.label || BONUS_LABELS[q.type], minOrderValue: target, amount, gain };
    }
  }
  return { best: current > 0 ? best : null, next };
};

// Most credits a customer may spend on an order: none below the admin's
// minimum order value, and never more than the per-order cap (0 = no cap).
export const allowedCreditSpend = (settings, subtotal, payable) => {
  const rules = settings?.credits || {};
  if (subtotal < (rules.minOrderValue || 0)) return 0;
  const cap = rules.maxPerOrder > 0 ? rules.maxPerOrder : Infinity;
  return Math.max(0, Math.floor(Math.min(payable, cap)));
};

// What the customer app needs to explain the rules
export const publicIncentiveRules = (settings) => ({
  referral: {
    enabled: settings.referral.enabled,
    referrerBonus: settings.referral.referrerBonus,
    referredBonus: settings.referral.referredBonus,
    minOrderValue: settings.referral.minOrderValue,
  },
  credits: {
    minOrderValue: settings.credits.minOrderValue,
    maxPerOrder: settings.credits.maxPerOrder,
  },
});
