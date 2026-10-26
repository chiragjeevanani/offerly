import DeliveryDutyLog from '../models/DeliveryDutyLog.js';

// Shift rules for delivery partners (DeliverySettings.shifts, per-partner
// DeliveryPartner.shift). A shift day is "missed" when the partner comes online
// after start + grace, never comes online, or is offline during the shift for
// longer than their break. A missed day in a target's period costs that target's
// bonus. Times are IST; a shift whose end is before its start ends the next day.

const IST_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

export const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minutesOf = (hhmm) => {
  const m = HHMM.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// 'YYYY-MM-DD' of the IST day containing `date`.
export const istDateKey = (date) => new Date(date.getTime() + IST_MS).toISOString().slice(0, 10);
const dayStartUtc = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) - IST_MS;
};
const weekdayOf = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
const addDays = (key, n) => istDateKey(new Date(dayStartUtc(key) + n * DAY_MS + 12 * 3600 * 1000));

export const shiftRules = (settings) => {
  const s = settings.shifts || {};
  return {
    enabled: Boolean(s.enabled),
    since: s.since || null,
    graceMinutes: Math.max(0, s.graceMinutes || 0),
    defaultStart: s.defaultStart || '09:00',
    defaultEnd: s.defaultEnd || '21:00',
    defaultBreakMinutes: s.defaultBreakMinutes ?? 15,
  };
};

// The partner's own shift, falling back to the defaults field by field.
export const effectiveShift = (partner, settings) => {
  const rules = shiftRules(settings);
  const own = partner?.shift || {};
  return {
    start: HHMM.test(own.start || '') ? own.start : rules.defaultStart,
    end: HHMM.test(own.end || '') ? own.end : rules.defaultEnd,
    breakMinutes: typeof own.breakMinutes === 'number' ? own.breakMinutes : rules.defaultBreakMinutes,
    offDays: Array.isArray(own.offDays) ? own.offDays : [],
    custom: Boolean(own.start || own.end || typeof own.breakMinutes === 'number' || Array.isArray(own.offDays)),
  };
};

const shiftWindow = (key, shift) => {
  const base = dayStartUtc(key);
  const startMin = minutesOf(shift.start) ?? 0;
  let endMin = minutesOf(shift.end) ?? 24 * 60;
  if (endMin <= startMin) endMin += 24 * 60;
  return { start: new Date(base + startMin * MIN_MS), end: new Date(base + endMin * MIN_MS) };
};

// How one shift day went, from the partner's online/offline log (sorted by time).
// status: off | upcoming | waiting (not online yet, still within grace) |
//         ok | late | absent | over_break      missed = late | absent | over_break
export const evaluateShiftDay = (key, shift, rules, logs, now = new Date()) => {
  if (shift.offDays.includes(weekdayOf(key))) return { date: key, status: 'off', missed: false };
  const { start, end } = shiftWindow(key, shift);
  const base = { date: key, start, end, breakMinutes: shift.breakMinutes, finished: now >= end };
  if (now < start) return { ...base, status: 'upcoming', missed: false };

  const until = new Date(Math.min(now.getTime(), end.getTime()));
  const before = logs.filter((l) => l.at < start);
  let online = before.length ? before[before.length - 1].online : false;
  const inside = logs.filter((l) => l.at >= start && l.at < until);

  let firstOnlineAt = online ? start : null;
  let offSince = null; // an offline stretch after the shift started, if any
  let offMs = 0;
  for (const l of inside) {
    if (l.online && !online) {
      if (!firstOnlineAt) firstOnlineAt = l.at;
      else if (offSince) offMs += l.at - offSince;
      offSince = null;
    } else if (!l.online && online && firstOnlineAt) {
      offSince = l.at;
    }
    online = l.online;
  }
  if (offSince) offMs += until - offSince;

  const graceEnd = new Date(start.getTime() + rules.graceMinutes * MIN_MS);
  if (!firstOnlineAt) {
    const status = now < graceEnd ? 'waiting' : 'absent';
    return { ...base, status, missed: status === 'absent', firstOnlineAt: null, breakUsedMinutes: 0 };
  }
  const breakUsedMinutes = Math.round(offMs / MIN_MS);
  const late = firstOnlineAt > graceEnd;
  const overBreak = offMs > shift.breakMinutes * MIN_MS;
  const status = late ? 'late' : overBreak ? 'over_break' : 'ok';
  return { ...base, status, missed: late || overBreak, firstOnlineAt, breakUsedMinutes, lateByMinutes: late ? Math.round((firstOnlineAt - start) / MIN_MS) : 0 };
};

// The log a run of shift days needs: everything from a day before the first
// (to know whether they were already online) up to now.
const loadLogs = (partnerId, fromKey) =>
  DeliveryDutyLog.find({ partnerId, at: { $gte: new Date(dayStartUtc(fromKey) - DAY_MS) } }).sort({ at: 1 }).select('online at').lean();

// Shift days in [fromKey, today] that count: after shifts were switched on and
// after the partner joined.
const countedDays = (fromKey, rules, partner, now) => {
  const floor = [rules.since, partner?.createdAt].filter(Boolean).map((d) => istDateKey(new Date(d))).sort().pop();
  const today = istDateKey(now);
  const days = [];
  const first = floor && floor > fromKey ? floor : fromKey;
  for (let key = first; key <= today; key = addDays(key, 1)) days.push(key);
  return days;
};

// Today's shift for the partner app and the admin. Null when shifts are off.
export const shiftToday = async (partner, settings, now = new Date()) => {
  const rules = shiftRules(settings);
  if (!rules.enabled) return null;
  const shift = effectiveShift(partner, settings);
  const today = istDateKey(now);
  const logs = await loadLogs(partner._id, today);
  return { ...effectiveShiftView(shift), graceMinutes: rules.graceMinutes, today: evaluateShiftDay(today, shift, rules, logs, now) };
};

const effectiveShiftView = (shift) => ({ start: shift.start, end: shift.end, breakMinutes: shift.breakMinutes, offDays: shift.offDays, custom: shift.custom });

// First missed shift day inside a target's period (window from targetWindow),
// or null. Used to hold back that target's bonus.
export const missedShiftIn = async (partner, settings, window, now = new Date(), logsCache = null) => {
  const rules = shiftRules(settings);
  if (!rules.enabled) return null;
  const shift = effectiveShift(partner, settings);
  const days = countedDays(istDateKey(window.start), rules, partner, now).filter((k) => dayStartUtc(k) < window.end.getTime());
  if (!days.length) return null;
  const logs = logsCache || (await loadLogs(partner._id, days[0]));
  for (const key of days) {
    const day = evaluateShiftDay(key, shift, rules, logs, now);
    if (day.missed) return day;
  }
  return null;
};

// Loads the log once for the longest of several windows (a partner's daily,
// weekly and monthly targets share it).
export const loadDutyLogsSince = (partnerId, date) => loadLogs(partnerId, istDateKey(date));

// Records partners going on/off duty. Never throws.
export const logDuty = async (partnerIds, online, at = new Date()) => {
  const ids = (Array.isArray(partnerIds) ? partnerIds : [partnerIds]).filter(Boolean);
  if (!ids.length) return;
  try {
    await DeliveryDutyLog.insertMany(ids.map((partnerId) => ({ partnerId, online, at })), { ordered: false });
  } catch (err) {
    console.error('[Delivery] Duty log failed:', err.message);
  }
};
