# Week 3 - User Module Migration Ticket

**Created**: January 19, 2026  
**Priority**: P0 - CRITICAL  
**Effort**: 8-10 hours  
**Status**: Ready for implementation  
**Blocking**: All auth-dependent features

---

## Executive Summary

Migrate the User/Profile management module from legacy service pattern (`lib/services/user-service.ts`) to modern domain-driven pattern (`lib/domain/users/`). This is the **highest priority migration** as it handles security, access control, and user management across the entire platform.

### Why This Module First?
- **Security Critical**: Handles authentication, authorization, roles, permissions
- **Platform Foundation**: Used by almost every feature (auth, dashboard, team management, RLS)
- **Blocks Other Work**: Must be stable before migrating other modules
- **High Complexity**: 503 lines, 13 public methods, complex role logic

---

## Current State Analysis

### Legacy Implementation

**File**: `web/lib/services/user-service.ts` (503 lines)  
**Pattern**: Monolithic service extending BaseService  
**Dependencies**: BaseService error handling, Supabase client

**Public Methods** (13 total):
1. `list(tenantId, filters)` - List users with filtering
2. `getById(id, tenantId)` - Get single user by ID
3. `getByEmail(email, tenantId)` - Get user by email
4. `create(data)` - Create new user profile
5. `update(id, data, tenantId)` - Update user profile
6. `updateRole(id, role, tenantId)` - Change user role
7. `delete(id, tenantId)` - Soft delete user
8. `listStaff(tenantId)` - Get all staff (vets + admins)
9. `listVets(tenantId)` - Get all veterinarians
10. `listAdmins(tenantId)` - Get all administrators
11. `listOwners(tenantId, filters)` - Get all pet owners
12. `search(query, tenantId, filters)` - Full-text search users
13. `getStats(tenantId)` - Get user statistics

**Key Features**:
- Role-based queries (owner, vet, admin)
- Soft delete support
- Multi-tenant isolation
- Full-text search
- Client code generation
- User statistics

**Import Usage**: Used across **13+ files**
- Auth routes
- Dashboard components
- API routes
- Admin panels
- Team management

---

## Target Architecture

### New Domain Structure

```
web/lib/domain/users/
├── types.ts              # TypeScript types (UserProfile, CreateUserData, etc.)
├── repository.ts         # Database queries (read operations)
├── service.ts            # Business logic (write operations)
├── queries.ts            # Specialized queries (search, stats, filtering)
└── index.ts              # Public API exports
```

### Separation of Concerns

#### `types.ts` - Type Definitions
```typescript
export type UserRole = 'owner' | 'vet' | 'admin';
export type ContactMethod = 'phone' | 'email' | 'whatsapp' | 'sms';
export type DocumentType = 'CI' | 'RUC' | 'Pasaporte';

export interface UserProfile {
  id: string;
  tenant_id: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  // ... complete type definition
}

export interface CreateUserData { /* ... */ }
export interface UpdateUserData { /* ... */ }
export interface UserFilters { /* ... */ }
export interface UserListOptions { /* ... */ }
export interface UserStats { /* ... */ }
```

#### `repository.ts` - Data Access Layer (READ)
```typescript
export class UserRepository {
  constructor(private supabase: SupabaseClient) {}

  // Read operations only
  async findMany(tenantId: string, filters?: UserFilters): Promise<UserProfile[]>
  async findById(id: string, tenantId: string): Promise<UserProfile | null>
  async findByEmail(email: string, tenantId: string): Promise<UserProfile | null>
  async findByRole(role: UserRole, tenantId: string): Promise<UserProfile[]>
  async search(query: string, tenantId: string, filters?: UserFilters): Promise<UserProfile[]>
  async countByRole(tenantId: string): Promise<Record<UserRole, number>>
}
```

