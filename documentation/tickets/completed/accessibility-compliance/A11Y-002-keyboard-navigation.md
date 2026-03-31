# A11Y-002: Keyboard Navigation Improvements

## Priority: P2
## Category: Accessibility
## Status: ✅ Complete
## Epic: [EPIC-13: Accessibility & Compliance](../epics/EPIC-13-accessibility-compliance.md)

## Description
Ensure all interactive elements are accessible via keyboard navigation with visible focus indicators.

## Current State
- Some components not keyboard accessible
- Focus indicators may be missing or unclear
- No skip links for navigation
- Tab order may be illogical

## Proposed Solution

### Focus Styles
```css
/* styles/accessibility.css */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Remove default outline only when using :focus-visible */
:focus:not(:focus-visible) {
  outline: none;
}

/* High contrast focus for buttons */
button:focus-visible,
a:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.3);
}
```

### Skip Links
```tsx
// components/layout/skip-links.tsx
export function SkipLinks() {
  return (
    <div className="skip-links">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      <a href="#main-navigation" className="skip-link">
        Saltar a la navegación
      </a>
    </div>
  );
}
```

### Keyboard Trap Prevention
```tsx
// hooks/use-focus-trap.ts
export function useFocusTrap(ref: RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const focusableElements = ref.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [ref, isActive]);
}
```

## Implementation Steps
1. Audit current keyboard navigation
2. Add visible focus indicators to all interactive elements
3. Implement skip links on all pages
4. Fix tab order issues
5. Add focus trapping to modals
6. Test with keyboard-only navigation
7. Document keyboard shortcuts

## Acceptance Criteria
- [x] All interactive elements focusable
- [x] Visible focus indicators
- [x] Skip links on all pages
- [x] Logical tab order
- [x] Modal focus trapping
- [x] Escape key closes modals

## Related Files
- `components/ui/*.tsx` - UI components
- `components/layout/*.tsx` - Layout components
- `styles/globals.css` - Global styles
- `lib/hooks/use-focus-trap.ts` - Focus trap hook (NEW)
- `lib/hooks/use-roving-focus.ts` - Roving focus hook (NEW)
- `components/layout/skip-links.tsx` - Skip links component (NEW)

## Estimated Effort
- 8 hours
  - Focus indicators: 2h
  - Skip links: 1h
  - Tab order fixes: 3h
  - Modal focus trapping: 2h

## Implementation Notes (January 2026)

### Created Files

**Hooks (`lib/hooks/`):**
1. `use-focus-trap.ts` - Focus trap implementation:
   - `useFocusTrap()` - Traps focus within a container
   - `useFocusTrapRef()` - Returns a ref with focus trap
   - `getFocusableElements()` - Finds all focusable elements
   - Options: `autoFocus`, `returnFocus`, `onEscape`, `initialFocus`
   - Handles Tab wrapping, Escape key, and focus restoration

2. `use-roving-focus.ts` - Roving tabindex pattern:
   - `useRovingFocus()` - For toolbars, menus, tab lists
   - Supports horizontal, vertical, and both directions
   - Home/End key support
   - Loop option for wrapping navigation
   - `getGroupProps()` for ARIA attributes

**Components:**
1. `components/layout/skip-links.tsx` - Skip navigation component:
   - Skip to main content link
   - Skip to navigation link
   - Support for additional custom skip targets
   - Visually hidden until focused
   - i18n support with Spanish translations

### Hook Exports

Added to `lib/hooks/index.ts`:
```typescript
// Focus management (A11Y-002)
export { useFocusTrap, useFocusTrapRef, getFocusableElements } from './use-focus-trap'
export { useRovingFocus, getGroupProps } from './use-roving-focus'
```

### Usage Examples

**Focus Trap in Modal:**
```tsx
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, { isActive: isOpen, onEscape: onClose })

  return isOpen ? <div ref={modalRef}>{children}</div> : null
}
```

**Roving Focus in Toolbar:**
```tsx
function Toolbar() {
  const { getItemProps } = useRovingFocus({ direction: 'horizontal' })

  return (
    <div {...getGroupProps()}>
      <button {...getItemProps(0)}>Bold</button>
      <button {...getItemProps(1)}>Italic</button>
      <button {...getItemProps(2)}>Underline</button>
    </div>
  )
}
```

**Skip Links in Layout:**
```tsx
function Layout({ children }) {
  return (
    <>
      <SkipLinks />
      <nav id="main-navigation">...</nav>
      <main id="main-content">{children}</main>
    </>
  )
}
```

### Test Coverage
- 24 unit tests for focus trap hook
- 20 unit tests for roving focus hook
- All tests passing (44 total for keyboard navigation)
