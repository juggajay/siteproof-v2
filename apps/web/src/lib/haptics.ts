/**
 * Haptic Feedback Utility
 * Provides tactile feedback for mobile interactions
 */

export function vibrate(pattern: number | number[]): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      // Silently fail if vibration is not supported
      console.debug('Vibration API not supported:', error);
    }
  }
}

export const haptics = {
  /**
   * Light haptic feedback (10ms)
   * Use for: Button clicks, selections, taps
   */
  light: () => vibrate(10),

  /**
   * Medium haptic feedback (20ms)
   * Use for: Toggle switches, checkboxes, radio buttons
   */
  medium: () => vibrate(20),

  /**
   * Heavy haptic feedback (30ms)
   * Use for: Important actions, confirmations
   */
  heavy: () => vibrate(30),

  /**
   * Success pattern (short-pause-short)
   * Use for: Successful form submissions, saved data
   */
  success: () => vibrate([10, 50, 10]),

  /**
   * Error pattern (long-pause-long)
   * Use for: Validation errors, failed actions
   */
  error: () => vibrate([50, 100, 50]),

  /**
   * Warning pattern (medium-pause-medium)
   * Use for: Warnings, confirmations needed
   */
  warning: () => vibrate([20, 50, 20]),

  /**
   * Selection haptic (5ms)
   * Use for: Scrolling through items, swipe actions
   */
  selection: () => vibrate(5),

  /**
   * Double tap pattern
   * Use for: Quick actions, shortcuts
   */
  doubleTap: () => vibrate([10, 30, 10]),

  /**
   * Long press pattern
   * Use for: Context menus, drag start
   */
  longPress: () => vibrate([0, 50, 20]),
};

/**
 * Check if haptic feedback is available
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Hook-style haptic feedback with user preference detection
 */
export function useHaptic() {
  // Check if user prefers reduced motion (accessibility)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    ...haptics,
    isSupported: isHapticSupported(),
    isEnabled: !prefersReducedMotion && isHapticSupported(),
  };
}
