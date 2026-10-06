import { describe, it, expect } from 'vitest';
import { isWithinBusinessHours, hasBusinessHours, validateBusinessHours } from '../src/utils/businessHours.js';

const day = (open, close, isClosed = false) => ({ open, close, isClosed });
const week = (h) =>
  Object.fromEntries(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d) => [d, h]));
// 2026-10-06 is a Tuesday. Times are given in IST explicitly.
const at = (iso) => new Date(iso);

describe('isWithinBusinessHours (IST)', () => {
  const nineToSix = week(day('09:00', '18:00'));

  it('is open from opening time up to (not including) closing time', () => {
    expect(isWithinBusinessHours(nineToSix, at('2026-10-06T08:59:00+05:30'))).toBe(false);
    expect(isWithinBusinessHours(nineToSix, at('2026-10-06T09:00:00+05:30'))).toBe(true);
    expect(isWithinBusinessHours(nineToSix, at('2026-10-06T17:59:00+05:30'))).toBe(true);
    expect(isWithinBusinessHours(nineToSix, at('2026-10-06T18:00:00+05:30'))).toBe(false);
  });

  it('uses IST regardless of the server clock zone', () => {
    // 03:30 UTC is 09:00 IST
    expect(isWithinBusinessHours(nineToSix, at('2026-10-06T03:30:00Z'))).toBe(true);
  });

  it('respects closed days', () => {
    const tuesdayOff = { ...nineToSix, tuesday: day('09:00', '18:00', true) };
    expect(isWithinBusinessHours(tuesdayOff, at('2026-10-06T12:00:00+05:30'))).toBe(false);
  });

  it('handles hours that run past midnight', () => {
    const lateNight = week(day('18:00', '02:00'));
    expect(isWithinBusinessHours(lateNight, at('2026-10-07T01:00:00+05:30'))).toBe(true);
    expect(isWithinBusinessHours(lateNight, at('2026-10-07T03:00:00+05:30'))).toBe(false);
    // Tuesday closed: no spill-over into Wednesday morning
    const tuesdayOff = { ...lateNight, tuesday: day('18:00', '02:00', true) };
    expect(isWithinBusinessHours(tuesdayOff, at('2026-10-07T01:00:00+05:30'))).toBe(false);
  });
});

describe('hasBusinessHours / validateBusinessHours', () => {
  it('needs at least one open day to count as configured', () => {
    expect(hasBusinessHours({})).toBe(false);
    expect(hasBusinessHours(week(day('09:00', '18:00', true)))).toBe(false);
    expect(hasBusinessHours(week(day('09:00', '18:00')))).toBe(true);
  });

  it('rejects malformed times and accepts a full week', () => {
    expect(validateBusinessHours(week(day('9', '18')))).not.toBeNull();
    expect(validateBusinessHours(week(day('09:00', '09:00')))).not.toBeNull();
    expect(validateBusinessHours(week(day('09:00', '18:00')))).toBeNull();
  });
});
