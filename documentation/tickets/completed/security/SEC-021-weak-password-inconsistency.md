# SEC-021 Inconsistent Password Requirements Across Auth Flows

## Priority: P2

## Category: Security

## Status: Not Started

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Description

Password requirements are inconsistent across different authentication flows:

| Flow | Min Length | Complexity | File |
|------|------------|------------|------|
| Signup | 8 chars | None | `auth/actions.ts:29` |
| Clinic Claim | **6 chars** | None | `api/claim/route.ts:24` |
| Ambassador Register | **6 chars** | None | `api/ambassador/route.ts:18` |

Weaker password requirements in some flows create security vulnerabilities and user confusion.

### Vulnerable Code

**`web/app/api/claim/route.ts`** (Line 24):
```typescript
const claimSchema = z.object({
  // ...
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
})
```

**`web/app/api/ambassador/route.ts`** (Line 18):
```typescript
const registerSchema = z.object({
  // ...
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
})
```

**`web/app/auth/actions.ts`** (Lines 28-30):
```typescript
password: z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga (máximo 72 caracteres)'),
```

## Impact

**Security Risk (Medium)**:
- Clinic admin accounts (high-privilege) can be created with weak 6-char passwords
- Ambassador accounts (can earn commissions) have weak password requirements
- Inconsistent UX confuses users about security standards

## Proposed Fix

### Create centralized password schema

```typescript
// web/lib/validation/password.ts
import { z } from 'zod'

/**
 * Standard password validation schema
 * Used across all authentication flows for consistency
 */
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga (máximo 72 caracteres)')

/**
 * Strong password schema for high-privilege accounts
 * Requires uppercase, lowercase, and numbers
 */
export const strongPasswordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')

// Optional: Password strength estimator using zxcvbn
export function estimatePasswordStrength(password: string): 'weak' | 'fair' | 'strong' {
  // Use zxcvbn library for accurate estimation
}
```

### Update all schemas

```typescript
// api/claim/route.ts
import { strongPasswordSchema } from '@/lib/validation/password'

const claimSchema = z.object({
  // ...
  password: strongPasswordSchema, // SEC-021: Use strong password for admin accounts
})

// api/ambassador/route.ts
import { passwordSchema } from '@/lib/validation/password'

const registerSchema = z.object({
  // ...
  password: passwordSchema, // SEC-021: Consistent password requirements
})
```

## Acceptance Criteria

- [ ] Create `lib/validation/password.ts` with standard schemas
- [ ] Update `api/claim/route.ts` to use `strongPasswordSchema`
- [ ] Update `api/ambassador/route.ts` to use `passwordSchema`
- [ ] Update `auth/actions.ts` to use centralized schema
- [ ] Add `// SEC-021: Consistent password requirements` comments
- [ ] Test all auth flows accept 8+ char passwords
- [ ] Test all auth flows reject <8 char passwords
- [ ] Consider requiring complexity for admin accounts

## Related Files

- `web/app/api/claim/route.ts`
- `web/app/api/ambassador/route.ts`
- `web/app/auth/actions.ts`
- `web/lib/validation/` - New password.ts file

## Estimated Effort

1 hour

## Testing Notes

1. Try signup with 6-char password - should fail
2. Try clinic claim with 6-char password - should fail (after fix)
3. Try ambassador register with 6-char password - should fail (after fix)
4. All flows should accept 8+ char passwords
5. Verify error messages are consistent in Spanish
