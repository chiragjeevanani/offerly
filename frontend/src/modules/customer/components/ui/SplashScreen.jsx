import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Pixel-perfect Customer Splash Screen for Offerly
 * Immersive edge-to-edge presentation that covers the mobile status bar
 * across native app wrappers (Capacitor/Cordova/WebView), PWAs, and mobile browsers.
 */
const SplashScreen = ({ onFinish, duration = 2200, forceShow = false }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const originalThemeColorRef = useRef(null);

  // Native & Web status bar / fullscreen controls
  const requestImmersiveFullscreen = () => {
    try {
      // 1. Web Fullscreen API: hides system status bar & navigation bar on mobile
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen().catch?.(() => {});
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen().catch?.(() => {});
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen().catch?.(() => {});
      }
    } catch {
      // Browser may enforce user gesture requirement
    }

    try {
      // 2. Native wrapper bridge: Capacitor StatusBar
      if (window.Capacitor?.Plugins?.StatusBar?.hide) {
        window.Capacitor.Plugins.StatusBar.hide().catch?.(() => {});
      }
      // 3. Cordova StatusBar plugin
      if (window.StatusBar?.hide) {
        window.StatusBar.hide();
      }
      // 4. React Native WebView bridge
      if (window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'STATUS_BAR', hidden: true, action: 'hide' })
        );
      }
      // 5. Custom Android WebView JavaScriptInterface
      if (window.Android?.hideStatusBar) {
        window.Android.hideStatusBar();
      } else if (window.Android?.setFullscreen) {
        window.Android.setFullscreen(true);
      }
      if (window.OfferlyApp?.hideStatusBar) {
        window.OfferlyApp.hideStatusBar();
      } else if (window.OfferlyApp?.setFullscreen) {
        window.OfferlyApp.setFullscreen(true);
      }
    } catch {
      // Non-critical native bridge fallback
    }
  };

  const restoreSystemBars = () => {
    try {
      // 1. Exit Web Fullscreen API
      const isFullscreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      if (isFullscreen) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch?.(() => {});
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen().catch?.(() => {});
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen().catch?.(() => {});
        }
      }
    } catch {
      // Ignore
    }

    try {
      // 2. Restore native status bar
      if (window.Capacitor?.Plugins?.StatusBar?.show) {
        window.Capacitor.Plugins.StatusBar.show().catch?.(() => {});
      }
      if (window.StatusBar?.show) {
        window.StatusBar.show();
      }
      if (window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'STATUS_BAR', hidden: false, action: 'show' })
        );
      }
      if (window.Android?.showStatusBar) {
        window.Android.showStatusBar();
      } else if (window.Android?.setFullscreen) {
        window.Android.setFullscreen(false);
      }
      if (window.OfferlyApp?.showStatusBar) {
        window.OfferlyApp.showStatusBar();
      } else if (window.OfferlyApp?.setFullscreen) {
        window.OfferlyApp.setFullscreen(false);
      }
    } catch {
      // Non-critical native bridge fallback
    }

    // 3. Restore original theme-color meta tag
    try {
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme && originalThemeColorRef.current) {
        metaTheme.setAttribute('content', originalThemeColorRef.current);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    // Save original theme-color and adapt to splash screen top background (#FAFEF7)
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      originalThemeColorRef.current = metaTheme.getAttribute('content') || '#5EB929';
      metaTheme.setAttribute('content', '#FAFEF7');
    }

    // Attempt immediate immersive full-screen to cover the phone's status bar
    requestImmersiveFullscreen();

    // In mobile browsers where programmatic requestFullscreen requires a user interaction gesture,
    // any initial touch/tap immediately triggers fullscreen
    const handleGesture = () => {
      requestImmersiveFullscreen();
    };

    window.addEventListener('touchstart', handleGesture, { passive: true, once: true });
    window.addEventListener('pointerdown', handleGesture, { passive: true, once: true });

    return () => {
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('pointerdown', handleGesture);
      restoreSystemBars();
    };
  }, []);

  useEffect(() => {
    // Smooth, realistic loading progress simulation
    const startTime = performance.now();

    const updateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Natural ease: fast initial burst, steady mid-progress, final ease-in to 100%
      let currentProgress;
      if (t < 0.3) {
        currentProgress = (t / 0.3) * 35;
      } else if (t < 0.75) {
        currentProgress = 35 + ((t - 0.3) / 0.45) * 45;
      } else {
        currentProgress = 80 + ((t - 0.75) / 0.25) * 20;
      }

      setProgress(Math.min(Math.round(currentProgress), 100));

      if (t < 1) {
        requestAnimationFrame(updateProgress);
      } else {
        // Short pause at 100% for satisfying visual completion before smooth fade-out
        setTimeout(() => {
          setIsExiting(true);
          restoreSystemBars();
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
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-gradient-to-b from-[#FAFEF7] via-[#F4FBF1] to-[#E2F5DC] select-none overflow-hidden touch-none"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh',
            minHeight: '-webkit-fill-available',
            margin: 0,
            padding: 0,
          }}
          role="dialog"
          aria-label="Offerly loading splash screen"
          onClick={requestImmersiveFullscreen}
        >
          {/* Main splash container: full edge-to-edge coverage across all screen sizes and aspect ratios */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#FAFEF7] via-[#F4FBF1] to-[#E2F5DC]">
            
            {/* Ultra high-resolution Retina splash screen background artwork */}
            <picture className="absolute inset-0 w-full h-full pointer-events-none select-none">
              <source srcSet="/splash-screen-clean@3x.webp?v=6" type="image/webp" />
              <img
                src="/splash-screen-clean@3x.png?v=6"
                alt="Offerly Splash Screen"
                className="w-full h-full object-cover object-center pointer-events-none select-none"
                style={{
                  imageRendering: 'auto',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                }}
                draggable="false"
                loading="eager"
                fetchPriority="high"
                decoding="sync"
              />
            </picture>

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
