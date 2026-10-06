// Client-side mirror of backend/src/utils/businessHours.js, used only for the
// "opens/closes automatically at ..." hint. The backend cron is what actually
// flips the store.
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const toMinutes = (hhmm) => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const schedule = (hours, day) => {
  const h = hours?.[day];
  if (!h || h.isClosed) return null;
  const open = toMinutes(h.open);
  const close = toMinutes(h.close);
  if (open === null || close === null || open === close) return null;
  return { open, close, openLabel: h.open, closeLabel: h.close, overnight: close < open };
};

const fmt = (hhmm) => {
  const [H, M] = hhmm.split(':').map(Number);
  const suffix = H >= 12 ? 'PM' : 'AM';
  return `${((H + 11) % 12) + 1}:${String(M).padStart(2, '0')} ${suffix}`;
};

/**
 * Describes the next automatic change, e.g. "Closes automatically at 9:00 PM"
 * or "Opens automatically Mon 9:00 AM". Returns null when no hours are set.
 */
export const nextAutoChange = (hours, now = new Date()) => {
  const dayIdx = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = schedule(hours, DAYS[dayIdx]);
  const yesterday = schedule(hours, DAYS[(dayIdx + 6) % 7]);

  if (yesterday?.overnight && minutes < yesterday.close) return `Closes automatically at ${fmt(yesterday.closeLabel)}`;
  if (today) {
    const openNow = today.overnight ? minutes >= today.open : minutes >= today.open && minutes < today.close;
    if (openNow) return `Closes automatically at ${fmt(today.closeLabel)}`;
    if (minutes < today.open) return `Opens automatically at ${fmt(today.openLabel)}`;
  }
  for (let i = 1; i <= 7; i++) {
    const day = DAYS[(dayIdx + i) % 7];
    const s = schedule(hours, day);
    if (s) {
      const when = i === 1 ? 'tomorrow' : day.charAt(0).toUpperCase() + day.slice(1, 3);
      return `Opens automatically ${when} ${fmt(s.openLabel)}`;
    }
  }
  return null;
};
