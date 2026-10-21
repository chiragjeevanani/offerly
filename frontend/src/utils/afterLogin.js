// Where a logged-out customer was headed (e.g. a shared store link), so login /
// signup can take them there instead of Home. Kept in localStorage because the
// signup flow can span OTP screens; expires after an hour so a stale link from
// days ago doesn't hijack a later login.
const KEY = 'offerly_after_login';
const TTL_MS = 60 * 60 * 1000;

export const rememberAfterLogin = (path) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // Storage blocked - they just land on Home after login.
  }
};

// The OTP screen can finish twice (auto-submit on the 6th digit plus a tap on
// Verify); the second call must get the same answer, not fall back to Home.
let lastTaken = null;

// The remembered path (cleared from storage), or `fallback`.
export const takeAfterLogin = (fallback = '/home') => {
  if (lastTaken && Date.now() - lastTaken.at < 10 * 1000) return lastTaken.path;
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved?.path?.startsWith('/') && Date.now() - saved.at < TTL_MS) {
      lastTaken = { path: saved.path, at: Date.now() };
      return saved.path;
    }
  } catch {
    // Unreadable - fall through.
  }
  return fallback;
};
