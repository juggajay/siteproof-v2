/**
 * Screen Reader Announcement Utilities
 * Provides programmatic announcements for screen readers
 */

export type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Announce a message to screen readers
 * @param message - The message to announce
 * @param priority - The announcement priority (polite or assertive)
 */
export function announce(message: string, priority: AnnouncementPriority = 'polite') {
  if (typeof window !== 'undefined' && (window as any).announceToScreenReader) {
    (window as any).announceToScreenReader(message, priority);
  }
}

/**
 * Announce route change to screen readers
 * @param routeName - The name of the new route
 */
export function announceRouteChange(routeName: string) {
  announce(`Navigated to ${routeName}`, 'polite');
}

/**
 * Announce form validation errors
 * @param errors - Array of error messages
 */
export function announceFormErrors(errors: string[]) {
  if (errors.length === 0) return;

  const message = errors.length === 1
    ? `Error: ${errors[0]}`
    : `${errors.length} errors found: ${errors.join(', ')}`;

  announce(message, 'assertive');
}

/**
 * Announce successful action
 * @param action - The action that was completed
 */
export function announceSuccess(action: string) {
  announce(`Success: ${action}`, 'polite');
}

/**
 * Announce loading state
 * @param isLoading - Whether content is loading
 * @param loadingMessage - Custom loading message
 */
export function announceLoading(isLoading: boolean, loadingMessage = 'Loading content') {
  if (isLoading) {
    announce(loadingMessage, 'polite');
  } else {
    announce('Content loaded', 'polite');
  }
}

/**
 * Announce item count for lists
 * @param count - Number of items
 * @param itemType - Type of items (e.g., "results", "items")
 */
export function announceItemCount(count: number, itemType = 'items') {
  const message = count === 0
    ? `No ${itemType} found`
    : count === 1
      ? `1 ${itemType} found`
      : `${count} ${itemType} found`;

  announce(message, 'polite');
}
