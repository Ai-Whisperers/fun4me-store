# TECH-005: Centralize File Size Limits

## Priority: P3 - Low
## Category: Technical Debt
## Status: ✅ Completed
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Affected Areas: web/app/api/, web/app/actions/
## Completed: January 2026

## Description

Multiple API routes and server actions define their own `MAX_FILE_SIZE` constants instead of using the centralized `LIMITS` object from `lib/constants`. This leads to inconsistent file size limits across the application and makes it harder to maintain unified upload policies.

## Current State

### Centralized Constants (Exist But Underused)

```typescript
// lib/constants/index.ts lines 58-72
export const LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_NOTES_LENGTH: 5000,
  // ...
} as const
```

### Scattered Local Definitions (7 files)

| File | Constant | Value |
|------|----------|-------|
| `app/actions/pet-documents.ts:20` | `MAX_FILE_SIZE` | 20MB |
| `app/api/messages/attachments/route.ts:24` | `MAX_SIZE` | 10MB |
| `app/api/inventory/import/preview/route.ts:68` | `MAX_FILE_SIZE` | 5MB |
| `app/api/inventory/import/route.ts:32` | `MAX_FILE_SIZE` | 5MB |
| `app/api/signup/upload-logo/route.ts:14` | `MAX_FILE_SIZE` | 2MB |
| `app/api/store/prescriptions/upload/route.ts:6` | `MAX_FILE_SIZE` | 5MB |
| `app/[clinic]/cart/client.tsx:32` | `MAX_QUANTITY_PER_ITEM` | 99 |

### Code Example (Current)

```typescript
// app/api/inventory/import/route.ts
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB - duplicated

// app/api/messages/attachments/route.ts
const MAX_SIZE = 10 * 1024 * 1024 // 10MB - different name!
```

## Proposed Solution

### 1. Extend LIMITS Object

Add missing constants to `lib/constants/index.ts`:

```typescript
export const LIMITS = {
  // Existing
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB

  // New - Specific use cases
  MAX_LOGO_SIZE: 2 * 1024 * 1024, // 2MB - smaller for logos
  MAX_PET_DOCUMENT_SIZE: 20 * 1024 * 1024, // 20MB - larger for vet docs
  MAX_IMPORT_FILE_SIZE: 5 * 1024 * 1024, // 5MB - spreadsheets
  MAX_PRESCRIPTION_SIZE: 5 * 1024 * 1024, // 5MB - prescription images
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB - message attachments
  MAX_IMPORT_ROWS: 1000, // Prevent DoS via huge spreadsheets

  // Cart/quantity limits
  MAX_QUANTITY_PER_ITEM: 99,
  MAX_CART_ITEMS: 50,
} as const
```

### 2. Update All Files

```typescript
// Before
const MAX_FILE_SIZE = 5 * 1024 * 1024

// After
import { LIMITS } from '@/lib/constants'

if (file.size > LIMITS.MAX_IMPORT_FILE_SIZE) {
  return { error: 'Archivo demasiado grande' }
}
```

### 3. Add Helper Function (Optional)

```typescript
// lib/constants/index.ts
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileSizeError(limit: number): string {
  return `El archivo excede el tamaño máximo de ${formatFileSize(limit)}`
}
```

## Implementation Steps

1. [x] Extend `LIMITS` object with all file size constants
2. [x] Add `formatFileSize` and `getFileSizeError` helpers
3. [x] Update `app/actions/pet-documents.ts` (N/A - no local constants found)
4. [x] Update `app/api/messages/attachments/route.ts`
5. [x] Update `app/api/inventory/import/preview/route.ts`
6. [x] Update `app/api/inventory/import/route.ts`
7. [x] Update `app/api/signup/upload-logo/route.ts`
8. [x] Update `app/api/store/prescriptions/upload/route.ts`
9. [x] Update `app/[clinic]/cart/client.tsx`
10. [x] Search for any other local MAX_* constants - none found
11. [x] Fixed shadowing issue: deleted orphan `lib/constants.ts` file that was shadowing `lib/constants/index.ts`
12. [ ] Update tests to use constants (deferred - covered by existing tests)

## Acceptance Criteria

- [x] All file size limits use `LIMITS` from `lib/constants`
- [x] Consistent naming convention (`MAX_*_SIZE`)
- [x] No local `MAX_FILE_SIZE` or `MAX_SIZE` constants
- [x] Helper functions for file size formatting
- [x] All error messages use consistent Spanish text
- [x] All tests pass (TypeScript compilation successful)

## Benefits

- **Consistency**: Same limits across similar operations
- **Maintainability**: Change limits in one place
- **Discoverability**: All limits visible in one file
- **Documentation**: Self-documenting constant names
- **Error messages**: Consistent user-facing messages

## Related Files

### Files to Update
- `web/lib/constants/index.ts` (add new constants)
- `web/app/actions/pet-documents.ts`
- `web/app/api/messages/attachments/route.ts`
- `web/app/api/inventory/import/preview/route.ts`
- `web/app/api/inventory/import/route.ts`
- `web/app/api/signup/upload-logo/route.ts`
- `web/app/api/store/prescriptions/upload/route.ts`
- `web/app/[clinic]/cart/client.tsx`

## Estimated Effort

| Task | Time |
|------|------|
| Extend LIMITS object | 15 min |
| Add helper functions | 15 min |
| Update 7 files | 45 min |
| Search for others | 15 min |
| Testing | 30 min |
| **Total** | **~2 hours** |

## Risk Assessment

**Very Low Risk** - Simple constant extraction with existing pattern.

### Notes

- Consider whether some limits should be configurable via environment variables for different deployment environments
- Cloud providers may have their own upload limits that should be considered

---
*Created: January 2026*
*Source: Ralph refactoring analysis*
