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
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-white select-none overflow-hidden touch-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 15%, #F0FAF0 0%, #FFFFFF 75%)'
          }}
          role="dialog"
          aria-label="Offerly loading splash screen"
        >
          {/* Main mobile screen container preserving exact 334:668 aspect ratio */}
          <div className="relative h-full max-h-[100dvh] aspect-[334/668] max-w-[100vw] flex items-center justify-center shadow-2xl md:shadow-emerald-900/10 md:rounded-3xl md:overflow-hidden bg-white">
            
            {/* High-resolution clean splash screen background artwork */}
            <img
              src="/splash-screen-clean@3x.png"
              alt="Offerly Splash Screen"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              draggable="false"
              loading="eager"
            />

            {/* Pixel-perfect interactive loading bar positioned at exact Y: 92.51% */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-[37.4%] flex flex-col items-center pointer-events-none"
              style={{ top: '92.4%' }}
            >
              {/* Track */}
              <div 
                className="w-full h-[5px] bg-[#DCDCDC] rounded-full overflow-hidden relative shadow-[inset_0_1px_1px_rgba(0,0,0,0.06)]"
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
                    backgroundColor: '#3FB712',
                    boxShadow: '0 0 6px rgba(63, 183, 18, 0.45)',
                  }}
                  transition={{ ease: 'linear', duration: 0.05 }}
                />
              </div>
            </div>

            {/* Subtitle Caption positioned at exact Y: 95.66% */}
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{ top: '95.6%' }}
            >
              <p className="text-[7.5px] sm:text-[8.5px] tracking-[0.18em] font-semibold text-[#8E9790] uppercase whitespace-nowrap opacity-90 transition-opacity">
                LOADING A BETTER LOCAL SHOPPING EXPERIENCE...
              </p>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
