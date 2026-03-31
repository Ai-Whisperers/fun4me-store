# Component Refactoring - Large File Splits (PERF-002)

This document tracks the splitting of large component files into smaller, focused modules.

## Summary

Split 3 large component files (totaling 1,660 lines) into organized directory structures with focused sub-components.

## 1. signing-form.tsx → signing-form/

**Original:** 598 lines
**New Structure:** 8 files in `components/consents/signing-form/`

### Files Created:

- `index.tsx` (main component - 231 lines)
- `types.ts` (TypeScript interfaces - 41 lines)
- `use-signature.ts` (signature hook - 114 lines)
- `signature-pad.tsx` (reusable signature component - 105 lines)
- `custom-fields.tsx` (dynamic form fields - 95 lines)
- `consent-preview.tsx` (document preview - 53 lines)
- `id-verification.tsx` (ID verification form - 60 lines)
- `witness-signature.tsx` (witness signature component - 78 lines)

### Key Improvements:

- Extracted signature handling logic into reusable `useSignature()` hook
- Created reusable `SignaturePad` component (used for both owner and witness signatures)
- Separated form field rendering logic
- Isolated ID verification UI
- Better separation of concerns

### Usage:

```tsx
import SigningForm from '@/components/consents/signing-form'
import type { SigningFormData } from '@/components/consents/signing-form'
```

---

## 2. blanket-consents.tsx → blanket-consents/

**Original:** 547 lines
**New Structure:** 4 files in `components/consents/blanket-consents/`

### Files Created:

- `index.tsx` (main component - 178 lines)
- `types.ts` (TypeScript interfaces - 14 lines)
- `consent-card.tsx` (individual consent display - 69 lines)
- `add-consent-modal.tsx` (modal form - 360 lines)

### Key Improvements:

- Separated consent list logic from modal form
- Isolated consent card rendering
- Cleaner state management
- Modal is now a standalone component

### Usage:

```tsx
import BlanketConsents from '@/components/consents/blanket-consents'
```

---

## 3. admission-form.tsx → admission-form/

**Original:** 515 lines
**New Structure:** 6 files in `components/hospital/admission-form/`

### Files Created:

- `index.tsx` (main component - 151 lines)
- `types.ts` (TypeScript interfaces - 35 lines)
- `progress-bar.tsx` (step progress UI - 22 lines)
- `pet-search-step.tsx` (step 1 - patient selection - 171 lines)
- `kennel-selection-step.tsx` (step 2 - kennel & details - 178 lines)
- `treatment-plan-step.tsx` (step 3 - treatment & contact - 127 lines)

### Key Improvements:

- Multi-step wizard broken into individual step components
- Each step is self-contained and testable
- Shared types in single file
- Progress indicator extracted
- Better data flow between steps

### Usage:

```tsx
import AdmissionForm from '@/components/hospital/admission-form'
```

---

## Benefits

### Performance

- Smaller bundle chunks (code-splitting friendly)
- Faster re-renders (isolated component updates)
- Better tree-shaking potential

### Maintainability

- Easier to locate and fix bugs
- Smaller files are easier to understand
- Clear separation of concerns

### Testability

- Individual components can be unit tested
- Hooks can be tested independently
- Easier to mock dependencies

### Reusability

- `SignaturePad` component is now reusable
- `useSignature` hook can be used in other forms
- Step components can be reordered or reused

---

## Migration Notes

All imports remain the same - no breaking changes:

- `@/components/consents/signing-form` → now imports from `index.tsx`
- `@/components/consents/blanket-consents` → now imports from `index.tsx`
- `@/components/hospital/admission-form` → now imports from `index.tsx`

## Old Files Removed

- ✅ `components/consents/signing-form.tsx` (598 lines)
- ✅ `components/consents/blanket-consents.tsx` (547 lines)
- ✅ `components/hospital/admission-form.tsx` (515 lines)

**Total lines reduced from monolithic files:** 1,660 lines
**Total lines in new structure:** ~1,900 lines (accounting for improved organization and type definitions)

---

## File Size Comparison

### Before:

```
signing-form.tsx:      598 lines
blanket-consents.tsx:  547 lines
admission-form.tsx:    515 lines
TOTAL:                1,660 lines (3 files)
```

### After:

```
signing-form/:        777 lines (8 files, avg 97 lines/file)
blanket-consents/:    621 lines (4 files, avg 155 lines/file)
admission-form/:      684 lines (6 files, avg 114 lines/file)
TOTAL:              2,082 lines (18 files, avg 116 lines/file)
```

While total line count increased slightly due to:

- Type definitions separated into dedicated files
- Better code organization with proper spacing
- Additional exports and imports

Each individual file is now **significantly smaller** and **more focused**.

---

## Next Steps

Consider splitting these additional large files:

- `invoice-form.tsx` (600+ lines)
- `lab-order-form.tsx` (500+ lines)
- Any other files exceeding 400 lines

---

_Generated: December 2024_
_Related Ticket: PERF-002_
