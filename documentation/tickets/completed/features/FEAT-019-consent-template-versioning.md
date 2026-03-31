# FEAT-019: Consent Template Versioning

## Priority: P2 - Medium
## Category: Feature
## Status: ✅ Complete
## Epic: [EPIC-13: Accessibility & Compliance](../epics/EPIC-13-accessibility-compliance.md)
## Affected Areas: Consents, Templates, Compliance

## Description

Implement version history for consent templates with comparison, rollback, and audit trail capabilities.

## Completion Summary

### Database Migration (065_consent_template_versioning.sql)

Created proper versioning infrastructure:

1. **Added missing columns to `consent_templates`:**
   - `is_active` - Whether template is available for use
   - `is_current` - Whether this is the current version
   - `published_at` - When this version was published
   - `change_summary` - Summary of changes in this version
   - `parent_version_id` - Reference to previous version
   - `requires_id_verification` - Whether signing requires ID verification
   - `can_be_revoked` - Whether consent can be revoked after signing
   - `default_expiry_days` - Default days until signed consent expires

2. **Created `consent_template_versions` table:**
   - `id` - Primary key
   - `template_id` - Reference to the template
   - `version_number` - Auto-incrementing version number per template
   - `version_label` - Human-readable version label (semantic versioning)
   - `title` - Snapshot of title at this version
   - `content_html` - Snapshot of content at this version
   - `change_summary` - Description of what changed
   - `is_published` - Whether this version was published
   - `published_at` - When published
   - `created_by` - Who made this version
   - `created_at` - Timestamp

3. **PostgreSQL Functions:**
   - `create_consent_template_version()` - Creates new version atomically
   - `rollback_consent_template_version()` - Rolls back to a previous version

4. **Migration of existing templates** - Creates initial version records

### API Endpoints

**Updated `/api/consents/templates/[id]/versions`:**
- GET - Get version history for a template
- POST - Create a new version (uses RPC function)

**New `/api/consents/templates/[id]/versions/[versionNumber]`:**
- GET - Get specific version content
- POST - Rollback to this version (admin only)

### UI Components

**`components/consents/version-history.tsx`:**
- `VersionHistory` - Sidebar showing all versions with metadata
- `VersionHistoryButton` - Button to toggle version history

**`components/consents/version-compare.tsx`:**
- `VersionCompare` - View single version with navigation
- `VersionDiff` - Side-by-side comparison of two versions

## Files Created/Modified

**New Files:**
- `web/db/migrations/065_consent_template_versioning.sql` - Database migration
- `web/components/consents/version-history.tsx` - Version history components
- `web/components/consents/version-compare.tsx` - Version comparison components
- `web/app/api/consents/templates/[id]/versions/[versionNumber]/route.ts` - New API route

**Modified Files:**
- `web/app/api/consents/templates/[id]/versions/route.ts` - Updated to use new schema
- `web/components/consents/index.ts` - Added exports for new components

## Acceptance Criteria

- [x] Each edit creates new version automatically
- [x] View history of all versions with timestamps
- [x] Compare versions with content preview
- [x] Rollback to any previous version (admin)
- [x] See who made each change
- [x] RLS policies protect version data
- [x] PostgreSQL functions for atomic operations

## Estimated Effort: ~9 hours (actual)

---
*Created: January 2026*
*Completed: January 2026*
*Derived from INCOMPLETE_FEATURES_ANALYSIS.md*
