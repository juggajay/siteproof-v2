'use client';

import { useEffect, useRef } from 'react';

/**
 * Screen Reader Live Region Announcer
 * Provides accessible announcements for dynamic content changes
 */
export function ScreenReaderAnnouncer() {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Global announce function
    (window as any).announceToScreenReader = (
      message: string,
      priority: 'polite' | 'assertive' = 'polite'
    ) => {
      const element = priority === 'assertive' ? assertiveRef.current : politeRef.current;
      if (element) {
        element.textContent = message;
        // Clear after announcement
        setTimeout(() => {
          element.textContent = '';
        }, 1000);
      }
    };

    return () => {
      delete (window as any).announceToScreenReader;
    };
  }, []);

  return (
    <>
      <div
        ref={politeRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
      <div
        ref={assertiveRef}
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      />
    </>
  );
}
