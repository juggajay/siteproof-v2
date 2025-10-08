'use client';

import { useEffect } from 'react';

/**
 * Focus Visible Polyfill
 * Adds .focus-visible class for keyboard navigation focus styles
 */
export function FocusVisible() {
  useEffect(() => {
    let hadKeyboardEvent = false;
    let isInitialized = false;

    const detectKeyboard = () => {
      hadKeyboardEvent = true;
    };

    const detectMouse = () => {
      hadKeyboardEvent = false;
    };

    const handleFocus = (e: FocusEvent) => {
      if (hadKeyboardEvent) {
        (e.target as HTMLElement).classList.add('focus-visible');
      }
    };

    const handleBlur = (e: FocusEvent) => {
      (e.target as HTMLElement).classList.remove('focus-visible');
    };

    if (!isInitialized) {
      document.addEventListener('keydown', detectKeyboard, true);
      document.addEventListener('mousedown', detectMouse, true);
      document.addEventListener('focus', handleFocus, true);
      document.addEventListener('blur', handleBlur, true);
      isInitialized = true;
    }

    return () => {
      document.removeEventListener('keydown', detectKeyboard, true);
      document.removeEventListener('mousedown', detectMouse, true);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  return null;
}