#### `service.ts` - Business Logic Layer (WRITE)
```typescript
export class UserService {
  constructor(
    private repository: UserRepository,
    private supabase: SupabaseClient
  ) {}

  // Write operations with business logic
  async create(data: CreateUserData): Promise<ServiceResult<UserProfile>>
  async update(id: string, data: UpdateUserData, tenantId: string): Promise<ServiceResult<UserProfile>>
  async updateRole(id: string, role: UserRole, tenantId: string): Promise<ServiceResult<UserProfile>>
  async delete(id: string, tenantId: string): Promise<ServiceResult<void>>
  
  // Business logic methods
  async inviteUser(email: string, role: UserRole, tenantId: string): Promise<ServiceResult<void>>
  async generateClientCode(tenantId: string): Promise<string>
  async validatePermissions(userId: string, action: string, tenantId: string): Promise<boolean>
}
```

#### `queries.ts` - Specialized Query Patterns
```typescript
// Complex queries that don't fit in repository
export async function getUserStats(tenantId: string, supabase: SupabaseClient): Promise<UserStats>
export async function searchUsersFullText(query: string, tenantId: string, supabase: SupabaseClient): Promise<UserProfile[]>
export async function getUsersWithPets(tenantId: string, supabase: SupabaseClient): Promise<UserWithPetsCount[]>
export async function getRecentlyActive(tenantId: string, days: number, supabase: SupabaseClient): Promise<UserProfile[]>
```

#### `index.ts` - Public API
```typescript
export * from './types';
export { UserRepository } from './repository';
export { UserService } from './service';
export * from './queries';

// Convenience factory
export function createUserService(supabase: SupabaseClient): UserService {
  const repository = new UserRepository(supabase);
  return new UserService(repository, supabase);
}
```

---

## Migration Steps

### Phase 1: Foundation (2-3 hours)

**Step 1.1**: Create domain directory structure
```bash
mkdir -p web/lib/domain/users
touch web/lib/domain/users/{types,repository,service,queries,index}.ts
```

**Step 1.2**: Extract and define types (`types.ts`)
- Copy all type definitions from `user-service.ts`
- Add missing types (filters, options, results)
- Export all types

**Validation**: Types import without errors

---

**Step 1.3**: Implement repository layer (`repository.ts`)
- Create UserRepository class
- Implement read methods:
  - `findMany()`
  - `findById()`
  - `findByEmail()`
  - `findByRole()`
  - `search()` (basic)
  - `countByRole()`
- Use raw Supabase queries (no BaseService)
- Return data directly (no ServiceResult wrapping)

**Validation**: 
- Repository methods compile
- Can query database
- Returns correct types

---

**Step 1.4**: Implement service layer (`service.ts`)
- Create UserService class
- Inject repository dependency
- Implement write methods:
  - `create()`
  - `update()`
  - `updateRole()`
  - `delete()` (soft delete)
- Add ServiceResult wrapping
- Handle errors explicitly (no BaseService)

**Validation**:
- Service methods compile
- Uses repository for reads
- Handles errors properly

---

**Step 1.5**: Implement specialized queries (`queries.ts`)
- Extract complex queries from legacy service:
  - `getUserStats()`
  - `searchUsersFullText()`
  - `getUsersWithPets()`
- Use standalone functions (not class methods)
- Keep queries focused and testable

**Validation**: Query functions work independently

---

**Step 1.6**: Create public API (`index.ts`)
- Export all types
- Export classes
- Export query functions
- Add factory function

**Validation**: Can import from `@/lib/domain/users`

---

### Phase 2: Migration (3-4 hours)

**Step 2.1**: Find all imports of legacy service
```bash
grep -r "from.*user-service" web/ --include="*.ts" --include="*.tsx" | wc -l
# Expected: 13+ files
```

**Step 2.2**: Create migration helper (temporary)
```typescript
// web/lib/domain/users/legacy-adapter.ts
import { UserService as LegacyUserService } from '@/lib/services/user-service';
import { UserService as NewUserService, UserRepository } from './index';

/**
 * Temporary adapter to maintain API compatibility during migration
 * DELETE THIS FILE after migration is complete
 */
export class UserServiceAdapter {
  private newService: NewUserService;
  
  constructor(supabase: SupabaseClient) {
    const repository = new UserRepository(supabase);
    this.newService = new NewUserService(repository, supabase);
  }
  
  // Delegate all methods to new service
  async list(...args) { return this.newService.list(...args); }
  async getById(...args) { return this.newService.getById(...args); }
  // ... etc
}
```

