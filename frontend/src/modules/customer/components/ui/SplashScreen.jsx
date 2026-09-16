import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Pixel-perfect Customer Splash Screen for Offerly
 * Accurately reproduces the client-approved mobile splash design
 * with dynamic animated progress loader bar and seamless dismissal.
 */
const SplashScreen = ({ onFinish, duration = 2200, forceShow = false }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Smooth, realistic loading progress simulation
    const startTime = performance.now();

    const updateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Natural ease: fast initial burst, steady mid-progress, final ease-in to 100%
      let currentProgress;
      if (t < 0.3) {
        // Quick ramp to ~35%
        currentProgress = (t / 0.3) * 35;
      } else if (t < 0.75) {
        // Steady pace to ~80%
        currentProgress = 35 + ((t - 0.3) / 0.45) * 45;
      } else {
        // Smooth finish to 100%
        currentProgress = 80 + ((t - 0.75) / 0.25) * 20;
      }

      setProgress(Math.min(Math.round(currentProgress), 100));

      if (t < 1) {
        requestAnimationFrame(updateProgress);
      } else {
        // Short pause at 100% for satisfying visual completion before smooth fade-out
        setTimeout(() => {
          setIsExiting(true);
        }, 220);
      }
    };

    const animId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animId);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onFinish}>
      {!isExiting && (
        <motion.div
          key="splash-overlay"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.02,
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
          }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#EAF7E8] select-none overflow-hidden touch-none"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          role="dialog"
          aria-label="Offerly loading splash screen"
        >
          {/* Main mobile screen container: Full-bleed on mobile (0 side margins), sleek centered card on desktop */}
          <div className="relative w-full h-full h-[100dvh] md:w-auto md:max-w-[430px] md:h-[92vh] md:max-h-[880px] md:aspect-[576/1024] flex items-center justify-center md:rounded-[36px] md:shadow-[0_25px_70px_rgba(40,120,30,0.2)] md:border md:border-black/5 overflow-hidden bg-[#EAF7E8]">
            
            {/* Ultra high-resolution 2x Retina splash screen background artwork (clean background with no static loader) */}
            <img
              src="/splash-screen-clean@3x.png?v=2"
              alt="Offerly Splash Screen"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
              draggable="false"
              loading="eager"
            />

            {/* Single dynamic interactive loading progress bar */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-[59.2%] pointer-events-none"
              style={{ top: '84.6%', height: '2.1%', maxHeight: '18px', minHeight: '12px' }}
            >
              {/* Pill Track */}
              <div 
                className="w-full h-full rounded-full overflow-hidden relative shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.12)] border border-[#C2E4BF]/70 bg-[#CCE8D2]/80"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {/* Active Green Progress Fill */}
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #5EB929 0%, #3FB712 60%, #369E0F 100%)',
                    boxShadow: '0 0 10px rgba(63, 183, 18, 0.65)',
                  }}
                  transition={{ ease: 'linear', duration: 0.05 }}
                />
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
