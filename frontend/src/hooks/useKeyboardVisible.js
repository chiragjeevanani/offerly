import { useState, useEffect } from 'react';

/**
 * Custom hook that tracks whether the mobile virtual keyboard is open.
 * Uses window.visualViewport API where supported, with window resize fallback.
 */
export const useKeyboardVisible = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkViewport = () => {
      if (window.visualViewport) {
        // When keyboard opens on mobile, visualViewport height shrinks relative to window.innerHeight or screen height
        const isKeyboard = window.visualViewport.height < window.innerHeight * 0.78;
        setIsKeyboardOpen(isKeyboard);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkViewport);
      window.visualViewport.addEventListener('scroll', checkViewport);
    }

    // Secondary fallback using window resize
    const handleWindowResize = () => {
      if (!window.visualViewport) {
        const isSmall = window.innerHeight < (window.screen.availHeight || window.screen.height) * 0.75;
        setIsKeyboardOpen(isSmall);
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', checkViewport);
        window.visualViewport.removeEventListener('scroll', checkViewport);
      }
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  return isKeyboardOpen;
};

export default useKeyboardVisible;
