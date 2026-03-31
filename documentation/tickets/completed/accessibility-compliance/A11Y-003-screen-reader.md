# A11Y-003: Screen Reader Compatibility

## Priority: P2
## Category: Accessibility
## Status: ✅ Complete
## Epic: [EPIC-13: Accessibility & Compliance](../epics/EPIC-13-accessibility-compliance.md)

## Description
Ensure the platform is fully compatible with screen readers through proper ARIA labels, roles, and semantic HTML.

## Current State
- ARIA labels may be missing
- Some components lack semantic HTML
- Dynamic content may not be announced
- Form labels may be incomplete

## Proposed Solution

### ARIA Labels for Icons
```tsx
// components/ui/icon-button.tsx
interface IconButtonProps {
  icon: React.ReactNode;
  label: string; // Required for accessibility
  onClick: () => void;
}

export function IconButton({ icon, label, onClick }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}
```

### Live Regions for Dynamic Content
```tsx
// components/ui/live-region.tsx
export function LiveRegion({ message, type = 'polite' }: { message: string; type?: 'polite' | 'assertive' }) {
  return (
    <div
      role="status"
      aria-live={type}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Usage for notifications
<LiveRegion message="Cita guardada exitosamente" type="polite" />
```

### Semantic Form Labels
```tsx
// components/forms/form-field.tsx
export function FormField({ id, label, error, children }: FormFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {React.cloneElement(children, {
        id,
        'aria-describedby': error ? errorId : descriptionId,
        'aria-invalid': !!error,
      })}
      {error && (
        <p id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

### Table Accessibility
```tsx
// components/data/accessible-table.tsx
export function AccessibleTable({ caption, headers, rows }: TableProps) {
  return (
    <table role="table">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {headers.map((header, i) => (
            <th key={i} scope="col">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Implementation Steps
1. Add alt text to all images
2. Add ARIA labels to icon buttons
3. Implement live regions for notifications
4. Fix form label associations
5. Add table captions and headers
6. Test with NVDA and VoiceOver
7. Document screen reader shortcuts

## Acceptance Criteria
- [x] All images have alt text
- [x] All buttons have accessible names
- [x] Live regions announce updates
- [x] Forms properly labeled
- [x] Tables have captions
- [x] Tested with NVDA/VoiceOver

## Related Files
- `components/**/*.tsx` - All components
- `app/[clinic]/**/*.tsx` - All pages

## Estimated Effort
- 10 hours
  - Image alt text: 2h
  - ARIA labels: 3h
  - Live regions: 2h
  - Form labels: 2h
  - Testing: 1h

## Implementation Notes (January 2026)

### Created Files

**Screen Reader Utilities (`lib/accessibility/screen-reader.ts`):**
- `announce()` - Make announcements to screen readers
- `announceError()` - Assertive announcement for errors
- `announceSuccess()` - Polite announcement for successes
- `announceLoading()` - Loading state announcements
- `generateA11yId()` - Generate unique accessibility IDs
- `ARIA_ROLES` - Spanish descriptions for all ARIA roles
- `ARIA_LABELS` - Spanish labels for common actions
- `describeDataState()` - Generate data state descriptions
- `describePagination()` - Generate pagination descriptions
- `describeSortState()` - Generate sort state descriptions
- `buildAriaDescribedBy()` - Build aria-describedby strings
- `buildAriaLabelledBy()` - Build aria-labelledby strings

**Live Region Component (`components/ui/live-region.tsx`):**
- `LiveRegion` - Base live region component
- `AlertLiveRegion` - Assertive live region for errors
- `StatusLiveRegion` - Polite live region for status updates
- `LoadingLiveRegion` - Loading state announcements

**Announcer Context (`context/announcer-context.tsx`):**
- `AnnouncerProvider` - Global announcement provider
- `useAnnouncer()` - Hook for making announcements
- Supports polite and assertive announcements
- Auto-clears announcements after reading

**Form Field Component (`components/forms/form-field.tsx`):**
- `FormField` - Accessible form field wrapper
- `FormFieldGroup` - Fieldset/legend for grouped fields
- `RequiredIndicator` - Accessible required field indicator
- Automatic aria-describedby, aria-invalid, aria-required

**Accessible Table Component (`components/ui/accessible-table.tsx`):**
- `AccessibleTable` - Full-featured accessible table
- `SimpleTable` - Simple accessible table variant
- Proper caption, scope, and header associations
- aria-sort for sortable columns
- Keyboard navigation for clickable rows

### Existing Components Already Accessible

1. **IconButton** (`components/ui/icon-button.tsx`)
   - Already requires `aria-label` prop
   - Uses `aria-busy` for loading states
   - Uses `aria-hidden` on icons

2. **Modal** (`components/ui/modal.tsx`)
   - Already has `role="dialog"`, `aria-modal`
   - `aria-labelledby`, `aria-describedby`
   - Focus trap and escape key handling

3. **Toast/Notification** (`components/ui/Toast.tsx`, `context/notification-context.tsx`)
   - Already uses `role="alert"`, `aria-live="polite"`

4. **Input/Select/Textarea** (`components/ui/input.tsx`)
   - Already has proper label associations
   - `aria-invalid`, `aria-describedby` for errors
   - Required field indicators

5. **DataTable** (`components/ui/data-table.tsx`)
   - Already has pagination aria-labels

6. **SROnly** (`components/ui/sr-only.tsx`)
   - Screen reader only component for hidden text

### Module Exports

Updated `lib/accessibility/index.ts`:
```typescript
// A11Y-001: WCAG compliance
export * from './types'
export * from './audit-utils'
export * from './checklist'

// A11Y-003: Screen reader support
export * from './screen-reader'
```

### Usage Examples

**Announce operation result:**
```tsx
import { useAnnouncer } from '@/context/announcer-context'

function SaveButton() {
  const { announcePolite, announceAssertive } = useAnnouncer()

  const handleSave = async () => {
    try {
      await save()
      announcePolite('Datos guardados exitosamente')
    } catch (error) {
      announceAssertive('Error al guardar los datos')
    }
  }
}
```

**Live region for loading:**
```tsx
import { LoadingLiveRegion } from '@/components/ui/live-region'

function DataList({ isLoading }) {
  return (
    <>
      <LoadingLiveRegion
        isLoading={isLoading}
        loadingMessage="Cargando mascotas..."
        completeMessage="Mascotas cargadas"
      />
      {/* ... list content ... */}
    </>
  )
}
```

**Accessible form field:**
```tsx
import { FormField } from '@/components/forms/form-field'

<FormField
  id="pet-name"
  label="Nombre de mascota"
  error={errors.name}
  hint="Ingrese el nombre completo"
  required
>
  <input type="text" name="name" value={name} onChange={handleChange} />
</FormField>
```

**Accessible table:**
```tsx
import { AccessibleTable } from '@/components/ui/accessible-table'

<AccessibleTable
  caption="Lista de mascotas registradas"
  headers={[
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'species', label: 'Especie' },
  ]}
  rows={pets.map(pet => ({
    id: pet.id,
    cells: [pet.name, pet.species],
    onClick: () => navigate(`/pets/${pet.id}`),
  }))}
  sortColumn={sortColumn}
  sortDirection={sortDirection}
  onSort={handleSort}
/>
```

### Test Coverage

- `tests/lib/accessibility/screen-reader.test.ts` - 37 tests
- `tests/components/ui/live-region.test.tsx` - 22 tests
- `tests/components/forms/form-field.test.tsx` - 21 tests
- All 80 new tests passing
