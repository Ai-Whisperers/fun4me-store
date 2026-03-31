# SEC-020 Missing Clinic Ownership Verification in Claim Flow

## Priority: P1

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

The clinic claim endpoint (`/api/claim`) allows users to claim any pre-generated clinic by just knowing its slug. There's no verification that the person claiming the clinic actually owns the business.

### Current Behavior

**`web/app/api/claim/route.ts`**:
```typescript
export async function POST(request: NextRequest): Promise<NextResponse<ClaimResponse>> {
  // Rate limiting applied
  const supabase = await createClient()

  const body = await request.json()
  const parseResult = claimSchema.safeParse(body)
  const { clinicSlug, ownerName, ownerEmail, ownerPhone, password } = parseResult.data

  // Check if clinic exists and is available
  const { data: clinic } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', clinicSlug)
    .single()

  // Only checks if status is 'pregenerated'
  if (clinic.status !== 'pregenerated') {
    return apiError(...)
  }

  // Creates user account and marks clinic as claimed
  // NO VERIFICATION of ownership!
}
```

### Attack Scenario

1. Attacker discovers pre-generated clinic slugs (via sitemap, enumeration, etc.)
2. Attacker claims clinic `veterinaria-san-juan` before the real owner does
3. Attacker now has admin access to a clinic intended for another business
4. Real clinic owner cannot claim their business
5. Attacker could impersonate the business or demand ransom

## Impact

**Security Risk (High)**:
- Business identity theft
- Denial of service to legitimate clinic owners
- Potential for impersonation and fraud
- Legal liability for the platform

## Proposed Fix

### Option A: One-Time Claim Code (Recommended)

Send a unique claim code to the clinic's registered email/phone when pre-generating:

```typescript
// When pre-generating clinic:
const claimCode = generateSecureCode() // e.g., "CLAIM-X7K9-M2N4"
await supabase.from('tenants').insert({
  id: slug,
  status: 'pregenerated',
  claim_code: hashCode(claimCode), // Store hashed
  claim_email: scrapedEmail, // From business listing
})
// Send email with claim code

// In claim endpoint:
if (!verifyClaimCode(body.claimCode, clinic.claim_code)) {
  return apiError('INVALID_CLAIM_CODE', 401)
}
```

### Option B: Email Domain Verification

```typescript
// Verify claimer's email matches business domain
const businessDomain = new URL(clinic.website).hostname
const claimerDomain = ownerEmail.split('@')[1]

if (!businessDomain.includes(claimerDomain)) {
  // Require additional verification
  await sendVerificationToBusinessEmail(clinic.contact_email, verificationLink)
  return NextResponse.json({
    pending: true,
    message: 'Verification email sent to business contact'
  })
}
```

### Option C: Manual Review Queue

```typescript
// For high-value claims, require manual review
if (clinic.estimated_value > 'high') {
  await supabase.from('claim_requests').insert({
    clinic_id: clinicSlug,
    requester_email: ownerEmail,
    requester_name: ownerName,
    status: 'pending_review',
    submitted_at: new Date(),
  })
  return NextResponse.json({
    pending: true,
    message: 'Your claim is under review'
  })
}
```

## Acceptance Criteria

- [x] Implement claim code system (Option A) - timing-safe hash verification
- [x] Add `claim_code` column to tenants table (migration 066)
- [x] Add `claim_audit_log` table for tracking attempts
- [ ] Send claim code email when pre-generating clinics (requires email integration)
- [x] Verify claim code in claim endpoint with timing-safe comparison
- [x] Add audit log for claim attempts (success and failure)
- [x] Rate limit claim attempts per clinic (5 attempts then 60 min lockout)
- [x] Alert on multiple failed claim attempts (via logger.warn)

## Related Files

- `web/app/api/claim/route.ts` - Main fix location
- `web/db/` - Migration for claim_code column
- Pre-generation scripts that create clinic records

## Estimated Effort

4-6 hours

## Testing Notes

1. Try claiming clinic without claim code - should fail
2. Try claiming with incorrect claim code - should fail
3. Try claiming with correct claim code - should succeed
4. Verify rate limiting on claim endpoint
5. Verify audit logs are created

## Security Severity

**HIGH** - Business identity theft vulnerability.
