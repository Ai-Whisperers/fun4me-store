# Command Palette Architecture

## Component Hierarchy

```
CommandPalette (index.tsx)
│
├── State Management
│   ├── selectedIndex: number
│   └── isOpen: boolean (from props)
│
├── Hooks
│   ├── useCommandSearch()
│   │   ├── query: string
│   │   ├── setQuery()
│   │   ├── groupedCommands: GroupedCommands
│   │   ├── flatCommands: CommandItem[]
│   │   └── recentPatients: RecentPatient[]
│   │
│   └── useKeyboardNav()
│       ├── handles: ArrowUp, ArrowDown, Enter, Escape
│       ├── onNavigate: (direction) => void
│       └── onSelect: () => void
│
└── Child Components
    ├── CommandInput
    │   ├── query
    │   ├── onChange
    │   └── onClose
    │
    └── CommandList
        ├── groupedCommands
        ├── flatCommands
        ├── selectedIndex
        └── onSelectIndex
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interaction                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   CommandPalette (index.tsx)                 │
│                                                              │
│  [Cmd+K] → open()                                           │
│  [ESC]   → close()                                          │
│  [Type]  → setQuery()                                       │
│  [Arrow] → handleNavigate()                                 │
│  [Enter] → handleSelect()                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              useCommandSearch (Search Logic)                 │
│                                                              │
│  Input:  clinic, isOpen, onClose                            │
│  Output: query, setQuery, groupedCommands, flatCommands     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Fetch recent patients (Supabase)                  │  │
│  │ 2. Create commands (commandFactory)                  │  │
│  │ 3. Filter by query (useMemo)                         │  │
│  │ 4. Group by category (useMemo)                       │  │
│  │ 5. Flatten for keyboard nav (useMemo)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│  commandFactory.tsx      │      │  useKeyboardNav.ts       │
│                          │      │                          │
│  createCommands()        │      │  Listens to keyboard     │
│  ├── Navigation (8)      │      │  ├── ArrowDown → +1      │
│  ├── Actions (4)         │      │  ├── ArrowUp   → -1      │
│  ├── Tools (6)           │      │  ├── Enter     → select  │
│  └── Recent (5-8)        │      │  └── Escape    → close   │
│                          │      │                          │
│  Returns: CommandItem[]  │      │  Calls: onNavigate()     │
└──────────────────────────┘      └──────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Render Layer                            │
│                                                              │
│  ┌────────────────────┐       ┌─────────────────────────┐   │
│  │  CommandInput      │       │  CommandList            │   │
│  │  ├── Search icon   │       │  ├── Empty state        │   │
│  │  ├── Input field   │       │  ├── Category headers   │   │
│  │  ├── ESC hint      │       │  ├── Command items      │   │
│  │  └── Close button  │       │  └── Auto-scroll        │   │
│  └────────────────────┘       └─────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Footer                                               │  │
│  │  ├── Arrow keys hint                                 │  │
│  │  ├── Enter hint                                      │  │
│  │  └── "Cmd+K to open" hint                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Type Dependencies

```
command-types.ts (Pure types, no dependencies)
    │
    ├──> commandFactory.tsx (uses CommandItem, RecentPatient)
    │       │
    │       └──> useCommandSearch.ts (uses commandFactory)
    │               │
    │               └──> index.tsx (uses hook)
    │
    ├──> CommandInput.tsx (no type imports)
    │       │
    │       └──> index.tsx
    │
    ├──> CommandList.tsx (uses CommandItem, GroupedCommands)
    │       │
    │       └──> index.tsx
    │
    └──> useKeyboardNav.ts (uses CommandItem)
            │
            └──> index.tsx

