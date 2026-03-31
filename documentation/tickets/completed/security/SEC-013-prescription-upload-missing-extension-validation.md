# SEC-013 Prescription Upload Missing Extension Validation

## Priority: P1

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

The prescription upload endpoint at `/api/store/prescriptions/upload` does not validate file extensions against a whitelist, unlike all other upload routes in the codebase which implement the SEC-004 pattern (extension whitelist validation).

While the endpoint validates MIME types, it uses the raw file extension from user input without verification:

```typescript
const extension = file.name.split('.').pop() || 'pdf'
```

This is inconsistent with the SEC-004 security pattern implemented in:
- `web/app/actions/pet-documents.ts` (has `validateExtension()`)
- `web/app/api/messages/attachments/route.ts` (has `validateExtension()`)
- `web/app/api/signup/upload-logo/route.ts` (has extension whitelist)
- `web/app/api/inventory/import/route.ts` (has `validateExtension()`)

## Impact

1. **Path Traversal Risk**: Without extension validation, specially crafted filenames could potentially include path components.
2. **Inconsistent Security Posture**: All other upload endpoints follow SEC-004; this one is an outlier.
3. **Defense-in-Depth Gap**: While MIME type is validated, relying solely on client-provided MIME type without extension validation is incomplete.

## Location

`web/app/api/store/prescriptions/upload/route.ts` lines 39-48

## Proposed Fix

Add extension validation function consistent with other upload routes:

```typescript
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']

function validateExtension(filename: string): string | null {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return null
  }
  return extension
}

// In the handler:
const validExtension = validateExtension(file.name)
if (!validExtension) {
  return apiError('INVALID_FILE_TYPE', HTTP_STATUS.BAD_REQUEST, {
    details: { message: 'Extension de archivo no permitida. Use PDF, JPG o PNG' },
  })
}

// Use validExtension instead of raw extension
const filePath = `prescriptions/${profile.tenant_id}/${user.id}/${timestamp}_${safeName}.${validExtension}`
```

## Acceptance Criteria

- [x] Add `ALLOWED_EXTENSIONS` constant matching `ALLOWED_TYPES`
- [x] Add `validateExtension()` function following SEC-004 pattern
- [x] Validate extension before file processing
- [x] Use validated extension in file path construction
- [x] Return proper Spanish error message for invalid extensions

## Related Files

- `web/app/api/store/prescriptions/upload/route.ts` - Needs fix
- `web/app/api/messages/attachments/route.ts` - Reference implementation
- `web/app/actions/pet-documents.ts` - Reference implementation

## Estimated Effort

1-2 hours

## Testing Notes

- Test with valid extensions: file.pdf, file.jpg, file.png
- Test with invalid extensions: file.exe, file.php, file.html
- Test with double extensions: file.php.pdf (should accept)
- Test with no extension: filename (should reject)
- Test with path components: ../../../etc/passwd.pdf (should accept - extension is valid, path is sanitized elsewhere)
