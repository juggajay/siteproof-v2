import { useState, useEffect } from 'react';

interface MobileDetection {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  orientation: 'portrait' | 'landscape';
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Custom hook for comprehensive mobile detection and responsive behavior
 */
export function useMobileDetection(): MobileDetection {
  const [detection, setDetection] = useState<MobileDetection>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        isIOS: false,
        isAndroid: false,
        isPWA: false,
        orientation: 'portrait',
        viewportWidth: 1920,
        viewportHeight: 1080,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const userAgent = navigator.userAgent.toLowerCase();

    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isIOS: /iphone|ipad|ipod/.test(userAgent),
      isAndroid: /android/.test(userAgent),
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
      orientation: width > height ? 'landscape' : 'portrait',
      viewportWidth: width,
      viewportHeight: height,
    };
  });

  useEffect(() => {
    const updateDetection = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();

      setDetection({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isIOS: /iphone|ipad|ipod/.test(userAgent),
        isAndroid: /android/.test(userAgent),
        isPWA: window.matchMedia('(display-mode: standalone)').matches,
        orientation: width > height ? 'landscape' : 'portrait',
        viewportWidth: width,
        viewportHeight: height,
      });
    };

    // Update on resize and orientation change
    window.addEventListener('resize', updateDetection);
    window.addEventListener('orientationchange', updateDetection);

    // Initial update
    updateDetection();

    return () => {
      window.removeEventListener('resize', updateDetection);
      window.removeEventListener('orientationchange', updateDetection);
    };
  }, []);

  return detection;
}

/**
 * Breakpoint constants for consistent responsive design
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Touch target size constants (following WCAG guidelines)
 */
export const TOUCH_TARGETS = {
  minimum: 44, // WCAG AA standard
  recommended: 48, // Material Design recommendation
  comfortable: 56, // Enhanced mobile experience
} as const;
