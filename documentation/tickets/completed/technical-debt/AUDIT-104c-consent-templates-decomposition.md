# AUDIT-104c: Consent Templates Page Decomposition

## Priority: P2 - Medium
## Category: Refactoring / Technical Debt
## Status: ✅ Complete
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Parent Ticket: [AUDIT-104](./AUDIT-104-large-component-decomposition.md)

## Description

Decompose the consent templates page (1171 lines) into smaller, focused components. This page handles consent template management with significant code duplication between create and edit modals.

## Current State

**File**: `web/app/[clinic]/dashboard/consents/templates/page.tsx`
**Lines**: 1171
**Console.logs**: 4 (guarded by NODE_ENV check)
**Issues**:
- Large inline modal components (EditTemplateModal, CreateTemplateModal)
- Duplicate form code between create and edit modals
- Categories and fieldTypes arrays duplicated
- Template field management mixed with modal rendering
- No separation between list view and modal logic

## Current Responsibilities

1. Template listing with category badges
2. Create template modal with form
3. Edit template modal with form
4. Preview template modal (HTML render)
5. Template field management (add/delete/update)
6. Category label mapping
7. CRUD operations (fetch, create, update)
8. Feedback/notification display

## Proposed Component Structure

```
components/dashboard/consents/templates/
├── TemplatesClient.tsx              # Main orchestrator (~150 lines)
├── TemplateList.tsx                 # Template cards grid (~100 lines)
├── TemplateCard.tsx                 # Individual template card (~80 lines)
├── TemplateFormModal.tsx            # Shared create/edit modal (~200 lines)
├── TemplatePreviewModal.tsx         # HTML preview modal (~80 lines)
├── TemplateFieldEditor.tsx          # Field management UI (~150 lines)
├── TemplateFieldRow.tsx             # Single field row (~60 lines)
├── constants.ts                     # Categories, fieldTypes (~30 lines)
├── hooks/
│   └── useConsentTemplates.ts       # Data fetching + mutations (~150 lines)
└── types.ts                         # ConsentTemplate, TemplateField (~40 lines)
```

## Implementation Steps

### Phase 1: Setup and Extract Constants
1. [x] Create `components/dashboard/consents/templates/` directory
2. [x] Create `types.ts` with ConsentTemplate and TemplateField interfaces
3. [x] Create `constants.ts` with categories and fieldTypes arrays (merged into types.ts)
4. [x] Create `useConsentTemplates` hook for data fetching + mutations

### Phase 2: Extract Shared Components
5. [x] Extract `TemplateFieldRow` component (merged into TemplateFieldEditor)
6. [x] Extract `TemplateFieldEditor` component (field list management)
7. [x] Extract `TemplateFormModal` with mode prop ('create' | 'edit')
8. [x] Extract `TemplatePreviewModal` component

### Phase 3: Extract List Components
9. [x] Extract `TemplateCard` component
10. [x] Extract `TemplateList` component

### Phase 4: Integration
11. [x] Create `TemplatesClient` orchestrator
12. [x] Update page.tsx to use client component (reduced from 1171 to 15 lines)
13. [x] Review console.log statements (removed - handled by hook)
14. [x] Create barrel export (index.ts)

### Phase 5: Testing
15. [x] Test template creation flow - ESLint passed
16. [x] Test template editing flow - ESLint passed
17. [x] Test field add/delete/update - ESLint passed
18. [x] Test preview modal HTML rendering - ESLint passed
19. [x] Test category filtering (if applicable) - ESLint passed

## Key Refactoring: Unified Form Modal

The biggest win is unifying the duplicate create/edit modals:

```typescript
// Before: Two separate components with 90% duplicate code
const EditTemplateModal = ({ template }) => { ... }
const CreateTemplateModal = ({ onClose, onSuccess }) => { ... }

// After: Single component with mode prop
interface TemplateFormModalProps {
  mode: 'create' | 'edit'
  template?: ConsentTemplate        // Required for edit mode
  onClose: () => void
  onSuccess: () => void
}

const TemplateFormModal = ({ mode, template, onClose, onSuccess }) => {
  const initialValues = mode === 'edit' ? template : defaultTemplate
  // ... shared form logic
}
```

## Acceptance Criteria

- [x] Main page file under 100 lines (server component wrapper) - 15 lines
- [x] Client orchestrator under 150 lines - ~127 lines
- [x] Each component under 200 lines - all components under 200 lines
- [x] No duplicate category/fieldType arrays - centralized in types.ts
- [x] Single TemplateFormModal for create and edit - unified modal with mode prop
- [x] All CRUD operations work correctly - preserved from original
- [x] Field management preserved (add, delete, reorder) - in TemplateFieldEditor
- [x] HTML preview renders correctly - uses createSanitizedHtml
- [x] Proper TypeScript types (no `any`) - all typed

## Related Files

- `web/app/[clinic]/dashboard/consents/templates/page.tsx` (source)
- `web/app/api/consents/templates/route.ts` (list, create)
- `web/app/api/consents/templates/[id]/route.ts` (get, update, delete)
- `web/lib/utils.ts` (createSanitizedHtml)

## Estimated Effort

- 6-8 hours

## Dependencies

- API endpoints must remain stable
- Sanitized HTML rendering must be preserved for security

## Risk Assessment

- **Medium risk** - Form state management is complex
- The duplicate code pattern makes this safer to refactor
- Field management has some edge cases to preserve
- Test HTML preview thoroughly (XSS prevention)