**Step 2.3**: Update imports file-by-file
For each file importing `user-service.ts`:
1. Change import to domain module
2. Update instantiation if needed
3. Run tests for that file
4. Fix any breakage
5. Commit

**Migration order** (13+ files):
1. API routes (`/api/`) - 5 files
2. Server actions (`/actions/`) - 3 files
3. Auth routes - 2 files
4. Dashboard components - 3+ files

**Step 2.4**: Update tests
- Update unit test imports
- Update integration test imports
- Ensure 80%+ pass rate maintained

---

### Phase 3: Cleanup & Verification (2-3 hours)

**Step 3.1**: Remove legacy code
```bash
# Verify no imports remain
grep -r "from.*user-service" web/ --include="*.ts" --include="*.tsx"
# Should return 0 results

# Delete legacy file
rm web/lib/services/user-service.ts
```

**Step 3.2**: Remove adapter (if used)
```bash
rm web/lib/domain/users/legacy-adapter.ts
```

**Step 3.3**: Update service index
Remove `user-service` from `web/lib/services/index.ts`

**Step 3.4**: Run full test suite
```bash
cd web
npm run test
# Target: 80%+ pass rate maintained
```

**Step 3.5**: Type check
```bash
npm run typecheck
# Must pass: 0 errors
```

**Step 3.6**: Build verification
```bash
npm run build
# Must succeed
```

**Step 3.7**: Create migration summary doc
Document what was changed, any breaking changes, new patterns

---

## Acceptance Criteria

### Must Have (Blocking)
- [ ] Domain types defined in `types.ts`
- [ ] Repository layer created with all read operations
- [ ] Service layer created with all write operations
- [ ] Specialized queries extracted to `queries.ts`
- [ ] Public API exposed via `index.ts`
- [ ] All 13 legacy methods migrated
- [ ] All imports updated (0 files importing legacy)
- [ ] Legacy `user-service.ts` deleted
- [ ] Tests passing at 80%+ rate
- [ ] TypeScript compilation successful (0 errors)
- [ ] Production build successful

### Should Have (Important)
- [ ] Error handling equivalent to BaseService
- [ ] Query performance maintained or improved
- [ ] No breaking API changes (unless documented)
- [ ] Unit tests for repository methods
- [ ] Unit tests for service methods
- [ ] Integration tests updated

### Nice to Have (Optional)
- [ ] Performance benchmarks
- [ ] Migration guide document
- [ ] Code examples in documentation
- [ ] Rollback plan documented

---

## Files to Create (5 files)

```
web/lib/domain/users/
├── types.ts              # NEW - 100-150 lines
├── repository.ts         # NEW - 150-200 lines
├── service.ts            # NEW - 200-250 lines
├── queries.ts            # NEW - 100-150 lines
└── index.ts              # NEW - 20-30 lines
```

**Total new code**: ~600-780 lines (cleaner, more testable than 503-line monolith)

---

## Files to Update (13+ files)

### API Routes (5 files)
- `web/app/api/users/route.ts`
- `web/app/api/users/[id]/route.ts`
- `web/app/api/staff/route.ts`
- `web/app/api/profiles/route.ts`
- `web/app/api/invitations/route.ts`

### Server Actions (3 files)
- `web/app/[clinic]/actions/users.ts`
- `web/app/[clinic]/actions/profiles.ts`
- `web/app/[clinic]/actions/team.ts`

### Auth Routes (2 files)
- `web/app/auth/callback/route.ts`
- `web/app/auth/signup/route.ts`

### Components (3+ files)
- `web/components/dashboard/team-management.tsx`
- `web/components/admin/user-list.tsx`
- `web/components/auth/profile-form.tsx`

---

## Files to Delete (1 file)

```
web/lib/services/user-service.ts  # DELETE - 503 lines
```

---

## Testing Strategy

### Unit Tests

