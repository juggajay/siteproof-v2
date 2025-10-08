/**
 * Centralized authorization and permissions management
 * Implements role-based access control (RBAC) for resources
 */

export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export';
export type Resource =
  | 'diary'
  | 'ncr'
  | 'project'
  | 'report'
  | 'itp'
  | 'organization'
  | 'user'
  | 'financial_data';

export type Role =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'site_foreman'
  | 'finance_manager'
  | 'accountant'
  | 'viewer';

/**
 * Permission matrix defining what each role can do with each resource
 */
const PERMISSIONS: Record<Role, Record<Resource, Action[]>> = {
  owner: {
    diary: ['read', 'create', 'update', 'delete', 'approve', 'export'],
    ncr: ['read', 'create', 'update', 'delete', 'export'],
    project: ['read', 'create', 'update', 'delete', 'export'],
    report: ['read', 'create', 'delete', 'export'],
    itp: ['read', 'create', 'update', 'delete', 'approve', 'export'],
    organization: ['read', 'update', 'delete'],
    user: ['read', 'create', 'update', 'delete'],
    financial_data: ['read', 'create', 'update', 'delete', 'export'],
  },
  admin: {
    diary: ['read', 'create', 'update', 'delete', 'approve', 'export'],
    ncr: ['read', 'create', 'update', 'delete', 'export'],
    project: ['read', 'create', 'update', 'delete', 'export'],
    report: ['read', 'create', 'export'],
    itp: ['read', 'create', 'update', 'delete', 'approve', 'export'],
    organization: ['read', 'update'],
    user: ['read', 'create', 'update'],
    financial_data: ['read', 'create', 'update', 'delete', 'export'],
  },
  project_manager: {
    diary: ['read', 'create', 'update', 'approve', 'export'],
    ncr: ['read', 'create', 'update', 'export'],
    project: ['read', 'update', 'export'],
    report: ['read', 'create', 'export'],
    itp: ['read', 'create', 'update', 'approve', 'export'],
    organization: ['read'],
    user: ['read'],
    financial_data: ['read', 'export'],
  },
  site_foreman: {
    diary: ['read', 'create', 'update', 'export'],
    ncr: ['read', 'create', 'update'],
    project: ['read'],
    report: ['read', 'create', 'export'],
    itp: ['read', 'create', 'update'],
    organization: ['read'],
    user: ['read'],
    financial_data: [],
  },
  finance_manager: {
    diary: ['read', 'export'],
    ncr: ['read', 'export'],
    project: ['read', 'export'],
    report: ['read', 'create', 'export'],
    itp: ['read', 'export'],
    organization: ['read'],
    user: ['read'],
    financial_data: ['read', 'create', 'update', 'delete', 'export'],
  },
  accountant: {
    diary: ['read', 'export'],
    ncr: ['read', 'export'],
    project: ['read', 'export'],
    report: ['read', 'export'],
    itp: ['read', 'export'],
    organization: ['read'],
    user: ['read'],
    financial_data: ['read', 'export'],
  },
  viewer: {
    diary: ['read'],
    ncr: ['read'],
    project: ['read'],
    report: ['read'],
    itp: ['read'],
    organization: ['read'],
    user: ['read'],
    financial_data: [],
  },
};

/**
 * Check if a role can perform an action on a resource
 */
export function canPerformAction(role: Role, resource: Resource, action: Action): boolean {
  const permissions = PERMISSIONS[role];
  if (!permissions) {
    return false;
  }

  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  return resourcePermissions.includes(action);
}

/**
 * Check if a role has access to financial data
 */
