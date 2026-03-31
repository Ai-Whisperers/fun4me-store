# AUDIT-101c: Extract Inventory Import Wizard Component

## Priority: P1 - High
## Category: Refactoring / Technical Debt
## Status: ✅ Complete (Pre-existing)
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Parent Ticket: [AUDIT-101](./AUDIT-101-god-component-inventory.md)

## Description

Extract the CSV/Excel import wizard functionality from the inventory client into a dedicated modal component with step-based flow.

## Current State

The import wizard logic spans approximately lines 200-400 and 1500-2100 in `web/app/[clinic]/dashboard/inventory/client.tsx`, including:
- File upload handling
- Preview data parsing
- Column mapping
- Confirmation step
- Import execution

**Current import state:**
```typescript
const [importMode, setImportMode] = useState<'idle' | 'upload' | 'preview' | 'importing' | 'complete'>('idle')
const [importFile, setImportFile] = useState<File | null>(null)
const [previewData, setPreviewData] = useState<PreviewData | null>(null)
```

## Proposed Solution

Refactor existing `ImportWizard` component or create enhanced version:

```typescript
// components/dashboard/inventory/ImportWizard/index.tsx
interface ImportWizardProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (results: ImportResults) => void
  clinic: string
}

export function ImportWizard({
  isOpen,
  onClose,
  onImportComplete,
  clinic,
}: ImportWizardProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload')

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      {step === 'upload' && <FileUploadStep onNext={...} />}
      {step === 'mapping' && <ColumnMappingStep onNext={...} onBack={...} />}
      {step === 'preview' && <PreviewStep onNext={...} onBack={...} />}
      {step === 'importing' && <ImportingStep />}
      {step === 'complete' && <CompleteStep onClose={onClose} />}
    </Modal>
  )
}
```

### Sub-components to create:

1. **FileUploadStep** - Drag-drop file upload, format validation
2. **ColumnMappingStep** - Map CSV columns to product fields
3. **PreviewStep** - Show preview table with validation status
4. **ImportingStep** - Progress indicator during import
5. **CompleteStep** - Success/error summary

## Implementation Steps

1. [ ] Create `components/dashboard/inventory/ImportWizard/` directory
2. [ ] Create `FileUploadStep.tsx` component
3. [ ] Create `ColumnMappingStep.tsx` component
4. [ ] Create `PreviewStep.tsx` component
5. [ ] Create `ImportingStep.tsx` component
6. [ ] Create `CompleteStep.tsx` component
7. [ ] Create main `index.tsx` orchestrator
8. [ ] Define shared types (`ImportResults`, `PreviewRow`, etc.)
9. [ ] Move API call logic to dedicated hook or utility
10. [ ] Export from barrel file
11. [ ] Update parent to use modal component
12. [ ] Remove extracted code from client.tsx
13. [ ] Test full import flow

## Acceptance Criteria

- [ ] ImportWizard main component is under 150 lines
- [ ] Each step component is under 200 lines
- [ ] File upload accepts CSV/Excel
- [ ] Column mapping is intuitive
- [ ] Preview shows validation errors clearly
- [ ] Progress indicator during import
- [ ] Success/error summary on completion
- [ ] Modal can be closed at any step
- [ ] No console.log statements
- [ ] Proper TypeScript types

## Related Files

- `web/app/[clinic]/dashboard/inventory/client.tsx` (source)
- `web/components/dashboard/inventory/ImportWizard.tsx` (existing - may need refactor)
- `web/components/dashboard/inventory/ImportWizard/` (new directory)

## Estimated Effort

- 5-6 hours

## Dependencies

- Consider coordination with existing `ImportWizard` component
- API endpoints for preview and import must remain stable

---

## Resolution Summary

**Status**: Pre-existing extraction - no work required

The ImportWizard component was already fully modularized in a previous development effort. The component structure exists at:

```
components/dashboard/inventory/import-wizard/
├── wizard.tsx        # Main wizard component
├── source-step.tsx   # Source selection step
├── preview-step.tsx  # Data preview step
├── mapping-step.tsx  # Column mapping step
├── review-step.tsx   # Review changes step
├── complete-step.tsx # Import complete step
├── step-indicator.tsx # Step navigation
├── types.ts          # Shared types
└── index.ts          # Barrel exports
```

The client.tsx already imports and uses `<ImportWizard />` as a controlled modal component.
