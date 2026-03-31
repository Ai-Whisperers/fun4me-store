# COMP-001: GDPR Data Subject Rights

## Priority: P2
## Category: Compliance
## Status: ✅ Complete
## Epic: [EPIC-13: Accessibility & Compliance](../epics/EPIC-13-accessibility-compliance.md)

## Description
Implement GDPR data subject rights including data access, portability, rectification, and erasure.

## Current State
- No formal GDPR compliance
- No data export for users
- No account deletion workflow
- Data access requests handled manually

## Proposed Solution

### Data Subject Rights API
```typescript
// app/api/gdpr/route.ts

// Right to Access (Article 15)
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);

  const data = await collectUserData(userId);

  return NextResponse.json({
    personalData: data,
    exportedAt: new Date().toISOString(),
    format: 'json',
  });
}

// Right to Erasure (Article 17)
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);

  // Verify identity (require password confirmation)
  const { password } = await request.json();
  await verifyPassword(userId, password);

  // Start deletion process
  const job = await queueDeletion(userId);

  return NextResponse.json({
    status: 'pending',
    jobId: job.id,
    estimatedCompletion: '30 days',
  });
}
```

### Data Collection
```typescript
// lib/gdpr/collect-data.ts
export async function collectUserData(userId: string) {
  return {
    profile: await getProfile(userId),
    pets: await getPets(userId),
    appointments: await getAppointments(userId),
    invoices: await getInvoices(userId),
    medicalRecords: await getMedicalRecords(userId),
    messages: await getMessages(userId),
    activityLog: await getActivityLog(userId),
  };
}
```

### Deletion Workflow
```typescript
// lib/gdpr/delete-data.ts
export async function deleteUserData(userId: string) {
  // 1. Anonymize medical records (legal retention required)
  await anonymizeMedicalRecords(userId);

  // 2. Delete personal data
  await deletePersonalData(userId);

  // 3. Delete from auth system
  await deleteAuthUser(userId);

  // 4. Notify user
  await sendDeletionConfirmation(userId);

  // 5. Log for compliance
  await logDeletionCompliance(userId);
}
```

## Implementation Steps
1. Create data export functionality
2. Implement account deletion workflow
3. Add data rectification (profile edit)
4. Create GDPR request management UI
5. Add identity verification
6. Implement retention period handling
7. Create compliance audit log

## Acceptance Criteria
- [x] Users can export all their data
- [x] Users can delete their account
- [x] Identity verified before deletion
- [x] 30-day processing SLA
- [x] Medical records anonymized (not deleted)
- [x] Compliance log maintained

## Related Files
- `app/api/gdpr/` - GDPR endpoints
- `lib/gdpr/` - GDPR utilities
- `app/[clinic]/portal/settings/` - User settings

## Estimated Effort
- 10 hours
  - Data export: 3h
  - Account deletion: 4h
  - UI & workflows: 2h
  - Compliance logging: 1h

## Implementation Notes (January 2026)

### Created Files

**GDPR Types (`lib/gdpr/types.ts`):**
- GDPR request types (access, rectification, erasure, restriction, portability, objection)
- Request status tracking (pending, identity_verification, processing, completed, rejected, cancelled)
- User data export interfaces for all 13+ data categories
- Data categories configuration (deletable, anonymizable, retained)
- Retention period definitions with Spanish legal reasons

**Data Collection (`lib/gdpr/collect-data.ts`):**
- `collectUserData()` - Comprehensive data collection across 13 categories
- Parallel data fetching for efficiency
- Categories: profile, pets, appointments, medical records, prescriptions, invoices, payments, messages, loyalty points, store orders, store reviews, consents, activity logs
- `generateExportJson()` - Generate downloadable JSON export
- `calculateExportSize()` - Calculate export file size

**Data Deletion (`lib/gdpr/delete-data.ts`):**
- `deleteUserData()` - Full deletion/anonymization workflow
- Anonymization with Spanish placeholder values
- `canDeleteUser()` - Pre-deletion blocker checks (unpaid invoices, pending appointments, etc.)
- `logGDPRDeletion()` - Compliance audit logging
- Legal retention handling for medical records (10 years), invoices (5 years)

**Identity Verification (`lib/gdpr/verify-identity.ts`):**
- `generateVerificationToken()` - Secure token generation
- `verifyPassword()` - Password-based identity verification
- `createEmailVerification()` / `verifyEmailToken()` - Email verification flow
- `sendVerificationEmail()` - Verification email sending
- `checkRateLimit()` - GDPR request rate limiting (prevents abuse)
- `verifyAdminPermission()` - Admin permission verification

### API Endpoints

**Main GDPR Routes (`app/api/gdpr/route.ts`):**
- `GET /api/gdpr` - List user's GDPR requests
- `POST /api/gdpr` - Create new GDPR request

**Export Route (`app/api/gdpr/export/route.ts`):**
- `GET /api/gdpr/export` - Download complete data export (Article 15/20)

**Deletion Route (`app/api/gdpr/delete/route.ts`):**
- `POST /api/gdpr/delete` - Request account deletion
- `DELETE /api/gdpr/delete` - Execute deletion after verification

**Verification Route (`app/api/gdpr/verify/route.ts`):**
- `GET /api/gdpr/verify` - Email token verification (redirect)
- `POST /api/gdpr/verify` - Password verification

**Request Details (`app/api/gdpr/[requestId]/route.ts`):**
- `GET /api/gdpr/[requestId]` - Get request details
- `PATCH /api/gdpr/[requestId]` - Update request
- `DELETE /api/gdpr/[requestId]` - Cancel request

### Database Migration

**New Tables (`db/85_system/03_gdpr.sql`):**
- `gdpr_requests` - Track GDPR data subject requests
- `gdpr_compliance_logs` - Audit trail for compliance
- Enums: `gdpr_request_type`, `gdpr_request_status`
- Soft delete columns added to `profiles` and `pets`
- Full RLS policies for user and staff access

### Data Categories

**Fully Deletable:**
- Messages, store cart, wishlist, stock alerts, reviews, reminders

**Anonymized (Legal Retention):**
- Profile, medical records, prescriptions, consent documents, invoices, payments, audit logs

**Retention Periods:**
- Medical records: 10 years (legal requirement)
- Invoices: 5 years (tax requirement)
- Consent documents: 10 years (proof of informed consent)

### Rate Limits

| Request Type | Limit per 24h |
|--------------|---------------|
| access       | 5             |
| portability  | 3             |
| rectification| 10            |
| erasure      | 1             |

### Test Coverage

- `tests/lib/gdpr/types.test.ts` - 7 tests
- `tests/lib/gdpr/collect-data.test.ts` - 8 tests
- `tests/lib/gdpr/delete-data.test.ts` - 18 tests
- `tests/lib/gdpr/verify-identity.test.ts` - 13 tests
- All 46 GDPR tests passing
