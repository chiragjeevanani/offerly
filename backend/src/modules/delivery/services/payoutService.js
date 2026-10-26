import { istDateKey } from './shiftService.js';

// When delivery partners may withdraw (DeliverySettings.payouts): once per IST
// day, or once a week on a set weekday. A request belongs to the payout window
// it was made in; there can be one live request per window.

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_MS = 330 * 60 * 1000;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const payoutRules = (settings) => ({
  frequency: settings.payouts?.frequency === 'daily' ? 'daily' : 'weekly',
  weeklyDay: Number.isInteger(settings.payouts?.weeklyDay) ? settings.payouts.weeklyDay : 1,
  minAmount: Math.max(0, Math.round(settings.payouts?.minAmount || 0)),
});

const istWeekday = (now) => new Date(now.getTime() + IST_MS).getUTCDay();
const startOfIstDay = (now) => {
  const ist = new Date(now.getTime() + IST_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_MS);
};

// Is withdrawing open right now, and which window is it? When closed, `opensAt`
// is the start of the next payout day.
export const payoutWindow = (rules, now = new Date()) => {
  const today = istDateKey(now);
  if (rules.frequency === 'daily') return { open: true, key: `daily:${today}` };
  if (istWeekday(now) === rules.weeklyDay) return { open: true, key: `weekly:${today}` };
  const daysAhead = (rules.weeklyDay - istWeekday(now) + 7) % 7 || 7;
  return { open: false, key: null, opensAt: new Date(startOfIstDay(now).getTime() + daysAhead * DAY_MS) };
};

export const scheduleText = (rules) =>
  rules.frequency === 'daily' ? 'once a day' : `once a week, on ${WEEKDAYS[rules.weeklyDay]}`;