command-palette.tsx (Re-exports from index.tsx)
```

## State Lifecycle

### 1. Component Mount (isOpen: false → true)

```
1. User presses Cmd+K
2. useCommandPalette() sets isOpen = true
3. CommandPalette receives isOpen prop
4. useCommandSearch fetches recent patients (useEffect)
5. CommandInput auto-focuses (useEffect)
6. selectedIndex resets to 0
7. AnimatePresence triggers enter animation
```

### 2. User Types Query

```
1. User types in CommandInput
2. onChange fires → setQuery(value)
3. useCommandSearch filters commands (useMemo)
4. groupedCommands updates
5. flatCommands updates
6. selectedIndex resets to 0 (useEffect)
7. CommandList re-renders with new results
```

### 3. User Navigates

```
1. User presses Arrow Down
2. useKeyboardNav intercepts keydown
3. handleNavigate("down") called
4. setSelectedIndex(i => min(i + 1, max))
5. CommandList re-renders
6. Auto-scroll to selected item (useEffect)
```

### 4. User Selects

```
1. User presses Enter (or clicks item)
2. handleSelect() called
3. flatCommands[selectedIndex].action() executes
4. action() calls navigate() or navigateExternal()
5. Router pushes new path
6. onClose() called
7. Modal closes
```

### 5. Component Unmount (isOpen: true → false)

```
1. User presses ESC or clicks backdrop
2. onClose() called
3. Parent sets isOpen = false
4. AnimatePresence triggers exit animation
5. Component unmounts
6. Event listeners cleaned up (useEffect return)
```

## Performance Optimizations

### Memoization Strategy

```typescript
// useCommandSearch.ts
const commands = useMemo(() => createCommands(...), [deps]);
const filteredCommands = useMemo(() => filter(...), [commands, query]);
const groupedCommands = useMemo(() => group(...), [filteredCommands]);
const flatCommands = useMemo(() => flatten(...), [groupedCommands]);
```

**Why:** Prevents unnecessary re-computations on every render.

### Callback Stability

```typescript
// useCommandSearch.ts
const navigate = useCallback((path) => { ... }, [router, clinic, onClose]);
const navigateExternal = useCallback((href) => { ... }, [router, onClose]);
```

**Why:** Prevents commandFactory from recreating all commands on every render.

### Lazy Data Fetching

```typescript
// useCommandSearch.ts
useEffect(() => {
  if (!isOpen || !clinic) return // Exit early
  fetchRecent() // Only fetch when modal opens
}, [isOpen, clinic])
```

**Why:** Doesn't hit database until user actually opens the palette.

## Extension Points

### 1. Add New Command Category

```typescript
// command-types.ts
export interface CommandItem {
  category: "actions" | "navigation" | "tools" | "recent" | "admin"; // Add here
}

export const CATEGORY_LABELS = {
  // ... existing
  admin: "Administración", // Add here
};

// commandFactory.tsx
export function createCommands() {
  const items: CommandItem[] = [
    // ... existing
    {
      id: "admin-users",
      title: "Gestionar usuarios",
      icon: <Users />,
      action: () => navigate("/dashboard/admin/users"),
      category: "admin", // Use new category
    },
  ];
}

// CommandList.tsx and useCommandSearch.ts automatically handle new category
```

### 2. Add Command Scoring/Ranking

```typescript
// command-types.ts
export interface CommandItem {
  // ... existing
  score?: number // Add optional score
}

// useCommandSearch.ts
const filteredCommands = useMemo(() => {
  if (!query.trim()) return commands

  const lowerQuery = query.toLowerCase()
  return commands
    .filter(/* existing filter */)
    .map((cmd) => ({
      ...cmd,
      score: calculateScore(cmd, lowerQuery), // Add scoring
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0)) // Sort by score
}, [commands, query])
```

### 3. Add Command History

```typescript
// Create new file: useCommandHistory.ts
export function useCommandHistory() {
  const [history, setHistory] = useState<string[]>([])

  const recordCommand = (id: string) => {
    setHistory((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 10))
  }

  return { history, recordCommand }
}

// index.tsx
const { history, recordCommand } = useCommandHistory()

const handleSelect = useCallback(() => {
  if (flatCommands[selectedIndex]) {
    recordCommand(flatCommands[selectedIndex].id)
    flatCommands[selectedIndex].action()
  }
}, [flatCommands, selectedIndex, recordCommand])

// commandFactory.tsx - boost history items
const isInHistory = history.includes(item.id)
```

### 4. Add Fuzzy Search

```typescript
// Install: npm install fuse.js
import Fuse from 'fuse.js'

// useCommandSearch.ts
const filteredCommands = useMemo(() => {
  if (!query.trim()) return commands

  const fuse = new Fuse(commands, {
    keys: ['title', 'subtitle', 'keywords'],
    threshold: 0.3,
  })

  return fuse.search(query).map((result) => result.item)
}, [commands, query])
```

## Testing Strategy

### Unit Tests

```typescript
// commandFactory.test.tsx
describe('commandFactory', () => {
  it('creates all command categories', () => {
    const commands = createCommands({ ... });
    expect(commands.some(c => c.category === 'actions')).toBe(true);
    expect(commands.some(c => c.category === 'navigation')).toBe(true);
  });
});

// useCommandSearch.test.ts
describe('useCommandSearch', () => {
  it('filters commands by query', () => {
    const { result } = renderHook(() => useCommandSearch({ ... }));
    act(() => result.current.setQuery('vacuna'));
    expect(result.current.flatCommands.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
// CommandPalette.test.tsx
describe('CommandPalette', () => {
  it('navigates on Enter key', () => {
    const mockRouter = { push: jest.fn() };
    render(<CommandPalette isOpen onClose={jest.fn()} />);
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(mockRouter.push).toHaveBeenCalled();
  });
});
```

### E2E Tests

```typescript
// command-palette.spec.ts (Playwright)
test('opens command palette with Cmd+K', async ({ page }) => {
  await page.goto('/terrapet/dashboard')
  await page.keyboard.press('Meta+k')
  await expect(page.locator('[placeholder*="Buscar"]')).toBeVisible()
})
```

## Conclusion

The modular architecture provides:

- Clear separation of concerns
- Easy testability
- Simple extension points
- Optimized performance
- Type-safe interfaces
- Comprehensive documentation
