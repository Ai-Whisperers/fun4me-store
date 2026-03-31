# Command Palette Module

Refactored command palette component split into focused, maintainable modules.

## Structure

```
command-palette/
├── index.tsx              # Main orchestrator component
├── command-types.ts       # TypeScript type definitions
├── commandFactory.tsx     # Command item creation logic
├── useCommandSearch.ts    # Search and filtering hook
├── useKeyboardNav.ts      # Keyboard navigation hook
├── CommandInput.tsx       # Search input component
├── CommandList.tsx        # Command list rendering
└── README.md             # This file
```

## Module Responsibilities

### `command-types.ts`

- Type definitions for all command-palette-related interfaces
- Category labels for UI display
- No runtime logic, pure types

### `commandFactory.tsx` (Client Component)

- Creates command items with icons and actions
- Handles navigation callbacks
- Combines static commands with recent items
- **Client Component** because it uses JSX elements (icons)

### `useCommandSearch.ts`

- Search and filtering logic
- Fetches recent patients from database
- Groups commands by category
- Flattens commands for keyboard navigation

### `useKeyboardNav.ts`

- Keyboard event handling (Arrow keys, Enter, Escape)
- Navigation between command items
- Selection handling

### `CommandInput.tsx` (Client Component)

- Search input field with autofocus
- ESC keyboard hint
- Mobile close button

### `CommandList.tsx` (Client Component)

- Renders grouped command items
- Handles item selection state
- Auto-scrolls selected item into view
- Empty state display

### `index.tsx` (Client Component)

- Main orchestrator that combines all modules
- State management (query, selectedIndex)
- Animation with Framer Motion
- Footer with keyboard shortcuts

## Usage

The refactored structure maintains backward compatibility through `web/components/ui/command-palette.tsx`:

```tsx
// Import works exactly as before
import { CommandPalette, useCommandPalette } from '@/components/ui/command-palette'

function MyComponent() {
  const { isOpen, open, close } = useCommandPalette()

  return <CommandPalette isOpen={isOpen} onClose={close} />
}
```

## Benefits of Refactoring

1. **Separation of Concerns**: Each file has a single, clear responsibility
2. **Easier Testing**: Hooks and components can be tested independently
3. **Better Readability**: ~100-150 lines per file instead of 601 lines
4. **Type Safety**: Centralized type definitions
5. **Maintainability**: Changes to keyboard nav don't affect search logic
6. **Reusability**: Hooks can be used in other components if needed

## Key Patterns

### Client vs Server Components

- All files with JSX icons are marked `"use client"`
- Hooks don't need the directive (used only in client components)
- Type files have no directive (pure TypeScript)

### State Management

- `index.tsx` owns `selectedIndex` state
- `useCommandSearch` owns `query` and search-related state
- Each module exposes minimal interface

### Type Safety

- All functions have explicit return types
- Props interfaces defined for all components
- No implicit `any` types

## Performance Considerations

- `useMemo` for expensive computations (filtering, grouping)
- `useCallback` for stable function references
- Debouncing not needed (search is synchronous, no API calls)
- Icons pre-rendered (not recreated on each render)

## Future Enhancements

Potential improvements without breaking existing code:

1. **Command Registration API**: Allow other components to register commands
2. **Command History**: Track most-used commands
3. **Fuzzy Search**: Better matching with libraries like `fuse.js`
4. **Command Scoring**: Prioritize results by relevance
5. **Custom Renderers**: Allow custom command item rendering
6. **Keyboard Shortcuts**: Individual shortcuts for commands (e.g., Cmd+N for new patient)
