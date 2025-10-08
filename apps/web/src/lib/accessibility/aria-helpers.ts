/**
 * ARIA Helper Utilities
 * Provides utilities for accessible components
 */

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix = 'aria') {
  return `${prefix}-${++idCounter}`;
}

/**
 * Get ARIA props for a button with icon
 */
export function getIconButtonProps(label: string, isPressed?: boolean) {
  return {
    'aria-label': label,
    'aria-pressed': isPressed,
    role: 'button',
    tabIndex: 0,
  };
}

/**
 * Get ARIA props for a disclosure widget (accordion, dropdown, etc)
 */
export function getDisclosureProps(
  id: string,
  isExpanded: boolean,
  controls: string
) {
  return {
    id,
    'aria-expanded': isExpanded,
    'aria-controls': controls,
  };
}

/**
 * Get ARIA props for a tab
 */
export function getTabProps(id: string, isSelected: boolean, controls: string) {
  return {
    id,
    role: 'tab',
    'aria-selected': isSelected,
    'aria-controls': controls,
    tabIndex: isSelected ? 0 : -1,
  };
}

/**
 * Get ARIA props for a tab panel
 */
export function getTabPanelProps(id: string, labelledBy: string) {
  return {
    id,
    role: 'tabpanel',
    'aria-labelledby': labelledBy,
    tabIndex: 0,
  };
}

/**
 * Get ARIA props for a list
 */
export function getListProps(label?: string) {
  return {
    role: 'list',
    'aria-label': label,
  };
}

/**
 * Get ARIA props for a list item
 */
export function getListItemProps(index: number, total: number) {
  return {
    role: 'listitem',
    'aria-posinset': index + 1,
    'aria-setsize': total,
  };
}

/**
 * Get ARIA props for a modal/dialog
 */
export function getModalProps(
  titleId: string,
  descriptionId?: string
) {
  return {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    'aria-describedby': descriptionId,
  };
}

/**
 * Get ARIA props for a search input
 */
export function getSearchProps(label = 'Search') {
  return {
    role: 'search',
    'aria-label': label,
  };
}

/**
 * Get ARIA props for navigation
 */
export function getNavigationProps(label = 'Main navigation') {
  return {
    role: 'navigation',
    'aria-label': label,
  };
}

/**
 * Get ARIA props for a loading state
 */
export function getLoadingProps(label = 'Loading') {
  return {
    role: 'status',
    'aria-live': 'polite' as const,
    'aria-label': label,
  };
}

/**
 * Get ARIA props for an alert/error
 */
export function getAlertProps(label?: string) {
  return {
    role: 'alert',
    'aria-live': 'assertive' as const,
    'aria-atomic': true,
    'aria-label': label,
  };
}
