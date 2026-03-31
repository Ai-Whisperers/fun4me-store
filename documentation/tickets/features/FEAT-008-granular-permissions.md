# FEAT-008: Granular Permission System

## Priority: P3 (Low)
## Category: Feature
## Status: Not Started

## Description
The current role-based access control (owner, vet, admin) is basic. A TODO indicates desire for more granular permission system.

## Current State
### TODO Found
**`lib/auth/core.ts:164`**
- "TODO: Implement more granular permission system"

### Current Implementation
```typescript
// Simple role check
type Role = 'owner' | 'vet' | 'admin';

function canAccess(userRole: Role, requiredRole: Role): boolean {
  const hierarchy = { owner: 1, vet: 2, admin: 3 };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}
```

### Limitations
- No per-feature permissions
- No custom roles
- No department-based access
- No record-level permissions

## Proposed Solution

### 1. Permission-Based System
```typescript
// lib/auth/permissions.ts
export const PERMISSIONS = {
  // Pets
  'pets:read': 'View pet profiles',
  'pets:create': 'Create pet profiles',
  'pets:update': 'Edit pet profiles',
  'pets:delete': 'Delete pet profiles',

  // Medical Records
  'records:read': 'View medical records',
  'records:create': 'Create medical records',
  'records:update': 'Edit medical records',
  'records:delete': 'Delete medical records',

  // Inventory
  'inventory:read': 'View inventory',
  'inventory:manage': 'Manage inventory',
  'inventory:order': 'Create purchase orders',

  // Financial
  'invoices:read': 'View invoices',
  'invoices:create': 'Create invoices',
  'invoices:void': 'Void invoices',
  'payments:process': 'Process payments',

  // Admin
  'team:manage': 'Manage team members',
  'settings:manage': 'Manage clinic settings',
  'reports:view': 'View reports',
} as const;

type Permission = keyof typeof PERMISSIONS;
```

### 2. Role-Permission Mapping
```typescript
// lib/auth/roles.ts
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'pets:read',
    'records:read',
    'invoices:read',
  ],
  vet: [
    'pets:read', 'pets:create', 'pets:update',
    'records:read', 'records:create', 'records:update',
    'inventory:read',
    'invoices:read', 'invoices:create',
  ],
  admin: [
    // All permissions
    ...Object.keys(PERMISSIONS) as Permission[],
  ],
};
```

### 3. Custom Role Support
```typescript
// Database: custom_roles table
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Permission Check Utility
```typescript
// lib/auth/check-permission.ts
export async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  const profile = await getProfile(userId);

  // Check built-in role permissions
  if (ROLE_PERMISSIONS[profile.role].includes(permission)) {
    return true;
  }

  // Check custom role permissions
  if (profile.custom_role_id) {
    const customRole = await getCustomRole(profile.custom_role_id);
    return customRole.permissions.includes(permission);
  }

  return false;
}
```

## Implementation Steps
1. Define all permissions in constants file
2. Map existing roles to permissions
3. Create database schema for custom roles
4. Implement permission check utility
5. Create admin UI for role management
6. Update API routes to use permission checks
7. Add permission-based UI hiding
8. Write tests for permission system

## Acceptance Criteria
- [ ] All features have granular permissions defined
- [ ] Built-in roles maintain current access levels
- [ ] Custom roles can be created by admins
- [ ] Permissions can be assigned to custom roles
- [ ] API routes check permissions (not just roles)
- [ ] UI hides elements user can't access
- [ ] Audit log captures permission changes

## Related Files
- `web/lib/auth/core.ts`
- `web/lib/auth/permissions.ts` (new)
- `web/lib/auth/roles.ts` (new)
- `web/db/migrations/xxx_custom_roles.sql` (new)

## Estimated Effort
- Total: 16 hours
- Permission definitions: 2 hours
- Database schema: 2 hours
- Permission checks: 4 hours
- Admin UI: 4 hours
- API integration: 2 hours
- Testing: 2 hours

---
*Ticket created: January 2026*
*Based on TODO analysis*
