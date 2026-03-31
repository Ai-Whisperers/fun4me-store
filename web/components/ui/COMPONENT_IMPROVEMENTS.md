# UI Component Improvements - December 2024

This document tracks the recent improvements made to the UI component library as part of the component consolidation and enhancement effort.

## Overview

Added three new reusable UI components to enhance form handling and file management across the platform:

1. **Label** - Standalone label component with required/optional indicators
2. **DatePicker** - Native date input with calendar icon and validation
3. **FileUpload** - Drag & drop file uploader with preview and validation

## New Components

### 1. Label Component

**Location**: `web/components/ui/label.tsx`

**Purpose**: Provide consistent form field labels with required/optional indicators and error states.

**Features**:

- Required indicator (red asterisk)
- Optional indicator (gray text)
- Error state styling (red color)
- Theme-aware colors
- Accessible with proper ARIA attributes

**Usage Example**:

```tsx
import { Label } from '@/components/ui'

<Label htmlFor="email" required>
  Email
</Label>

<Label htmlFor="notes" optional>
  Notas adicionales
</Label>

<Label htmlFor="name" error>
  Nombre
</Label>
```

**Props**:

- `required?: boolean` - Shows red asterisk (\*)
- `optional?: boolean` - Shows "(opcional)" text
- `error?: boolean` - Applies error styling
- All standard HTML label attributes

---

### 2. DatePicker Component

**Location**: `web/components/ui/date-picker.tsx`

**Purpose**: Provide a consistent, accessible date input using native browser date pickers.

**Features**:

- Native browser date picker (optimized for mobile)
- Built on top of existing Input component
- Label, error, and hint support
- Min/max date validation
- Calendar icon indicator
- Theme-aware styling
- Fully accessible

**Usage Example**:

```tsx
import { DatePicker } from '@/components/ui'

<DatePicker
  label="Fecha de nacimiento"
  value={birthDate}
  onChange={setBirthDate}
  max={new Date().toISOString().split('T')[0]} // No future dates
  required
  hint="Selecciona la fecha de nacimiento de tu mascota"
/>

// Date range validation
<DatePicker
  label="Fecha de cita"
  value={appointmentDate}
  onChange={setAppointmentDate}
  min={new Date().toISOString().split('T')[0]} // No past dates
  max={maxDate}
/>
```

**Props**:

- `value?: string` - ISO date string (YYYY-MM-DD)
- `onChange?: (value: string) => void` - Change handler
- `label?: string` - Field label
- `error?: string` - Error message
- `hint?: string` - Help text
- `min?: string` - Minimum allowed date
- `max?: string` - Maximum allowed date
- All standard input attributes (disabled, required, etc.)

**Why Native Date Input?**:

- Better mobile UX (native mobile date pickers)
- Built-in validation
- Consistent browser behavior
- Smaller bundle size (no third-party library)
- Accessibility by default

---

### 3. FileUpload Component

**Location**: `web/components/ui/file-upload.tsx`

**Purpose**: Provide a modern drag-and-drop file upload experience with validation and preview.

**Features**:

- Drag and drop support with visual feedback
- Click to browse files (accessible)
- Multiple file support
- File size validation
- File type filtering (accept attribute)
- File preview list with thumbnails
- Remove individual files
- Keyboard accessible
- Theme-aware styling
- Proper ARIA labels

**Usage Example**:

```tsx
import { FileUpload } from '@/components/ui'

// Image upload
<FileUpload
  label="Foto de la mascota"
  accept="image/*"
  maxSize={5 * 1024 * 1024} // 5MB
  onUpload={(files) => handleImageUpload(files)}
  hint="Formatos: JPG, PNG (máx 5MB)"
/>

// Multiple files
<FileUpload
  label="Documentos médicos"
  accept=".pdf,.doc,.docx"
  multiple
  maxSize={10 * 1024 * 1024} // 10MB
  onUpload={(files) => handleDocumentUpload(files)}
  onRemove={(file) => handleRemove(file)}
/>

// With form validation
<FileUpload
  label="Certificado de vacunación"
  accept="image/*,.pdf"
  onUpload={handleUpload}
  error={errors.certificate}
  required
/>
```

**Props**:

- `accept?: string` - File type filter (e.g., "image/\*", ".pdf")
- `maxSize?: number` - Max file size in bytes (default: 5MB)
- `multiple?: boolean` - Allow multiple files (default: false)
- `onUpload: (files: File[]) => void` - Upload handler (required)
- `onRemove?: (file: File) => void` - Remove handler
- `disabled?: boolean` - Disable interaction
- `label?: string` - Field label
- `hint?: string` - Help text
- `error?: string` - Error message
- `className?: string` - Additional CSS classes

**File Validation**:

- Size validation with user-friendly error messages
- Type filtering via accept attribute
- Shows file size in human-readable format (uses `formatBytes` from `@/lib/formatting`)

**Accessibility**:

- Keyboard navigation support (Enter/Space to open file browser)
- Proper ARIA labels and descriptions
- Role attributes for screen readers
- Error announcements

---

## Updated Exports

The barrel export file (`web/components/ui/index.ts`) has been updated to include:

### New Exports:

