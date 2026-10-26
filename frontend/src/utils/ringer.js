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

// Inside the Offerly Android app the ring is handed to the app, which plays it
// on the phone's ALARM channel: it ignores the media volume (and silent mode on
// most phones), so a merchant who turned media down still hears new orders. A
// browser can't do that; there the page plays it itself (media volume).
// The app answers `true` when it took over; anything else = keep ringing here.
// Bridges: flutter_inappwebview handler 'offerlyRing', or window.OfferlyNative.ring().
let nativeRinging = false;
const callNative = (action) => {
  try {
    if (window.flutter_inappwebview?.callHandler) return Promise.resolve(window.flutter_inappwebview.callHandler('offerlyRing', action));
    if (typeof window.OfferlyNative?.ring === 'function') return Promise.resolve(window.OfferlyNative.ring(action));
  } catch {
    /* no app bridge */
  }
  return Promise.resolve(false);
};

export const isRingBlocked = () => !nativeRinging && Boolean(ctx && ctx.state !== 'running') || (!ctx && ringing);

export const subscribeRing = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// Everything goes through one chain that drives the signal right up to full
// scale: a gain boost into a hard clipper (so stacked tones can't distort into
// mush) and a limiter. The phone's own volume is the only ceiling left.
let master = null;
const masterOut = (c) => {
  if (master && master.context === c) return master;
  const boost = c.createGain();
  boost.gain.value = 3;
  const clip = c.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.max(-1, Math.min(1, x * 1.5));
  }
  clip.curve = curve;
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;
  boost.connect(clip);
  clip.connect(limiter);
  limiter.connect(c.destination);
  master = boost;
  return master;
};

// A bell-like trill: two tones a third apart, switching every 40 ms, in the
// 1.4-2 kHz band the ear is most sensitive to - the loudest-sounding ring for
// the same speaker.
const trill = (c, start, dur) => {
  const out = masterOut(c);
  ['square', 'sawtooth'].forEach((type) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    for (let t = 0, hi = true; t < dur; t += 0.04, hi = !hi) {
      osc.frequency.setValueAtTime(hi ? 1975 : 1480, start + t);
    }
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(1, start + 0.01);
    gain.gain.setValueAtTime(1, start + dur - 0.02);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  });
};

// Brrring - brrring, then a short pause. Repeats every RING_EVERY_MS.
const RING_EVERY_MS = 1800;
const ringOnce = () => {
  const c = ensureContext();
  if (!c) return;
  if (c.state === 'suspended') c.resume().then(notify).catch(() => {});
  if (c.state !== 'running') return notify();
  const t = c.currentTime + 0.02;
  trill(c, t, 0.6);
  trill(c, t + 0.8, 0.6);
  try {
    navigator.vibrate?.([600, 200, 600]);
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
  timer = setInterval(ringOnce, RING_EVERY_MS);
  notify();
  // Hand it to the app if we're inside it; stop the page's own sound once it confirms.
  callNative('start').then((ok) => {
    if (ok !== true) return;
    if (!ringing) {
      callNative('stop');
      return;
    }
    nativeRinging = true;
    clearInterval(timer);
    timer = null;
    notify();
  }).catch(() => {});
};

export const stopRinging = () => {
  if (!ringing) return;
  ringing = false;
  clearInterval(timer);
  timer = null;
  nativeRinging = false;
  // Always tell the app (a start may still be on its way to it).
  callNative('stop').catch(() => {});
  notify();
};

export const isRinging = () => ringing;
