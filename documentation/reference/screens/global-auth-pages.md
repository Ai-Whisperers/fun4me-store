# Global & Auth Pages Reference

Cross-tenant pages, authentication handlers, and special routes.

---

## Table of Contents

1. [Root Redirect](#1-root-redirect)
2. [Global Signup](#2-global-signup)
3. [Auth Callback](#3-auth-callback)
4. [Global Stats](#4-global-stats)
5. [Owner Pets View](#5-owner-pets-view)
6. [QR Tag Lookup](#6-qr-tag-lookup)
7. [Pet Scan Page](#7-pet-scan-page)

---

## 1. Root Redirect

| Property | Value |
|----------|-------|
| **Route** | `/` |
| **File** | `web/app/page.tsx` |
| **Access** | Public |

### Purpose
Redirects visitors from root URL to default clinic.

### Behavior
- Immediate redirect to `/adris` (default clinic)
- No UI rendered
- Server-side redirect

### User Interactions
None - automatic redirect.

---

## 2. Global Signup

| Property | Value |
|----------|-------|
| **Route** | `/auth/signup` |
| **File** | `web/app/auth/signup/page.tsx` |
| **Access** | Public |

### Purpose
Global signup page for users invited to a clinic via email invite.

### Flow
1. User receives invite email with link
2. Link contains `?invite=TOKEN` or `?email=EMAIL&clinic=SLUG`
3. Signup form pre-fills email and links to correct tenant
4. On success, user gets `owner` role in that tenant

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Email input | View | Pre-filled from invite (read-only) |
| Full name | Input | Required |
| Password | Input | Minimum 6 characters |
| Confirm password | Input | Must match |
| "Crear Cuenta" | Click | Creates account + profile |
| Success | View | Redirects to clinic portal |
| Invalid invite | View | Error message + contact admin |

### Form Validation
- Email: From invite token (cannot change)
- Name: Required, 2-100 characters
- Password: Minimum 6 characters
- Confirm: Must match password

### Post-Signup
1. Creates Supabase Auth user
2. Creates profile with tenant_id from invite
3. Deletes used invite record
4. Redirects to `/[clinic]/portal/dashboard`

---

## 3. Auth Callback

| Property | Value |
|----------|-------|
| **Route** | `/auth/callback` |
| **File** | `web/app/auth/callback/route.ts` |
| **Access** | Via OAuth redirect |
| **Type** | Route Handler (not page) |

### Purpose
OAuth callback handler for Google sign-in.

### Flow
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. Google redirects back to `/auth/callback?code=XXX`
4. Handler exchanges code for session
5. Creates/updates profile if needed
6. Redirects to appropriate dashboard

### Query Parameters
| Param | Description |
|-------|-------------|
| `code` | OAuth authorization code |
| `next` | Return URL after auth |

### Behavior
- Exchanges OAuth code for Supabase session
- Checks if profile exists
- Creates profile if first-time user
- Redirects to `next` param or default dashboard

### Error Handling
| Error | Result |
|-------|--------|
| Invalid code | Redirect to login with error |
| OAuth denied | Redirect to login with message |
| Profile creation failed | Logs error, continues to dashboard |

---

## 4. Global Stats

| Property | Value |
|----------|-------|
| **Route** | `/global/stats` |
| **File** | `web/app/global/stats/page.tsx` |
| **Access** | Admin (super-admin level) |

### Purpose
Platform-wide statistics for super administrators.

### Sections

#### 1. Platform Overview
| Metric | Description |
|--------|-------------|
| Total Clinics | Number of active tenants |
| Total Users | All registered users |
| Total Pets | Pets across all clinics |
| Total Appointments | Platform-wide appointments |

#### 2. Per-Clinic Breakdown
Table showing each clinic's metrics:
| Column | Description |
|--------|-------------|
| Clinic Name | Tenant name |
| Users | User count |
| Pets | Pet count |
| Appointments (30d) | Recent appointments |
| Revenue (30d) | Recent revenue |
| Status | Active/Inactive |

#### 3. Trends Charts
- User growth over time
- Appointment volume
- Revenue trends

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Clinic row | Click | Opens clinic detail |
| Date range | Select | Adjusts metrics |
| Export | Click | Downloads platform report |
| Refresh | Click | Reloads data |

---

## 5. Owner Pets View

| Property | Value |
|----------|-------|
| **Route** | `/owner/pets` |
| **File** | `web/app/owner/pets/page.tsx` |
| **Access** | Authenticated owners |

### Purpose
Cross-clinic view of all pets owned by a user.

### Use Case
When a pet owner has pets registered at multiple clinics, this page shows all of them in one place.

### Sections
1. **Pet Cards Grid** - All owner's pets regardless of clinic
2. **Clinic Indicator** - Badge showing which clinic each pet belongs to

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Pet card | Click | Navigate to pet profile at its clinic |
| Clinic badge | View | Shows clinic name |
| "Agregar Mascota" | Click | Opens clinic selector, then add pet |
| Search | Type | Filters pets by name |

---

## 6. QR Tag Lookup

| Property | Value |
|----------|-------|
| **Route** | `/tag/[code]` |
| **File** | `web/app/tag/[code]/page.tsx` |
| **Access** | Public |

### Purpose
Public page reached when scanning a pet's QR tag. Shows pet info and owner contact.

### Use Cases
1. Lost pet found - finder scans QR
2. Pet identification at events
3. Quick access to pet profile

### Sections

#### 1. Pet Header
- Large pet photo
- Pet name (large text)
- Species/breed info
- Age

#### 2. Owner Contact
- Owner first name (privacy: no last name)
- Phone number (click to call)
- WhatsApp button
- "Reportar Encontrado" button

#### 3. Basic Health Info (if enabled)
- Allergies
- Special conditions
- Veterinary clinic name

### User Interactions

| Element | Interaction | Result |
|---------|-------------|--------|
| Phone number | Click | Initiates phone call |
| WhatsApp button | Click | Opens WhatsApp chat |
| "Reportar Encontrado" | Click | Opens found report form |
| Clinic link | Click | Navigate to clinic site |

### Report Found Form
| Field | Type | Required |
|-------|------|----------|
| Your Name | Text | Yes |
| Your Phone | Tel | Yes |
| Location Found | Text | No |
| Notes | Textarea | No |

### Privacy Considerations
- Only shows first name of owner
- No address shown
- Limited health info
- Finder's info recorded for safety audit

---

## 7. Pet Scan Page

| Property | Value |
|----------|-------|
| **Route** | `/scan/[id]` |
| **File** | `web/app/scan/[id]/page.tsx` |
| **Access** | Public |

### Purpose
Alternative pet lookup by database ID (not QR code).

### Differences from QR Tag Lookup
| Aspect | QR Tag (`/tag/[code]`) | Pet Scan (`/scan/[id]`) |
|--------|------------------------|-------------------------|
| Parameter | QR code string | Pet UUID |
| Use case | Physical tag scan | Direct link sharing |
| Security | Code can be rotated | ID is permanent |

### Sections
Same as QR Tag Lookup:
1. Pet photo and info
2. Owner contact
3. Report found option

### User Interactions
Same as QR Tag Lookup page.

---

## Authentication Flows Summary

### Standard Login Flow
```
/[clinic]/portal/login
    │
    ├─→ Email/Password → Supabase Auth → /[clinic]/portal/dashboard
    │
    └─→ Google OAuth → /auth/callback → /[clinic]/portal/dashboard
```

### Signup Flow
```
/[clinic]/portal/signup (self-registration)
    │
    └─→ Creates user + profile (tenant from URL) → Email verification → Login

/auth/signup (invite-based)
    │
    └─→ Creates user + profile (tenant from invite) → /[clinic]/portal/dashboard
```

### Password Reset Flow
```
/[clinic]/portal/forgot-password
    │
    └─→ Reset email sent → /[clinic]/portal/reset-password?token=XXX → Login
```

### OAuth Flow
```
Login page → "Google" button
    │
    └─→ Google OAuth consent
          │
          └─→ /auth/callback?code=XXX
                │
                └─→ Exchange code → Create/update profile → Dashboard
```

---

## Security Considerations

### QR Tag Security
- QR codes are random strings, not predictable UUIDs
- Codes can be regenerated if compromised
- Found reports are logged with timestamp and IP

### OAuth Security
- Uses Supabase's secure OAuth flow
- Tokens stored in httpOnly cookies
- PKCE flow enabled

### Invite Security
- Invites expire after 7 days
- Single-use (deleted after signup)
- Email must match invite exactly

---

## API Routes Related

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/pets/[id]/qr` | GET | Generate QR code image |
| `/auth/callback` | GET | OAuth code exchange |

---

*Last updated: December 2024*