**Repository Tests** (`web/tests/unit/domain/users/repository.test.ts`):
```typescript
describe('UserRepository', () => {
  describe('findMany', () => {
    it('should return all users for tenant')
    it('should filter by role')
    it('should exclude deleted users by default')
    it('should include deleted users when requested')
  })
  
  describe('findById', () => {
    it('should return user by ID')
    it('should return null if not found')
    it('should enforce tenant isolation')
  })
  
  describe('search', () => {
    it('should search by name')
    it('should search by email')
    it('should search by phone')
  })
})
```

**Service Tests** (`web/tests/unit/domain/users/service.test.ts`):
```typescript
describe('UserService', () => {
  describe('create', () => {
    it('should create user profile')
    it('should generate client code for owners')
    it('should validate required fields')
    it('should handle database errors')
  })
  
  describe('updateRole', () => {
    it('should update user role')
    it('should prevent downgrading last admin')
    it('should log role changes')
  })
  
  describe('delete', () => {
    it('should soft delete user')
    it('should prevent deleting last admin')
    it('should handle cascading effects')
  })
})
```

### Integration Tests

**API Tests** (`web/tests/integration/api/users.test.ts`):
```typescript
describe('GET /api/users', () => {
  it('should require authentication')
  it('should return users for current tenant')
  it('should filter by role')
  it('should support pagination')
})

describe('POST /api/users', () => {
  it('should create user with valid data')
  it('should reject invalid email')
  it('should enforce role permissions')
})
```

### E2E Tests (Optional)

**Team Management Flow**:
1. Admin logs in
2. Navigates to team management
3. Invites new vet
4. Verifies vet appears in list
5. Updates vet role to admin
6. Verifies role change

---

## Error Handling Strategy

### Current Pattern (BaseService)
```typescript
return this.handleError(async () => {
  const { data, error } = await this.supabase.from('users').select('*');
  if (error) throw error;
  return data;
}, 'Error fetching users');
```

### New Pattern (Explicit)
```typescript
// Repository (throws)
async findMany(tenantId: string): Promise<UserProfile[]> {
  const { data, error } = await this.supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId);
  
  if (error) {
    console.error('[UserRepository/findMany] Database error:', error);
    throw error;
  }
  
  return data;
}

// Service (wraps in ServiceResult)
async list(tenantId: string): Promise<ServiceResult<UserProfile[]>> {
  try {
    const users = await this.repository.findMany(tenantId);
    return { success: true, data: users };
  } catch (error) {
    console.error('[UserService/list] Failed:', { tenantId, error });
    return {
      success: false,
      error: 'Error al cargar usuarios'
    };
  }
}
```

**Key differences**:
- Repository throws errors (fail fast)
- Service catches and wraps (API-friendly)
- Explicit logging at both layers
- Spanish error messages for users

---

## Performance Considerations

### Query Optimization

**Before** (N+1 queries):
```typescript
const users = await getUsers(tenantId);
for (const user of users) {
  user.petCount = await getPetCount(user.id);
}
```

**After** (single query):
```typescript
const users = await this.supabase
  .from('profiles')
  .select(`
    *,
    pets!owner_id(count)
  `)
  .eq('tenant_id', tenantId);
```

### Caching Strategy

Consider caching for:
- User stats (refresh every 5 minutes)
- Staff lists (refresh on change)
- Role counts (refresh on change)

**Implementation** (optional):
```typescript
import { cache } from '@/lib/cache';

async getUserStats(tenantId: string): Promise<UserStats> {
  const cacheKey = `user-stats:${tenantId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;
  
  const stats = await this.calculateStats(tenantId);
  await cache.set(cacheKey, stats, 300); // 5 min TTL
  return stats;
}
```

---

## Security Considerations

### Critical Security Rules

1. **Tenant Isolation**: ALWAYS filter by `tenant_id`
   ```typescript
   // ✅ CORRECT
   .eq('tenant_id', tenantId)
   
   // ❌ WRONG - security breach
   .select('*')
   ```

2. **Role Validation**: Check permissions before mutations
   ```typescript
   // Before updating role
   const canUpdate = await this.validatePermissions(userId, 'user:update', tenantId);
   if (!canUpdate) throw new Error('Permiso denegado');
   ```

3. **Last Admin Protection**: Prevent deleting/downgrading last admin
   ```typescript
   const adminCount = await this.repository.countByRole('admin', tenantId);
   if (adminCount <= 1 && currentRole === 'admin') {
     throw new Error('No se puede eliminar el último administrador');
   }
   ```

4. **Soft Delete**: Never hard delete users (audit trail)
   ```typescript
   // Soft delete
   .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
   
   // Filter out deleted
   .is('deleted_at', null)
   ```

### RLS Policies

Ensure these policies exist (should already be in migrations):
```sql
-- Owners can read their own profile
CREATE POLICY "owners_read_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Staff can read all profiles in their tenant
CREATE POLICY "staff_read_tenant" ON profiles
  FOR SELECT USING (is_staff_of(tenant_id));

