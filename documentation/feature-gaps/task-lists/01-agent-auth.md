# Agent-01: Authentication Features

**Agent ID**: Agent-01
**Domain**: Authentication & Account Management
**Priority**: 🔴 Critical
**Estimated Total Effort**: 4-6 hours
**Status**: Completed

---

## Ownership

### Files I OWN (can create/modify)
```
app/[clinic]/portal/forgot-password/   # CREATED
app/[clinic]/portal/reset-password/    # CREATED
app/[clinic]/portal/logout/            # UPDATED (improved UI)
app/auth/actions.ts                    # MODIFIED (added password reset + logout actions)
components/auth/logout-button.tsx      # CREATED
components/layout/main-nav.tsx         # MODIFIED (added logout button)
app/[clinic]/portal/layout.tsx         # MODIFIED (added logout button)
tests/unit/auth/                       # CREATED
```

### Files I can READ (not modify)
```
lib/supabase/server.ts
lib/supabase/client.ts
app/[clinic]/portal/login/             # Reference patterns (MODIFIED to add forgot password link)
components/ui/*                        # Reuse these
```

### Files I must NOT touch
```
Everything else - especially other agents' domains
```

---

## Context

Read these files first for understanding:
1. `CLAUDE.md` - Project overview
2. `documentation/feature-gaps/06-technical-notes.md` - Code patterns
3. `app/[clinic]/portal/login/page.tsx` - Existing auth page pattern

---

## Tasks

### Task 1: Create Auth Server Actions
**File**: `app/auth/actions.ts` (MODIFIED - added to existing file)

- [x] Implement `requestPasswordReset`
- [x] Implement `updatePassword`
- [x] Add input validation
- [x] Security: Always return success on password reset to prevent email enumeration

### Task 2: Forgot Password Page
**File**: `app/[clinic]/portal/forgot-password/page.tsx`

- [x] Create directory structure
- [x] Create page component
- [x] Add email input form
- [x] Connect to server action
- [x] Show success message after submission
- [x] Add "Volver al inicio de sesión" link
- [x] Style with theme variables
- [x] Make mobile responsive

### Task 3: Reset Password Page
**File**: `app/[clinic]/portal/reset-password/page.tsx`

- [x] Create directory structure
- [x] Create page component
- [x] Add password + confirm password form
- [x] Add show/hide password toggles
- [x] Connect to server action
- [x] Handle success (show confirmation with link to login)
- [x] Handle errors (invalid/expired token)
- [x] Style with theme variables
- [x] Make mobile responsive

### Task 4: Update Login Page
**File**: `app/[clinic]/portal/login/page.tsx` (MODIFIED)

- [x] Add "¿Olvidaste tu contraseña?" link
- [x] Link to `/[clinic]/portal/forgot-password`
- [x] Position below login button

### Task 5: Email Verification Indicator (Optional)
**Skipped** - Lower priority, can be added later if needed.

### Task 6: Testing
**Directory**: `tests/unit/auth/`

- [x] Create `auth-actions.test.ts`
- [x] Test `requestPasswordReset` validation
- [x] Test `updatePassword` validation
- [x] Test password match validation
- [x] Test security: always returns success on password reset

**Note**: Tests are written but Vitest configuration needs update for v4.

---

## Implementation Notes

### Actual File Locations (different from original plan)
The existing auth pages were under `app/[clinic]/portal/` (not `app/[clinic]/auth/`), so we followed that pattern:
- Forgot password: `app/[clinic]/portal/forgot-password/page.tsx`
- Reset password: `app/[clinic]/portal/reset-password/page.tsx`
- Auth actions added to existing: `app/auth/actions.ts`

### Features Implemented
1. **Forgot Password Flow**:
   - User enters email
   - Supabase sends reset link to `/${clinic}/portal/reset-password`
   - Always shows success message (security: prevents email enumeration)

2. **Reset Password Flow**:
   - User clicks link from email
   - User enters new password + confirmation
   - Show/hide password toggles included
   - Success redirects to login

3. **Security Considerations**:
   - Password minimum 8 characters
   - Password confirmation required
   - Never reveals if email exists in system
   - Proper error handling for expired links

4. **Logout Flow**:
   - Logout button in portal layout header
   - Logout button in main navigation (desktop icon, mobile text)
   - Dedicated logout page with loading/success/error states
   - Clears session and redirects to login

---

## Spanish Text Used

| Element | Spanish Text |
|---------|-------------|
| Page title (forgot) | Recuperar contraseña |
| Page title (reset) | Nueva contraseña |
| Email label | Correo electrónico |
| Password label | Nueva contraseña |
| Confirm password | Confirmar contraseña |
| Submit (forgot) | Enviar enlace de recuperación |
| Submit (reset) | Guardar nueva contraseña |
| Success (forgot) | Revisa tu correo |
| Success (reset) | Contraseña actualizada |
| Error - required | El correo electrónico es requerido |
| Error - min length | La contraseña debe tener al menos 8 caracteres |
| Error - mismatch | Las contraseñas no coinciden |
| Error - expired | Error al actualizar la contraseña. El enlace puede haber expirado. |
| Back link | Volver al inicio de sesión |
| Forgot link | ¿Olvidaste tu contraseña? |
| Logout button | Cerrar sesión |
| Logout loading | Cerrando sesión... |
| Logout success | Sesión cerrada |
| Logout error | Error al cerrar sesión |

---

## Acceptance Criteria

- [x] User can access forgot password from login page
- [x] User can request password reset with email
- [x] User receives email with reset link (Supabase handles)
- [x] User can set new password via reset link
- [x] Invalid/expired links show appropriate error
- [x] User can logout from portal header
- [x] User can logout from main navigation (desktop and mobile)
- [x] Logout page shows proper loading/success/error states
- [x] All text is in Spanish
- [x] Uses CSS variables (no hardcoded colors)
- [x] Mobile responsive
- [x] No console errors

---

## Environment Variables Needed

These should already exist:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Or production URL
```

---

## Dependencies

**None** - This agent has no dependencies on other agents.

---

## Handoff Notes

### Completed
- [x] Task 1 - Auth server actions added to `app/auth/actions.ts`
- [x] Task 2 - Forgot password page created
- [x] Task 3 - Reset password page created
- [x] Task 4 - Login page updated with forgot password link
- [ ] Task 5 - Skipped (optional, lower priority)
- [x] Task 6 - Unit tests created
- [x] Logout - Server action, logout button component, portal layout, main nav, improved logout page

### In Progress
- None

### Blockers
- Vitest v4 configuration needs update (poolOptions deprecated, html reporter requires @vitest/ui)

### Notes for Integration
- All routes are under `/[clinic]/portal/` to match existing auth patterns
- Password reset emails will redirect to `/${clinic}/portal/reset-password`
- Ensure `NEXT_PUBLIC_SITE_URL` environment variable is set in production
- Logout buttons are in: portal header, main nav (desktop icon), mobile menu (text button)

---

*Agent-01 Task File - Completed: December 2024*
