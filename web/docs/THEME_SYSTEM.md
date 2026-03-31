# Theme System Guide - Vete Platform

**Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Active

This document explains how to use the centralized theme system for consistent, maintainable styling across all clinics.

---

## Table of Contents

1. [Overview](#overview)
2. [Theme Structure](#theme-structure)
3. [Using CSS Variables](#using-css-variables)
4. [Migration Guide](#migration-guide)
5. [Color Reference](#color-reference)
6. [Best Practices](#best-practices)

---

## Overview

### The Problem

Hardcoded Tailwind colors (e.g., `bg-blue-500`, `text-red-600`) prevent:

- **Theme customization** per clinic
- **Brand consistency** across the app
- **Easy color updates** (requires find/replace across codebase)
- **Dark mode support** (future requirement)

### The Solution

Use CSS variables defined in each clinic's `theme.json`:

```typescript
// ❌ WRONG - Hardcoded colors
<button className="bg-blue-500 text-white hover:bg-blue-600">
  Click me
</button>

// ✅ CORRECT - Theme variables
<button className="bg-[var(--primary)] text-[var(--text-invert)] hover:bg-[var(--primary-dark)]">
  Click me
</button>
```

---

## Theme Structure

### Theme File Location

Each clinic has its own theme:

```
web/.content_data/
  ├── terrapet/
  │   └── theme.json        # Adris theme
  ├── petlife/
  │   └── theme.json        # PetLife theme
  └── _TEMPLATE/
      └── theme.json        # Template for new clinics
```

### Theme JSON Structure

```json
{
  "colors": {
    "primary": { "main": "#3B82F6", "light": "#60A5FA", "dark": "#2563EB", ... },
    "secondary": { "main": "#10B981", ... },
    "background": { "default": "#FAFAFA", "paper": "#FFFFFF", ... },
    "text": { "primary": "#18181B", "secondary": "#52525B", ... },
    "status": {
      "success": { "main": "#22C55E", "bg": "#F0FDF4", ... },
      "warning": { "main": "#F59E0B", "bg": "#FFFBEB", ... },
      "error": { "main": "#EF4444", "bg": "#FEF2F2", ... },
      "info": { "main": "#3B82F6", "bg": "#EFF6FF", ... }
    },
    "neutral": { "50": "#fafafa", "100": "#f4f4f5", ... }
  }
}
```

### How Themes Are Applied

1. `app/[clinic]/layout.tsx` loads the clinic's `theme.json`
2. CSS variables are injected into the page via `<style>` tag
3. Components use CSS variables via Tailwind's arbitrary values

---

## Using CSS Variables

### Basic Usage

Use Tailwind's arbitrary value syntax with CSS variables:

```tsx
// Background colors
className = 'bg-[var(--primary)]' // Primary brand color
className = 'bg-[var(--bg-default)]' // Default background
className = 'bg-[var(--bg-paper)]' // Card/paper background

// Text colors
className = 'text-[var(--text-primary)]' // Primary text
className = 'text-[var(--text-secondary)]' // Secondary text
className = 'text-[var(--text-muted)]' // Muted/subtle text

// Border colors
className = 'border-[var(--border-default)]' // Default border
className = 'border-[var(--border-light)]' // Light border

// Status colors
className = 'bg-[var(--status-success-bg)]' // Success background
className = 'text-[var(--status-error-main)]' // Error text
```

### Hover & Focus States

```tsx
// Hover states
className = 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'

// Focus states
className = 'focus:ring-[var(--primary)] focus:border-[var(--primary)]'

// Interactive states
className = 'hover:bg-[var(--interactive-hover)]'
```

### Common Patterns

#### Buttons

```tsx
// Primary button
<button className="
  bg-[var(--primary)]
  text-[var(--text-invert)]
  hover:bg-[var(--primary-dark)]
  rounded-lg px-4 py-2
">
  Primary Action
</button>

// Secondary button
<button className="
  border border-[var(--border-default)]
  text-[var(--text-primary)]
  hover:bg-[var(--interactive-hover)]
  rounded-lg px-4 py-2
">
  Secondary Action
</button>

// Danger button
<button className="
  bg-[var(--status-error-main)]
  text-white
  hover:bg-[var(--status-error-dark)]
  rounded-lg px-4 py-2
">
  Delete
</button>
```

#### Cards

```tsx
<div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-paper)] p-6 shadow-lg">
  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Card Title</h3>
  <p className="text-[var(--text-secondary)]">Card content here</p>
</div>
```

#### Status Indicators

```tsx
// Success badge
<span className="
  inline-flex items-center gap-1
  bg-[var(--status-success-bg)]
  text-[var(--status-success-main)]
  border border-[var(--status-success-border)]
  rounded-full px-2.5 py-0.5 text-xs font-medium
">
  Active
</span>

// Error alert
<div className="
  bg-[var(--status-error-bg)]
  text-[var(--status-error-main)]
  border-l-4 border-[var(--status-error-main)]
  rounded-lg p-4
">
  Error message here
</div>
```

#### Forms

```tsx
<input
  type="text"
  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--input-border-focus)] focus:ring focus:ring-[var(--input-ring)]"
/>
```

---

## Migration Guide

### Step-by-Step Migration

#### Step 1: Identify Hardcoded Colors

```bash
# Find hardcoded background colors
grep -r "bg-blue-500" . --include="*.tsx"

# Find hardcoded text colors
grep -r "text-red-600" . --include="*.tsx"
```

#### Step 2: Choose Appropriate CSS Variable

Use this mapping table:

| Hardcoded Color              | CSS Variable                 | Context             |
| ---------------------------- | ---------------------------- | ------------------- |
| `bg-blue-500`, `bg-blue-600` | `var(--primary)`             | Primary brand color |
| `bg-green-500`               | `var(--status-success-main)` | Success states      |
| `bg-red-500`, `bg-red-600`   | `var(--status-error-main)`   | Error states        |
| `bg-yellow-500`              | `var(--status-warning-main)` | Warning states      |
| `bg-white`                   | `var(--bg-paper)`            | Cards, modals       |
| `bg-gray-50`                 | `var(--bg-default)`          | Page background     |
| `bg-gray-100`                | `var(--bg-subtle)`           | Subtle backgrounds  |
| `text-gray-900`              | `var(--text-primary)`        | Primary text        |
| `text-gray-600`              | `var(--text-secondary)`      | Secondary text      |
| `text-gray-400`              | `var(--text-muted)`          | Muted text          |
| `border-gray-200`            | `var(--border-light)`        | Light borders       |
| `border-gray-300`            | `var(--border-default)`      | Default borders     |

#### Step 3: Replace

```tsx
// BEFORE
<button className="bg-blue-500 text-white hover:bg-blue-600">
  Submit
</button>

// AFTER
<button className="bg-[var(--primary)] text-[var(--text-invert)] hover:bg-[var(--primary-dark)]">
  Submit
</button>
```

#### Step 4: Test

1. View the component in the browser
2. Check that colors match the theme
3. Verify hover/focus states work correctly

---

## Color Reference

### Available CSS Variables

```
# Primary Colors
--primary              # Main brand color
--primary-light        # Lighter variant
--primary-dark         # Darker variant
--primary-contrast     # Contrast text (usually white)
--primary-50 to --primary-950    # Full scale

# Secondary Colors
--secondary            # Secondary brand color
--secondary-light
--secondary-dark
--secondary-contrast
--secondary-50 to --secondary-950

# Background
--bg-default           # Main page background
--bg-paper             # Cards, modals
--bg-subtle            # Subtle backgrounds
--bg-dark              # Dark backgrounds
--bg-surface           # Surface elements
--bg-surface-elevated  # Elevated surfaces

# Text
--text-primary         # Main text
--text-secondary       # Secondary text
--text-muted           # Muted/subtle text
--text-invert          # Inverted text (on dark bg)
--text-link            # Link color
--text-link-hover      # Link hover color
--text-disabled        # Disabled text

# Borders
--border-light         # Light borders
--border-default       # Default borders
--border-dark          # Dark borders
--border-focus         # Focus state borders

# Status - Success
--status-success-main
--status-success-light
--status-success-dark
--status-success-bg
--status-success-border

# Status - Warning
--status-warning-main
--status-warning-light
--status-warning-dark
--status-warning-bg
--status-warning-border

# Status - Error
--status-error-main
--status-error-light
--status-error-dark
--status-error-bg
--status-error-border

# Status - Info
--status-info-main
--status-info-light
--status-info-dark
--status-info-bg
--status-info-border

# Neutral Scale
--neutral-50 to --neutral-950

# Interactive
--interactive-hover
--interactive-active
--interactive-focus
--interactive-focus-ring
--interactive-disabled
--interactive-selected

# Inputs
--input-bg
--input-border
--input-border-hover
--input-border-focus
--input-placeholder
--input-ring

# Charts
--chart-1 through --chart-12
```

---

## Best Practices

### DO ✅

- **Use CSS variables** for all colors
- **Follow semantic naming** - use `--status-success-main` not `--green-500`
- **Test across themes** - Check both light themes (Adris, PetLife)
- **Use status colors** for success/warning/error states
- **Use neutral scale** for grays (not hardcoded gray-500)

### DON'T ❌

- **Don't hardcode colors** - `bg-blue-500` is forbidden
- **Don't use hex colors** directly in className
- **Don't assume colors** - Adris uses blue, PetLife uses teal
- **Don't use color literals** in inline styles (use CSS vars there too)
- **Don't mix approaches** - If component uses CSS vars, use them everywhere

### When to Create New Variables

Create new CSS variables when:

- Color is used in 3+ places
- Color has semantic meaning (e.g., "pending status")
- Color needs to change per clinic theme

Add to `theme.json`:

```json
{
  "colors": {
    "custom": {
      "pending": "#FEF3C7",
      "pending-text": "#92400E"
    }
  }
}
```

---

## Component Examples

### Navigation Header

```tsx
<header className="sticky top-0 z-50 border-b border-[var(--border-light)] bg-[var(--bg-paper)]">
  <div className="container mx-auto flex items-center justify-between px-4 py-3">
    <div className="text-xl font-bold text-[var(--primary)]">Vete</div>
    <nav className="flex items-center gap-6">
      <a href="/" className="text-[var(--text-secondary)] hover:text-[var(--primary)]">
        Inicio
      </a>
      <button className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[var(--text-invert)] hover:bg-[var(--primary-dark)]">
        Iniciar Sesión
      </button>
    </nav>
  </div>
</header>
```

### Data Table

```tsx
<table className="w-full">
  <thead className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
    <tr>
      <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
        Nombre
      </th>
      <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
        Estado
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-[var(--border-light)] hover:bg-[var(--interactive-hover)]">
      <td className="px-4 py-3 text-[var(--text-primary)]">Max</td>
      <td className="px-4 py-3">
        <span className="inline-block rounded-full bg-[var(--status-success-bg)] px-2 py-1 text-xs text-[var(--status-success-main)]">
          Activo
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

### Modal

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Overlay */}
  <div className="absolute inset-0 bg-[var(--bg-surface-overlay)]" />

  {/* Modal */}
  <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border-light)] bg-[var(--bg-paper)] p-6 shadow-2xl">
    <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">Modal Title</h2>
    <p className="mb-6 text-[var(--text-secondary)]">Modal content here.</p>
    <div className="flex justify-end gap-3">
      <button className="rounded-lg border border-[var(--border-default)] px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--interactive-hover)]">
        Cancel
      </button>
      <button className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[var(--text-invert)] hover:bg-[var(--primary-dark)]">
        Confirm
      </button>
    </div>
  </div>
</div>
```

---

## Testing Themes

### Visual Testing

1. **Switch between clinics**: `/terrapet` vs `/petlife`
2. **Check all states**: Hover, focus, active, disabled
3. **Verify contrast**: Text should be readable on all backgrounds
4. **Test components**: Buttons, forms, cards, tables, modals

### Automated Testing

```tsx
// In component tests
import { render } from '@testing-library/react'

test('uses theme variables', () => {
  const { container } = render(<Button>Test</Button>)
  const button = container.querySelector('button')

  // Verify CSS variable usage (className contains var(--)
  expect(button?.className).toContain('var(--primary)')
})
```

---

## Migration Status

**Current State** (January 2026):

- ❌ **~6,000 hardcoded color instances** across app
- ✅ **Theme system fully implemented** and working
- ✅ **Some components already migrated** (faq, platform sections)
- ⏳ **Gradual migration in progress**

**Priority Areas for Migration**:

1. **Dashboard components** (high visibility)
2. **Portal pages** (customer-facing)
3. **Shared UI components** (affects entire app)
4. **Landing pages** (brand consistency)

---

## Future Enhancements

- [ ] Dark mode support
- [ ] Automatic theme contrast validation
- [ ] Theme preview tool
- [ ] ESLint rule to prevent hardcoded colors
- [ ] Automated migration script

---

## Resources

- Theme Template: `.content_data/_TEMPLATE/theme.json`
- Example Usage: `app/faq/page.tsx`
- Tailwind Docs: [Arbitrary Values](https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values)

---

**Last Review**: January 2026  
**Next Review**: Quarterly
