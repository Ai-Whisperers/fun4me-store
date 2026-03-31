# SEC-012 Missing HTML Sanitization in dangerouslySetInnerHTML Usage

## Priority: P2

## Category: Security

## Status: ✅ Complete

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Description

Several components use `dangerouslySetInnerHTML` without DOMPurify sanitization, creating potential XSS vulnerabilities. While most affected areas are staff-only, stored XSS could still be exploited through:

1. Compromised admin accounts
2. SQL injection leading to data modification
3. Future feature changes that expose these fields to less-trusted users

### Affected Files (FIXED)

| File | Line | Field | Status |
|------|------|-------|--------|
| `components/store/product-detail/product-tabs.tsx` | 104 | `product.description` | ✅ Fixed |
| `app/[clinic]/dashboard/consents/templates/page.tsx` | 997 | `template.content` | ✅ Fixed |
| `app/[clinic]/dashboard/consents/[id]/page.tsx` | 428 | `renderContent()` | ✅ Fixed |

## Implementation Summary

### Centralized Sanitization Utility

Created `lib/utils/sanitize.ts` with:

- `sanitizeHtml(html, preset)` - Sanitizes HTML with configurable presets
- `createSanitizedHtml(html, preset)` - Returns object for `dangerouslySetInnerHTML`
- Three presets:
  - `richText` - For product descriptions (allows links, formatting)
  - `consent` - For legal documents (no links, allows tables)
  - `basicText` - For user comments (minimal formatting only)

### Files Updated

1. **`components/store/product-detail/product-tabs.tsx`**
   - Added import for `createSanitizedHtml`
   - Changed line 105 to use `createSanitizedHtml(product.description, 'richText')`

2. **`app/[clinic]/dashboard/consents/templates/page.tsx`**
   - Added import for `createSanitizedHtml`
   - Changed line 998 to use `createSanitizedHtml(template.content, 'consent')`

3. **`app/[clinic]/dashboard/consents/[id]/page.tsx`**
   - Added import for `createSanitizedHtml`
   - Changed line 429 to use `createSanitizedHtml(renderContent(), 'consent')`

4. **`lib/utils/index.ts`**
   - Added export for sanitize module

### Test Coverage

Created `tests/unit/utils/sanitize.test.ts` with 36 tests covering:

- XSS prevention (script tags, event handlers, javascript: protocol, iframes, etc.)
- richText preset functionality
- consent preset functionality
- basicText preset functionality
- Edge cases (null, undefined, empty string, nested malicious content)
- Custom configuration support

## Impact

- **Stored XSS**: Prevented - Malicious scripts in product descriptions or consent templates are sanitized
- **Session Hijacking**: Mitigated - Event handlers and script injection blocked
- **Defacement**: Mitigated - Unauthorized HTML elements removed
- **Phishing**: Mitigated - javascript: and data: protocols stripped from links

## Acceptance Criteria

- [x] All `dangerouslySetInnerHTML` usages use DOMPurify sanitization
- [x] Centralized sanitization utility exists with configurable tag allowlists
- [x] No XSS vectors exist in product descriptions or consent templates
- [x] Tests verify script tags and event handlers are stripped

## Related Files

- `web/lib/utils/sanitize.ts` (NEW)
- `web/tests/unit/utils/sanitize.test.ts` (NEW)
- `web/components/store/product-detail/product-tabs.tsx`
- `web/app/[clinic]/dashboard/consents/templates/page.tsx`
- `web/app/[clinic]/dashboard/consents/[id]/page.tsx`
- `web/components/consents/signing-form/consent-preview.tsx` (reference)

---
*Ticket created: January 2026*
*Completed: January 2026*
