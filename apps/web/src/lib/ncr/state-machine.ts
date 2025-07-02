// NCR Status types and state machine validation
export type NcrStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'disputed';

interface StateTransition {
  from: NcrStatus[];
  to: NcrStatus;
  requiredFields?: string[];
  permissions?: ('assigned_user' | 'raiser' | 'admin' | 'owner')[];
}

// Define valid state transitions
const stateTransitions: StateTransition[] = [
  // Open -> Acknowledged (by assigned user)
  {
    from: ['open'],
    to: 'acknowledged',
    permissions: ['assigned_user', 'admin', 'owner'],
  },

  // Acknowledged -> In Progress (by assigned user)
  {
    from: ['acknowledged'],
    to: 'in_progress',
    permissions: ['assigned_user', 'admin', 'owner'],
  },

  // In Progress -> Resolved (by assigned user)
  {
    from: ['in_progress'],
    to: 'resolved',
    requiredFields: ['root_cause', 'corrective_action', 'preventive_action'],
    permissions: ['assigned_user', 'admin', 'owner'],
  },

  // Resolved -> Closed (by raiser after verification)
  {
    from: ['resolved'],
    to: 'closed',
    requiredFields: ['verification_notes'],
    permissions: ['raiser', 'admin', 'owner'],
  },

  // Any status (except closed) -> Disputed
  {
    from: ['open', 'acknowledged', 'in_progress', 'resolved'],
    to: 'disputed',
    requiredFields: ['dispute_reason', 'dispute_category'],
    permissions: ['assigned_user', 'admin', 'owner'],
  },

  // Closed/Disputed -> Open (reopen)
  {
    from: ['closed', 'disputed'],
    to: 'open',
    requiredFields: ['reopened_reason'],
    permissions: ['raiser', 'admin', 'owner'],
  },

  // Disputed -> any previous status (after resolution)
  {
    from: ['disputed'],
    to: 'open',
    permissions: ['admin', 'owner'],
  },
  {
    from: ['disputed'],
    to: 'acknowledged',
    permissions: ['admin', 'owner'],
  },
  {
    from: ['disputed'],
    to: 'in_progress',
    permissions: ['admin', 'owner'],
  },
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  requiredFields?: string[];
  allowedRoles?: string[];
}

/**
 * Validates if a state transition is allowed
 */
export function validateStateTransition(
  currentStatus: NcrStatus,
  newStatus: NcrStatus,
  userRole: 'assigned_user' | 'raiser' | 'admin' | 'owner' | 'member' | 'viewer',
  providedFields?: Record<string, any>
): ValidationResult {
  // Find the matching transition
  const transition = stateTransitions.find(
    (t) => t.from.includes(currentStatus) && t.to === newStatus
  );

  if (!transition) {
    return {
      valid: false,
      error: `Invalid state transition from ${currentStatus} to ${newStatus}`,
    };
  }

  // Check permissions
  if (transition.permissions && !transition.permissions.includes(userRole as any)) {
    // Special case: members and viewers cannot perform any transitions
    if (userRole === 'member' || userRole === 'viewer') {
      return {
        valid: false,
        error: `Insufficient permissions. Only ${transition.permissions.join(', ')} can perform this action`,
        allowedRoles: transition.permissions,
      };
    }
  }

  // Check required fields
  if (transition.requiredFields && providedFields) {
    const missingFields = transition.requiredFields.filter(
      (field) => !providedFields[field] || providedFields[field] === ''
    );

    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        requiredFields: missingFields,
      };
    }
  }

  return { valid: true };
}

/**
 * Get allowed transitions from current status
 */
export function getAllowedTransitions(
  currentStatus: NcrStatus,
  userRole: 'assigned_user' | 'raiser' | 'admin' | 'owner' | 'member' | 'viewer'
): NcrStatus[] {
  return stateTransitions
    .filter(
      (t) =>
        t.from.includes(currentStatus) &&
        (!t.permissions || t.permissions.includes(userRole as any))
    )
    .map((t) => t.to);
}

/**
 * Get the display name for a status
 */
export function getStatusDisplayName(status: NcrStatus): string {
  const displayNames: Record<NcrStatus, string> = {
    open: 'Open',
    acknowledged: 'Acknowledged',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    disputed: 'Disputed',
  };

  return displayNames[status] || status;
}

/**
 * Get the color/variant for a status (for UI badges)
 */
export function getStatusVariant(
  status: NcrStatus
): 'default' | 'warning' | 'success' | 'error' | 'info' {
  const variants: Record<NcrStatus, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
    open: 'warning',
    acknowledged: 'info',
    in_progress: 'info',
    resolved: 'success',
    closed: 'default',
    disputed: 'error',
  };

  return variants[status] || 'default';
}

/**
 * Determine user's role in relation to an NCR
 */
export function getUserNcrRole(
  ncr: { raised_by: string; assigned_to?: string | null },
  userId: string,
  organizationRole: 'owner' | 'admin' | 'member' | 'viewer'
): 'assigned_user' | 'raiser' | 'admin' | 'owner' | 'member' | 'viewer' {
  if (organizationRole === 'owner') return 'owner';
  if (organizationRole === 'admin') return 'admin';
  if (ncr.raised_by === userId) return 'raiser';
  if (ncr.assigned_to === userId) return 'assigned_user';
  return organizationRole;
}
