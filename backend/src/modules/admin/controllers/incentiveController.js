import Merchant from '../../merchant/models/Merchant.js';
import Redemption from '../../booking/models/Redemption.js';
import DiscountWalletTransaction from '../../payment/models/DiscountWalletTransaction.js';
import User from '../../user/models/User.js';
import IncentiveSettings from '../models/IncentiveSettings.js';
import { BONUS_TYPES, getIncentiveSettings, publicIncentiveRules } from '../../user/services/incentiveService.js';

const MAX_RUPEES = 100000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Builds a $set from the admin's (partial) form, validating every value.
// Throws an Error with a readable message on the first bad value.
const buildUpdate = (body) => {
  const set = {};
  const num = (path, value, { min = 0, max = MAX_RUPEES, integer = true } = {}) => {
    const n = Number(value);
    if (value === '' || value === null || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      throw new Error(`${path} must be a whole number between ${min} and ${max}`);
    }
    set[path] = n;
  };
  const bool = (path, value) => {
    if (typeof value !== 'boolean') throw new Error(`${path} must be true or false`);
    set[path] = value;
  };

  const { referral, credits, bonuses } = body || {};

  if (referral) {
    if ('enabled' in referral) bool('referral.enabled', referral.enabled);
    if ('referrerBonus' in referral) num('referral.referrerBonus', referral.referrerBonus);
    if ('referredBonus' in referral) num('referral.referredBonus', referral.referredBonus);
    if ('minOrderValue' in referral) num('referral.minOrderValue', referral.minOrderValue);
  }

  if (credits) {
    if ('minOrderValue' in credits) num('credits.minOrderValue', credits.minOrderValue);
    if ('maxPerOrder' in credits) num('credits.maxPerOrder', credits.maxPerOrder);
  }

  if (bonuses) {
    for (const type of BONUS_TYPES) {
      const b = bonuses[type];
      if (!b) continue;
      const p = `bonuses.${type}`;
      if ('enabled' in b) bool(`${p}.enabled`, b.enabled);
      if ('discountType' in b) {
        if (!['flat', 'percent'].includes(b.discountType)) throw new Error(`${p}.discountType must be flat or percent`);
        set[`${p}.discountType`] = b.discountType;
      }
      const isPercent = (b.discountType ?? 'flat') === 'percent';
      if ('value' in b) num(`${p}.value`, b.value, isPercent ? { max: 100 } : {});
      if ('maxDiscount' in b) num(`${p}.maxDiscount`, b.maxDiscount);
      if ('minOrderValue' in b) num(`${p}.minOrderValue`, b.minOrderValue);
      if (type === 'welcomeBack' && 'inactiveDays' in b) num(`${p}.inactiveDays`, b.inactiveDays, { min: 1, max: 3650 });
      if (type === 'loyal' && 'minVisits' in b) num(`${p}.minVisits`, b.minVisits, { min: 2, max: 1000 });
      if (type === 'specialDay') {
        if ('birthday' in b) bool(`${p}.birthday`, b.birthday);
        if ('birthdayWindowDays' in b) num(`${p}.birthdayWindowDays`, b.birthdayWindowDays, { max: 15 });
        if ('occasions' in b) {
          if (!Array.isArray(b.occasions) || b.occasions.length > 30) throw new Error('Add up to 30 special days');
          set[`${p}.occasions`] = b.occasions.map((o, i) => {
            const name = String(o?.name || '').trim();
            if (!name || name.length > 60) throw new Error(`Special day ${i + 1} needs a name (up to 60 characters)`);
            if (!DATE_PATTERN.test(o.startDate || '') || !DATE_PATTERN.test(o.endDate || '')) {
              throw new Error(`${name}: pick a start and end date`);
            }
            if (o.endDate < o.startDate) throw new Error(`${name}: the end date is before the start date`);
            return { name, startDate: o.startDate, endDate: o.endDate };
          });
        }
      }
    }
  }
  return set;
};

// @route GET /admin/incentive-settings
export const getIncentiveSettingsConfig = async (req, res) => {
  try {
    const settings = await getIncentiveSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load settings' });
  }
};

// @route PUT /admin/incentive-settings
export const updateIncentiveSettingsConfig = async (req, res) => {
  let set;
  try {
    set = buildUpdate(req.body);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  try {
    const current = await getIncentiveSettings();
    const settings = await IncentiveSettings.findByIdAndUpdate(current._id, { $set: set }, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
};

// @route GET /admin/incentive-summary
// How much is in the fund (all store wallets), how much has gone to customers,
// split by bonus, and how many customers joined through a referral.
export const getIncentiveSummary = async (req, res) => {
  try {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [fund, paidAll, paid30, byBonus, referredUsers] = await Promise.all([
      Merchant.aggregate([
        { $group: { _id: null, balance: { $sum: { $ifNull: ['$discountWallet.balance', 0] } }, stores: { $sum: { $cond: [{ $gt: ['$discountWallet.balance', 0] }, 1, 0] } } } },
      ]),
      DiscountWalletTransaction.aggregate([
        { $match: { type: 'customer_discount_debit' } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      DiscountWalletTransaction.aggregate([
        { $match: { type: 'customer_discount_debit', createdAt: { $gte: since30 } } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Redemption.aggregate([
        { $match: { status: 'completed', 'totals.walletDiscount': { $gt: 0 } } },
        {
          $group: {
            _id: { $cond: [{ $in: [{ $ifNull: ['$totals.bonusType', ''] }, ['', null]] }, 'newUser', '$totals.bonusType'] },
            amount: { $sum: '$totals.walletDiscount' },
            count: { $sum: 1 },
          },
        },
      ]),
      User.countDocuments({ referredBy: { $ne: null } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        fundBalance: fund[0]?.balance || 0,
        storesWithFunds: fund[0]?.stores || 0,
        distributedAllTime: paidAll[0]?.amount || 0,
        distributed30d: paid30[0]?.amount || 0,
        ordersWithBonus30d: paid30[0]?.count || 0,
        byBonus: Object.fromEntries(byBonus.map((b) => [b._id, { amount: b.amount, count: b.count }])),
        referredUsers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load summary' });
  }
};

// @route GET /users/incentive-rules (customers)
export const getPublicIncentiveRules = async (req, res) => {
  try {
    const settings = await getIncentiveSettings();
    res.status(200).json({ success: true, data: publicIncentiveRules(settings) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load rules' });
  }
};