export function hasFinancialAccess(role: Role): boolean {
  return canPerformAction(role, 'financial_data', 'read');
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Record<Resource, Action[]> {
  return PERMISSIONS[role] || {};
}

/**
 * Check if a role can approve items (diaries, ITPs, etc.)
 */
export function canApprove(role: Role, resource: Resource): boolean {
  return canPerformAction(role, resource, 'approve');
}

/**
 * Check if a role can export data
 */
export function canExport(role: Role, resource: Resource): boolean {
  return canPerformAction(role, resource, 'export');
}

/**
 * Check if a role is administrative (owner or admin)
 */
export function isAdministrator(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Check if a user can manage organization members
 */
export function canManageMembers(role: Role): boolean {
  return isAdministrator(role);
}

/**
 * Check if a user can manage projects
 */
export function canManageProjects(role: Role): boolean {
  return isAdministrator(role) || role === 'project_manager';
}

/**
 * Check if a user can view all financial data
 */
export function canViewFinancials(role: Role): boolean {
  return ['owner', 'admin', 'finance_manager', 'accountant', 'project_manager'].includes(role);
}

/**
 * Check if a user can edit financial data
 */
export function canEditFinancials(role: Role): boolean {
  return ['owner', 'admin', 'finance_manager'].includes(role);
}

/**
 * Validate that user is in the same organization as the resource
 */
export interface OrganizationContext {
  userOrganizationId: string;
  resourceOrganizationId: string;
}

export function isInSameOrganization(context: OrganizationContext): boolean {
  return context.userOrganizationId === context.resourceOrganizationId;
}

/**
 * Check if user can access a resource based on role and organization
 */
export interface AccessContext extends OrganizationContext {
  userRole: Role;
  resource: Resource;
  action: Action;
  isResourceOwner?: boolean; // If user created/owns the resource
}

export function canAccessResource(context: AccessContext): boolean {
  // Must be in same organization
  if (!isInSameOrganization(context)) {
    return false;
  }

  // Check role-based permission
  const hasRolePermission = canPerformAction(context.userRole, context.resource, context.action);

  // Allow resource owners to perform certain actions even with lower permissions
  if (context.isResourceOwner && ['read', 'update'].includes(context.action)) {
    return true;
  }

  return hasRolePermission;
}

/**
 * Filter sensitive financial data from an object based on user role
 */
export function filterFinancialData<T extends Record<string, any>>(
  data: T,
  role: Role,
  financialFields: string[] = ['hourly_rate', 'daily_rate', 'total_cost', 'unit_cost']
): T {
  if (hasFinancialAccess(role)) {
    return data;
  }

  // Create a copy and remove financial fields
  const filtered = { ...data };
  financialFields.forEach((field) => {
    if (field in filtered) {
      delete filtered[field];
    }
  });

  return filtered;
}

/**
 * Filter financial data from an array of objects
 */
export function filterFinancialDataArray<T extends Record<string, any>>(
  items: T[],
  role: Role,
  financialFields?: string[]
): T[] {
  if (hasFinancialAccess(role)) {
    return items;
  }

  return items.map((item) => filterFinancialData(item, role, financialFields));
}

/**
 * Permission helper for diary operations
 */
export const diaryPermissions = {
  canView: (role: Role) => canPerformAction(role, 'diary', 'read'),
  canCreate: (role: Role) => canPerformAction(role, 'diary', 'create'),
  canEdit: (role: Role) => canPerformAction(role, 'diary', 'update'),
  canDelete: (role: Role) => canPerformAction(role, 'diary', 'delete'),
  canApprove: (role: Role) => canPerformAction(role, 'diary', 'approve'),
  canExport: (role: Role) => canPerformAction(role, 'diary', 'export'),
  canViewFinancials: (role: Role) => hasFinancialAccess(role),
};

/**
 * Permission helper for NCR operations
 */
export const ncrPermissions = {
  canView: (role: Role) => canPerformAction(role, 'ncr', 'read'),
  canCreate: (role: Role) => canPerformAction(role, 'ncr', 'create'),
  canEdit: (role: Role) => canPerformAction(role, 'ncr', 'update'),
  canDelete: (role: Role) => canPerformAction(role, 'ncr', 'delete'),
  canClose: (role: Role) => isAdministrator(role),
};

/**
 * Permission helper for project operations
 */
export const projectPermissions = {
  canView: (role: Role) => canPerformAction(role, 'project', 'read'),
  canCreate: (role: Role) => canPerformAction(role, 'project', 'create'),
  canEdit: (role: Role) => canPerformAction(role, 'project', 'update'),
  canDelete: (role: Role) => canPerformAction(role, 'project', 'delete'),
  canManage: (role: Role) => canManageProjects(role),
};

/**
 * Permission helper for ITP operations
 */
export const itpPermissions = {
  canView: (role: Role) => canPerformAction(role, 'itp', 'read'),
  canCreate: (role: Role) => canPerformAction(role, 'itp', 'create'),
  canEdit: (role: Role) => canPerformAction(role, 'itp', 'update'),
  canDelete: (role: Role) => canPerformAction(role, 'itp', 'delete'),
  canApprove: (role: Role) => canPerformAction(role, 'itp', 'approve'),
};
