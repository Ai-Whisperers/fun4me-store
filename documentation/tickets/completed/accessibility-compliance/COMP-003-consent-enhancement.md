# COMP-003: Consent Tracking Enhancement

## Priority: P2
## Category: Compliance
## Status: ✅ Complete
## Epic: [EPIC-13: Accessibility & Compliance](../epics/EPIC-13-accessibility-compliance.md)

## Description
Enhance the existing consent management system with granular consent tracking, preference management, and audit capabilities.

## Current State
- ~~Basic consent templates exist~~
- ~~Consent documents tracked~~
- ~~No granular consent preferences~~
- ~~Limited consent analytics~~

## Implementation (January 2026)

### Files Created

**Types & Service (`lib/consent/`)**
- `types.ts` - Type definitions for consent preferences
  - 9 consent types: medical_treatment, data_processing, marketing_email, marketing_sms, third_party_sharing, analytics_cookies, photo_sharing, marketing_whatsapp, push_notifications
  - 6 consent sources: signup, settings, procedure, banner, api, import
  - Spanish labels and descriptions for all types
  - Type guards: `isValidConsentType`, `isValidConsentSource`
  - Utility functions: `getAllConsentTypes`, `getConsentLabel`, `getConsentDescription`
  - Categorization: `isRequiredConsent`, `isMarketingConsent`
- `preference-service.ts` - Business logic for preference operations
  - CRUD operations: `getUserPreferences`, `getConsentStatus`, `getPreference`, `setPreference`
  - Consent management: `grantConsent`, `withdrawConsent`, `bulkUpdatePreferences`
  - Analytics: `getConsentAnalytics`, `getAuditHistory`
  - GDPR compliance: `exportUserConsentData`
  - Onboarding: `initializeUserPreferences`
- `index.ts` - Module exports

**Database Migration (`db/85_system/05_consent_preferences.sql`)**
- `consent_preference_type` enum (9 values)
- `consent_source` enum (6 values)
- `consent_preferences` table with RLS
  - User, tenant, and type tracking
  - Version increment on updates
  - Constraints for granted_at and withdrawn_at consistency
- `consent_preference_audit` table with RLS
  - Full audit trail with IP and user agent
  - Automatic logging via trigger
- Helper functions:
  - `get_user_consent_status(user_id, tenant_id)` - All preferences
  - `has_consent(user_id, tenant_id, consent_type)` - Boolean check
  - `get_consent_analytics(tenant_id)` - Aggregate stats
- Indexes for performance
- Auto-audit trigger on insert/update

**API Endpoints (`app/api/consent/`)**
- `preferences/route.ts` - GET all, POST single, PUT bulk update
- `audit/route.ts` - GET audit history with filtering
- `analytics/route.ts` - GET consent analytics (admin only)
- `export/route.ts` - GET export consent data (JSON download)

**React Components (`components/consent/`)**
- `consent-toggle.tsx` - Individual toggle switch
  - Required badge for mandatory consents
  - Loading state indicator
  - Disabled state for required+granted
- `preference-center.tsx` - Main preference management center
  - Tabbed interface: All, Marketing, Privacy
  - Real-time updates with optimistic UI
  - Export data button
  - Last updated timestamp
- `consent-analytics.tsx` - Admin analytics dashboard
  - Summary cards (total users, avg rate, recent changes)
  - Detailed table with progress bars
  - Trend indicators
  - CSV export
- `index.ts` - Component exports

**Tests**
- `tests/unit/lib/consent/types.test.ts` - 22 tests for type utilities

### Features Implemented

1. **9 Granular Consent Types**
   - Medical treatment consent
   - Data processing (required)
   - Marketing: email, SMS, WhatsApp, push notifications
   - Privacy: third-party sharing, analytics cookies
   - Photo sharing for social media

2. **Preference Center UI**
   - Tabbed navigation (All/Marketing/Privacy)
   - Toggle switches with descriptions
   - Required consent badge
   - Loading states per toggle
   - Export functionality

3. **Automatic Audit Logging**
   - Trigger-based logging on every change
   - IP address and user agent captured
   - Old and new values tracked
   - Source attribution

4. **Analytics Dashboard**
   - Per-type acceptance rates
   - 30-day change tracking
   - Trend indicators
   - CSV export for compliance

5. **GDPR Data Export**
   - JSON download of all preferences
   - Full audit history included
   - Timestamp of export

6. **Tenant Isolation**
   - RLS policies on all tables
   - Staff can view tenant analytics
   - Users manage their own preferences

## Acceptance Criteria
- [x] 7+ consent types defined (9 implemented)
- [x] Preference center accessible
- [x] Consent changes audited
- [x] Consent required at signup (initializeUserPreferences)
- [x] Easy withdrawal mechanism
- [x] Reports exportable

## Related Files
- `web/lib/consent/` - Consent module (types, service, index)
- `web/db/85_system/05_consent_preferences.sql` - Database migration
- `web/app/api/consent/` - API endpoints (4 route files)
- `web/components/consent/` - React components (3 components)
- `web/tests/unit/lib/consent/` - Unit tests

## Actual Effort
- ~5 hours total
  - Types & Service: 1.5h
  - Database migration: 1h
  - API endpoints: 1h
  - React components: 1h
  - Tests: 0.5h
