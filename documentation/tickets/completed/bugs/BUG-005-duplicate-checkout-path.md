# BUG-005 Duplicate Checkout Path Without Stock Validation

## Priority: P1

## Category: Bug

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Resolution

**Completed: January 2026**

**Solution Applied: Option A** - Removed the unused `checkoutOrder` action entirely.

### Investigation

1. Audited all imports of `@/app/actions/store`:
   - Only `web/app/[clinic]/store/product/[id]/page.tsx` imports from this file
   - That file only imports `getStoreProduct`, not `checkoutOrder`

2. Searched for `checkoutOrder` usage across entire codebase:
   - Found zero call sites
   - The action was dead code

3. All checkout flows already use `/api/store/checkout` which:
   - Uses atomic `process_checkout` RPC function
   - Validates stock before proceeding
   - Decrements inventory atomically
   - Handles prescription requirements
   - Returns detailed stock errors

### Changes Made

- Removed `checkoutOrder` function from `web/app/actions/store.ts` (lines 168-246)
- No imports needed to be updated (function was never used)

## Original Description

The `checkoutOrder` function in `web/app/actions/store.ts` provided an alternate checkout path that bypassed the atomic `process_checkout` database function. This created potential for:

1. **No stock validation** - Items could be purchased without checking inventory
2. **No atomic operations** - Invoice and items created in separate transactions
3. **No reservation handling** - Cart reservations not properly converted
4. **Race conditions** - Multiple users could purchase the same items

## Acceptance Criteria - All Met

- [x] No duplicate checkout paths exist
- [x] All checkout operations use atomic `process_checkout` function
- [x] Stock is validated before any purchase completes
- [x] Dead code removed (implicit regression prevention)

## Files Changed

- `web/app/actions/store.ts` - Removed unused `checkoutOrder` function

---
*Ticket closed: January 2026*
*Resolution: Dead code removal - function was never used*
