// A phone-style ring that repeats until someone stops it. Used for orders that
// need an answer (a store must accept/reject a delivery order, a partner must
// accept/skip one) - a single chime is too easy to miss.
//
// Browsers only allow sound after the person has touched the page, so the
// first tap anywhere unlocks audio. Until then `isRingBlocked()` is true and
// the alert shows a "tap to turn sound on" hint.

let ctx = null;
let timer = null;
let ringing = false;
const listeners = new Set();
let unlockBound = false;

const ensureContext = () => {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
};

const notify = () => listeners.forEach((fn) => fn());

export const isRingBlocked = () => Boolean(ctx && ctx.state !== 'running') || (!ctx && ringing);

export const subscribeRing = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const tone = (c, freq, start, dur, volume) => {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.015);
  gain.gain.setValueAtTime(volume, start + dur - 0.04);
  gain.gain.linearRampToValueAtTime(0, start + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
};

// Two quick double-rings, then a pause - like an old phone.
const ringOnce = () => {
  const c = ensureContext();
  if (!c) return;
  if (c.state === 'suspended') c.resume().then(notify).catch(() => {});
  if (c.state !== 'running') return notify();
  const t = c.currentTime + 0.02;
  [0, 0.5].forEach((offset) => {
    tone(c, 880, t + offset, 0.16, 0.5);
    tone(c, 1175, t + offset + 0.2, 0.16, 0.5);
  });
  try {
    navigator.vibrate?.([300, 150, 300]);
  } catch {
    /* vibration is optional */
  }
};

const unlock = () => {
  const c = ensureContext();
  if (!c) return;
  const done = () => {
    notify();
    if (ringing && c.state === 'running') ringOnce();
  };
  if (c.state === 'suspended') c.resume().then(done).catch(() => {});
  else done();
};

// Bind once: the first touch/click/key anywhere unlocks sound, and coming back
// to the app (tab visible again) resumes a suspended context.
export const installRingUnlock = () => {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;
  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) => window.addEventListener(evt, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') unlock();
  });
};

export const startRinging = () => {
  installRingUnlock();
  if (ringing) return;
  ringing = true;
  ringOnce();
  timer = setInterval(ringOnce, 2600);
  notify();
};

export const stopRinging = () => {
  if (!ringing) return;
  ringing = false;
  clearInterval(timer);
  timer = null;
  notify();
};

export const isRinging = () => ringing;
