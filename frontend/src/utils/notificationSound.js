/**
 * Notification Sound Utility
 * 
 * Custom notification sound generator using Web Audio API.
 * Generates a pleasant two-tone chime programmatically — no external file needed.
 * 
 * To remove: Simply delete this file and remove imports from Bookings.jsx
 */

let audioContext = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Play a notification chime sound.
 * Generates a two-tone ascending chime using Web Audio API.
 * 
 * @param {Object} options
 * @param {number} options.volume - Volume from 0 to 1 (default 0.3)
 * @param {string} options.type - Sound type: 'chime' | 'ding' | 'alert' (default 'chime')
 */
export const playNotificationSound = ({ volume = 0.3, type = 'chime' } = {}) => {
  try {
    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    const playTone = (frequency, startTime, duration, gainValue = volume) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    switch (type) {
      case 'ding':
        // Single bright ding
        playTone(880, now, 0.5, volume);
        playTone(1760, now, 0.3, volume * 0.3);
        break;

      case 'alert':
        // Attention-grabbing double beep
        playTone(660, now, 0.15, volume);
        playTone(880, now + 0.2, 0.15, volume);
        playTone(660, now + 0.4, 0.15, volume);
        playTone(880, now + 0.6, 0.3, volume);
        break;

      case 'chime':
      default:
        // Pleasant two-tone ascending chime (default)
        playTone(523.25, now, 0.3, volume);         // C5
        playTone(659.25, now + 0.15, 0.4, volume);  // E5
        playTone(783.99, now + 0.3, 0.5, volume * 0.7); // G5 (softer)
        break;
    }
  } catch (e) {
    // Gracefully fail — audio is non-critical
    console.warn('Notification sound failed:', e.message);
  }
};

export default playNotificationSound;
