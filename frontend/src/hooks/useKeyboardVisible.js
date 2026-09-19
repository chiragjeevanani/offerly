import { useState, useEffect } from 'react';

/**
 * Custom hook that tracks whether the mobile virtual keyboard is open.
 * Supports iOS (visualViewport shrinks while innerHeight stays same)
 * and Android (visualViewport AND innerHeight both shrink relative to screen height / base height),
 * combined with active input focus tracking.
 */
export const useKeyboardVisible = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Record base height of device viewport
    const getBaseHeight = () => {
      return Math.max(
        window.screen?.availHeight || 0,
        window.screen?.height || 0,
        window.innerHeight || 0
      );
    };

    let baseHeight = getBaseHeight();

    const isEditable = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    };

    const evaluate = () => {
      // Don't flag keyboard on desktop screens (>= 1024px)
      if (window.innerWidth >= 1024) {
        setIsKeyboardOpen(false);
        return;
      }

      const currentInner = window.innerHeight;
      const currentVisual = window.visualViewport ? window.visualViewport.height : currentInner;
      const activeEl = document.activeElement;
      const inputFocused = isEditable(activeEl);

      // On iOS: visualViewport height shrinks while window.innerHeight stays constant
      const isIosKeyboard = currentVisual < currentInner * 0.8;

      // On Android: both innerHeight and visualViewport shrink relative to baseHeight/screen height
      const isAndroidKeyboard = currentVisual < baseHeight * 0.75 || currentInner < baseHeight * 0.75;

      // When an input is focused on mobile and viewport shrinks at all
      const isFocusedShrink = inputFocused && (currentVisual < baseHeight * 0.85 || isIosKeyboard || isAndroidKeyboard);

      setIsKeyboardOpen(Boolean(isIosKeyboard || isAndroidKeyboard || isFocusedShrink));
    };

    const onResize = () => {
      if (!isEditable(document.activeElement)) {
        baseHeight = Math.max(baseHeight, window.innerHeight, window.screen?.height || 0);
      }
      evaluate();
    };

    const onFocusIn = () => {
      setTimeout(evaluate, 100);
      setTimeout(evaluate, 300);
    };

    const onFocusOut = () => {
      setTimeout(evaluate, 100);
      setTimeout(evaluate, 300);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', evaluate);
      window.visualViewport.addEventListener('scroll', evaluate);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('focusout', onFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', evaluate);
        window.visualViewport.removeEventListener('scroll', evaluate);
      }
      window.removeEventListener('resize', onResize);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return isKeyboardOpen;
};

export default useKeyboardVisible;
