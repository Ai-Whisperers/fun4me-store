# REF-012: Extract Magic Numbers to Named Constants

**Category**: Refactoring  
**Priority**: P3 - Low  
**Status**: Open  
**Effort**: Ongoing (incremental)  
**Impact**: Low - Code readability  
**Created**: 2025-01-19  
**Source**: critique/02-code-quality-roast.md (QUAL-008)

## Summary

Magic numbers scattered throughout codebase with unclear meaning.

## Problem

```typescript
// What does 90 mean?
return daysSinceVisit <= 90;

// What does 48 mean?
className="min-h-[48px]";

// What does 5000 mean?
setTimeout(callback, 5000);
```

## Solution

```typescript
// lib/constants/business.ts
export const BUSINESS_RULES = {
  ACTIVE_CLIENT_THRESHOLD_DAYS: 90,
  REMINDER_WINDOW_DAYS: 30,
  APPOINTMENT_SLOT_MINUTES: 30,
};

// lib/constants/ui.ts
export const UI = {
  TOUCH_TARGET_MIN_HEIGHT: 48,
  TOAST_DURATION_MS: 5000,
  DEBOUNCE_DELAY_MS: 300,
};

// Usage
return daysSinceVisit <= BUSINESS_RULES.ACTIVE_CLIENT_THRESHOLD_DAYS;
className="min-h-[${UI.TOUCH_TARGET_MIN_HEIGHT}px]";
setTimeout(callback, UI.TOAST_DURATION_MS);
```

## Implementation Strategy

Fix incrementally when touching files.

## Acceptance Criteria
- [ ] Business rule numbers extracted
- [ ] UI constants extracted
- [ ] Time-related constants extracted
- [ ] Constants properly documented

## Related
- REF-011: Extract duplicate strings
- Code readability improvements
