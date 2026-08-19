// Shared constants and helpers for merchant analytics.
//
// Two things kept biting us before this file existed:
//   1. Status filters were hand-written per query and drifted (a phantom "redeemed"
//      status was filtered on in three places, and "active" in a fourth - neither is
//      part of the Redemption enum, so those filters silently matched nothing).
//   2. Date grouping ran in UTC, which files every sale before 05:30 IST under the
//      previous day. "Today" is the headline number in the merchant dashboard, so
//      every aggregation has to group in the merchant's local timezone.

// Reporting timezone. All day/hour bucketing is done here, not in UTC.
export const REPORT_TIMEZONE = "Asia/Kolkata";

// A redemption only counts towards revenue/analytics once the merchant has scanned it.
// Mirrors the `status` enum on booking/models/Redemption.js.
export const COMPLETED_STATUSES = ["completed"];

// Awaiting a scan.
export const PENDING_STATUSES = ["pending"];

const MINUTES = 60 * 1000;

/**
 * Offset of REPORT_TIMEZONE from UTC, in milliseconds, for a given instant.
 * Derived from Intl rather than hardcoded so DST-observing zones keep working if
 * REPORT_TIMEZONE ever changes.
 */
const timezoneOffsetMs = (date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const lookup = {};
  for (const part of parts) {
    lookup[part.type] = part.value;
  }

  // `hour` comes back as "24" at midnight under hour12:false in some runtimes.
  const hour = lookup.hour === "24" ? "00" : lookup.hour;

  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(hour),
    Number(lookup.minute),
    Number(lookup.second),
  );

  return asUtc - date.getTime();
};

/**
 * Start of the local day containing `reference`, returned as a UTC Date suitable
 * for a Mongo range query.
 */
export const startOfLocalDay = (reference = new Date()) => {
  const offset = timezoneOffsetMs(reference);
  const shifted = new Date(reference.getTime() + offset);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offset);
};

export const addDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

export const addMonths = (date, months) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

/**
 * Resolve a `YYYY-MM` string (or nothing, meaning the current month) into the
 * UTC instants bounding that month in REPORT_TIMEZONE.
 */
export const resolveMonthRange = (monthKey) => {
  const now = new Date();
  let year;
  let month; // 0-indexed

  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ""));

  if (match) {
    year = Number(match[1]);
    month = Number(match[2]) - 1;
  } else {
    // Current month *in the reporting timezone*, which can differ from the UTC month.
    const localNow = new Date(now.getTime() + timezoneOffsetMs(now));
    year = localNow.getUTCFullYear();
    month = localNow.getUTCMonth();
  }

  if (!Number.isFinite(year) || month < 0 || month > 11) {
    return resolveMonthRange(null);
  }

  const naiveStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const start = new Date(naiveStart.getTime() - timezoneOffsetMs(naiveStart));

  const naiveEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  const end = new Date(naiveEnd.getTime() - timezoneOffsetMs(naiveEnd));

  const naivePrevStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const previousStart = new Date(naivePrevStart.getTime() - timezoneOffsetMs(naivePrevStart));

  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    label: new Intl.DateTimeFormat("en-IN", {
      timeZone: REPORT_TIMEZONE,
      month: "long",
      year: "numeric",
    }).format(naiveStart),
    start,
    end,
    previousStart,
    previousEnd: start,
    daysInMonth: new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
  };
};

/**
 * `YYYY-MM-DD` key for a date, in the reporting timezone. Used to align the
 * daily series returned by Mongo with the calendar the frontend renders.
 */
export const localDateKey = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

/** Mongo `$dateToString` spec that groups by local calendar day. */
export const localDayGroup = (field = "$createdAt") => ({
  $dateToString: { format: "%Y-%m-%d", date: field, timezone: REPORT_TIMEZONE },
});

/**
 * Percentage change from `previous` to `current`, rounded to one decimal.
 * Returns null when there is no baseline to compare against - the UI shows
 * "new" rather than a meaningless +100%.
 */
export const percentChange = (current, previous) => {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

/** Fill gaps in a sparse daily aggregation so charts get a continuous series. */
export const buildDailySeries = (start, end, rows, fields) => {
  const byDay = new Map(rows.map((row) => [row._id, row]));
  const series = [];

  for (let cursor = new Date(start); cursor < end; cursor = addDays(cursor, 1)) {
    const key = localDateKey(cursor);
    const row = byDay.get(key);
    const point = { date: key };

    for (const field of fields) {
      point[field] = Number(row?.[field] || 0);
    }

    series.push(point);
  }

  return series;
};

/** Age bands used across the demographics breakdown. */
export const AGE_BANDS = [
  { label: "18-24", min: 18, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45-54", min: 45, max: 54 },
  { label: "55+", min: 55, max: 200 },
];

export const UNKNOWN_BUCKET = "Not shared";

/** Normalises the loosely-validated User.gender values into display buckets. */
export const normalizeGender = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";
  if (normalized === "other") return "Other";
  return UNKNOWN_BUCKET;
};

/** Age from an explicit `age` field, falling back to `dob`. */
export const resolveAge = (user) => {
  if (Number.isFinite(user?.age) && user.age > 0) return user.age;
  if (!user?.dob) return null;

  const dob = new Date(user.dob);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }

  return age > 0 && age < 120 ? age : null;
};

export const ageBandFor = (age) => {
  if (age === null || age === undefined) return UNKNOWN_BUCKET;
  const band = AGE_BANDS.find((entry) => age >= entry.min && age <= entry.max);
  return band ? band.label : UNKNOWN_BUCKET;
};

/** Dedupe window for offer view events, in milliseconds. */
export const VIEW_DEDUPE_WINDOW_MS = 30 * MINUTES;

/**
 * Bucket key that collapses repeat views of the same offer by the same
 * person into one countable view per VIEW_DEDUPE_WINDOW_MS.
 */
export const viewBucketFor = (date = new Date()) =>
  Math.floor(date.getTime() / VIEW_DEDUPE_WINDOW_MS);
