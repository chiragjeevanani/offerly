// The customer's "use referral points" choice, made in the cart and read by the
// draft pass screen that actually creates the booking.
const USE_POINTS_KEY = 'offerly_use_referral_points';

export const getUseReferralPoints = () => {
  try { return sessionStorage.getItem(USE_POINTS_KEY) === '1'; } catch { return false; }
};

export const setUseReferralPoints = (value) => {
  try { sessionStorage.setItem(USE_POINTS_KEY, value ? '1' : '0'); } catch { /* storage unavailable */ }
};