```typescript
// Form Components
export { Label } from './label'
export type { LabelProps } from './label'

export { DatePicker } from './date-picker'
export type { DatePickerProps } from './date-picker'

export { FileUpload } from './file-upload'
export type { FileUploadProps } from './file-upload'
```

### Also Re-exported (for convenience):

```typescript
// Tab Components
export {
  Tabs,
  TabList,
  TabTrigger,
  TabPanel,
  PetProfileTabs,
  PetTabPanel,
  DashboardTabs,
} from './tabs'

// Utility Components
export { ProgressStepper } from './progress-stepper'
export { PasswordInput } from './password-input'
export { CommandPalette } from './command-palette'
export { NotificationBanner } from './notification-banner'
export { SlideOver } from './slide-over'
export { SROnly } from './sr-only'
```

---

## Design Patterns

All components follow these established patterns:

### 1. Theme Variables

All colors use CSS variables for theme consistency:

```tsx
// Good
className = 'text-[var(--text-primary)] bg-[var(--bg-muted)]'

// Bad
className = 'text-gray-900 bg-gray-100'
```

### 2. Accessibility

- Proper ARIA attributes
- Semantic HTML
- Keyboard navigation
- Screen reader support
- Focus management

### 3. TypeScript

- Full type safety
- Exported prop types
- Generic constraints where appropriate
- Proper event typing

### 4. Error Handling

- User-friendly error messages
- Validation feedback
- Error state styling
- ARIA error announcements

### 5. Responsive Design

- Mobile-first approach
- Touch-friendly targets (min 44px)
- Responsive spacing
- Truncation for long text

---

## Migration Guide

### Using Label Instead of Inline Labels

**Before**:

```tsx
<label htmlFor="name" className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
  Nombre {required && <span className="text-red-500">*</span>}
</label>
<Input id="name" {...register('name')} />
```

**After**:

```tsx
import { Label, Input } from '@/components/ui'

<Label htmlFor="name" required>Nombre</Label>
<Input id="name" {...register('name')} />
```

### Using DatePicker Instead of Manual Date Inputs

**Before**:

```tsx
<Input
  type="date"
  label="Fecha de nacimiento"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  max={new Date().toISOString().split('T')[0]}
/>
```

**After**:

```tsx
import { DatePicker } from '@/components/ui'

;<DatePicker
  label="Fecha de nacimiento"
  value={date}
  onChange={setDate}
  max={new Date().toISOString().split('T')[0]}
/>
```

### Adding File Upload to Forms

**Example**: Pet photo upload in registration form

```tsx
import { FileUpload } from '@/components/ui'
import { useState } from 'react'

function PetRegistrationForm() {
  const [petPhoto, setPetPhoto] = useState<File[]>([])

  const handlePhotoUpload = async (files: File[]) => {
    setPetPhoto(files)
    // Upload to Supabase Storage
    const file = files[0]
    const { data, error } = await supabase.storage
      .from('pet-photos')
      .upload(`${petId}/${file.name}`, file)
  }

  return (
    <form>
      <FileUpload
        label="Foto de la mascota"
        accept="image/*"
        maxSize={5 * 1024 * 1024}
        onUpload={handlePhotoUpload}
        hint="Formatos aceptados: JPG, PNG (máx 5MB)"
      />
      {/* Other form fields */}
    </form>
  )
}
```

---

## Dependencies

These components use existing utilities:

- `cn()` from `@/lib/utils` - Class name merging
- `formatBytes()` from `@/lib/formatting` - File size formatting
- `Input` component from `@/components/ui/input` - Base input component
- `Button` component from `@/components/ui/button` - Button component
- `lucide-react` - Icons (Calendar, Upload, X, File, Image)

---

## Testing Recommendations

When using these components, test:

1. **Label Component**:
   - Required indicator appears
   - Optional text shows correctly
   - Error state applies red color
   - Associates correctly with form fields (htmlFor)

2. **DatePicker Component**:
   - Min/max validation works
   - Error messages display
   - Calendar icon appears
   - Mobile date picker opens on mobile devices

3. **FileUpload Component**:
   - Drag and drop works
   - File size validation triggers errors
   - Multiple files work when enabled
   - File removal updates state correctly
   - Keyboard navigation (Tab, Enter, Space)
   - Error messages for invalid files

---

## Future Enhancements

Potential improvements for consideration:

1. **Label Component**:
   - Tooltip support for help text
   - Info icon with popover

2. **DatePicker Component**:
   - Custom date picker library option (for advanced features)
   - Date range picker variant
   - Time picker variant

3. **FileUpload Component**:
   - Image preview thumbnails
   - Progress indicator during upload
   - Crop/resize images before upload
   - Paste from clipboard support
   - Webcam capture option

---

## Related Documentation

- Component Guide: `web/components/COMPONENT_GUIDE.md`
- Component Splits: `web/components/COMPONENT_SPLITS.md`
- Formatting Utilities: `web/lib/formatting/`
- Design System: Theme variables in clinic configs

---

## Questions or Issues?

If you encounter any issues with these components:

1. Check the TypeScript types for correct prop usage
2. Verify theme variables are available in your clinic config
3. Test in different browsers for native input behavior
4. Check console for validation errors

---

**Last Updated**: December 19, 2024
**Author**: Refactoring Agent
**Status**: Completed