-- Only admins can update roles
CREATE POLICY "admins_update_roles" ON profiles
  FOR UPDATE USING (
    is_admin_of(tenant_id) 
    AND role != 'admin' -- Cannot modify admin roles
  );
```

---

## Rollback Plan

If migration fails or introduces critical bugs:

### Step 1: Immediate Rollback
```bash
# Restore legacy service file from git
git checkout HEAD~1 web/lib/services/user-service.ts

# Restore legacy imports
git checkout HEAD~1 web/app/api/users/route.ts
# ... repeat for all updated files

# Rebuild
npm run build
```

### Step 2: Verify Stability
```bash
npm run test
npm run typecheck
npm run build
```

### Step 3: Deploy Hotfix
```bash
git commit -m "hotfix: rollback user module migration"
git push
# Deploy to production
```

### Step 4: Post-Mortem
- Document what went wrong
- Fix issues in domain implementation
- Plan retry with additional testing

---

## Success Metrics

### Code Quality
- [ ] 0 TypeScript errors
- [ ] 0 ESLint warnings
- [ ] 80%+ test coverage
- [ ] All tests passing

### Performance
- [ ] Query performance ≤ legacy service
- [ ] API response times ≤ baseline
- [ ] Memory usage ≤ baseline

### Functionality
- [ ] All 13 methods work correctly
- [ ] No broken user flows
- [ ] Auth still works
- [ ] Team management works
- [ ] Role changes work

---

## Timeline

### Week 3 Day 1 (Monday) - 8 hours
- **Morning** (4h): Phase 1 - Foundation
  - Create structure
  - Implement types
  - Implement repository
  - Implement service
  
- **Afternoon** (4h): Phase 2 - Migration Start
  - Create adapter
  - Update API routes
  - Update server actions

### Week 3 Day 2 (Tuesday) - 2 hours
- **Morning** (2h): Phase 2 - Migration Finish
  - Update remaining imports
  - Run tests
  - Fix breakage

- **Afternoon**: Phase 3 - Cleanup
  - Remove legacy code
  - Verify tests
  - Build check
  - Documentation

**Total**: 10 hours (with buffer)

---

## Related Documentation

- [DOMAIN_MIGRATION_AUDIT.md](docs/archive/analysis/DOMAIN_MIGRATION_AUDIT.md) - Overall migration plan
- [SERVICE_LAYER_MIGRATION.md](documentation/development/SERVICE_LAYER_MIGRATION.md) - Migration patterns
- [WEEK_2_STRATEGIC_ANALYSIS.md](WEEK_2_STRATEGIC_ANALYSIS.md) - Week 2-3 plan

---

## Questions & Clarifications

### Q: Why not use BaseService in the new pattern?
**A**: BaseService is part of the legacy pattern. The new pattern uses explicit error handling for better testability and clearer error messages.

### Q: Can we migrate gradually (keep both patterns)?
**A**: Not recommended. Hybrid state increases complexity. Complete migration in one go for cleaner codebase.

### Q: What if we find bugs during migration?
**A**: Fix immediately or rollback. Do not ship broken user management.

### Q: How do we handle breaking API changes?
**A**: Avoid if possible. If necessary, version the API or provide adapter.

---

**Status**: Ready for Implementation  
**Next Steps**: Begin Phase 1 (Foundation) on Week 3 Day 1
