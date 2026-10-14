import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

const SEEN_KEY = 'offerly_guide_seen_v1';

export const hasSeenGuide = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true; // storage blocked: don't show it on every visit
  }
};

const markGuideSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Not fatal: the guide just shows again next time
  }
};

const STEPS = [
  {
    icon: LocalOfferRoundedIcon,
    title: 'Welcome to Offerly',
    body: 'Exclusive deals from shops, cafés and salons near you, all in one app.',
  },
  {
    icon: PlaceRoundedIcon,
    title: 'Find deals near you',
    body: 'We show stores in your city. Tap your location at the top of Home to change it.',
  },
  {
    icon: ShoppingCartRoundedIcon,
    title: 'Add what you want',
    body: 'Open a store and add items to your cart. Offerly discounts are applied in the cart automatically.',
  },
  {
    icon: QrCode2RoundedIcon,
    title: 'Show your QR at the store',
    body: 'Tap “Generate Pickup QR” and show it at the counter. You pay at the store - nothing is paid online.',
  },
  {
    icon: EmojiEventsRoundedIcon,
    title: 'Earn while you shop',
    body: 'Get bonuses on your first visit and on special days, unlock rewards, and earn credits by inviting friends.',
  },
];

// Swipe-through intro to the app. Shown once on Home after signup, and any
// time from Profile -> How Offerly works.
const WelcomeGuide = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const last = step === STEPS.length - 1;
  const { icon: Icon, title, body } = STEPS[step];

  const close = () => {
    markGuideSeen();
    onClose();
  };
  const go = (next) => {
    if (next < 0 || next >= STEPS.length) return;
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col" role="dialog" aria-modal="true" aria-label="How Offerly works">
      <div className="flex justify-end p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {!last && (
          <button onClick={close} className="px-3 py-1.5 text-sm font-semibold text-gray-500">
            Skip
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(step + 1);
              else if (info.offset.x > 60) go(step - 1);
            }}
            className="max-w-sm w-full text-center select-none"
          >
            <div className="mx-auto mb-8 w-36 h-36 rounded-[2.5rem] bg-gradient-to-br from-[#5EB929]/15 to-[#5EB929]/5 flex items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-[#5EB929] text-white flex items-center justify-center shadow-lg shadow-[#5EB929]/30">
                <Icon sx={{ fontSize: 42 }} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-500">{body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-6">
        <div className="flex justify-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              onClick={() => go(i)}
              aria-label={`Step ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-[#5EB929]' : 'w-2 bg-gray-200'}`}
            />
          ))}
        </div>
        <button
          onClick={() => (last ? close() : go(step + 1))}
          className="w-full py-4 rounded-2xl bg-[#5EB929] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#5EB929]/25 active:scale-[0.98] transition-transform"
        >
          {last ? 'Start exploring' : 'Next'}
          {!last && <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default WelcomeGuide;
