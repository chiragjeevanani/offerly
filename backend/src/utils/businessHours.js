// Business-hours math, always in Asia/Kolkata - the server's clock zone is
// irrelevant (see utils/analytics.js for why UTC bites us here).

export const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (hhmm) => {
  const match = TIME_RE.exec(String(hhmm || ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const daySchedule = (businessHours, day) => {
  const h = businessHours?.[day];
  if (!h || h.isClosed) return null;
  const open = toMinutes(h.open);
  const close = toMinutes(h.close);
  if (open === null || close === null || open === close) return null;
  return { open, close, overnight: close < open };
};

/** Current weekday index (0 = Sunday) and minute-of-day in IST. */
const nowInIST = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { dayIndex, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
};

/** True when the merchant has at least one day with usable open/close times. */
export const hasBusinessHours = (businessHours) => DAYS.some((d) => daySchedule(businessHours, d));

/**
 * Whether the schedule says the store is open at `date`. Handles overnight
 * hours (e.g. 18:00-02:00): the early-morning tail counts against the
 * previous day's schedule.
 */
export const isWithinBusinessHours = (businessHours, date = new Date()) => {
  const { dayIndex, minutes } = nowInIST(date);

  const today = daySchedule(businessHours, DAYS[dayIndex]);
  if (today) {
    if (!today.overnight && minutes >= today.open && minutes < today.close) return true;
    if (today.overnight && minutes >= today.open) return true;
  }

  const yesterday = daySchedule(businessHours, DAYS[(dayIndex + 6) % 7]);
  return Boolean(yesterday?.overnight && minutes < yesterday.close);
};

/** Validates a businessHours payload; returns an error string or null. */
export const validateBusinessHours = (businessHours) => {
  if (!businessHours || typeof businessHours !== 'object') return 'Business hours are required';
  for (const day of DAYS) {
    const h = businessHours[day];
    if (!h) return `Missing hours for ${day}`;
    if (h.isClosed) continue;
    if (toMinutes(h.open) === null || toMinutes(h.close) === null) return `Enter valid open and close times for ${day}`;
    if (h.open === h.close) return `Open and close times can't be the same on ${day}`;
  }
  return null;
};
