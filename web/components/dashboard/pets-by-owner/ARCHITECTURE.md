# PetsByOwner Component Architecture

## Component Tree

```
PetsByOwner (index.tsx)
│
├─ State Management
│  ├─ selectedOwnerId: string | null
│  ├─ searchQuery: string
│  └─ useOwnerFiltering(owners, searchQuery) → filteredOwners
│
├─ Left Panel (Owner Selection)
│  │
│  ├─ SearchHeader
│  │  ├─ Input field with icon
│  │  └─ Results counter
│  │
│  └─ OwnerList
│     ├─ Empty state (no owners)
│     └─ OwnerListItem[] (multiple)
│        ├─ Avatar
│        ├─ Name + active indicator
│        ├─ Pets count + phone
│        └─ Selection indicator
│
└─ Right Panel (Details Display)
   │
   ├─ [When owner selected]
   │  │
   │  ├─ OwnerDetailsCard
   │  │  ├─ Header
   │  │  │  ├─ Large avatar
   │  │  │  ├─ Name + status badge
   │  │  │  └─ Member since date
   │  │  ├─ Quick actions
   │  │  │  ├─ Nueva Cita button
   │  │  │  └─ Ver Ficha button
   │  │  └─ Contact grid
   │  │     ├─ Email
   │  │     ├─ Phone
   │  │     ├─ Address
   │  │     └─ Last visit
   │  │
   │  └─ PetsSection
   │     ├─ Header (title + add button)
   │     ├─ Empty state (no pets)
   │     └─ PetCard[] (grid)
   │        ├─ Photo/emoji
   │        ├─ Name + gender badge
   │        ├─ Species + breed
   │        ├─ Info badges
   │        │  ├─ Age
   │        │  ├─ Neutered
   │        │  └─ Microchip
   │        └─ Quick actions (hover)
   │           ├─ New appointment
   │           └─ Vaccines
   │
   └─ [No owner selected]
      └─ EmptyState
         ├─ Icon
         ├─ Title
         └─ Description
```

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      PetsByOwner                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Props: { clinic: string, owners: Owner[] }         │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├─ State: searchQuery
                   │     │
                   │     └─► useOwnerFiltering(owners, searchQuery)
                   │              │
                   │              └─► filteredOwners
                   │
                   ├─ State: selectedOwnerId
                   │     │
                   │     └─► selectedOwner = find(filteredOwners, id)
                   │
                   ├─► SearchHeader { searchQuery, onSearchChange, resultCount }
                   │
                   ├─► OwnerList { owners: filteredOwners, selectedOwnerId, onSelectOwner }
                   │        │
                   │        └─► OwnerListItem[] { owner, isSelected, onClick }
                   │
                   └─► [if selectedOwner]
                          ├─► OwnerDetailsCard { owner, clinic }
                          └─► PetsSection { owner, clinic }
                                   │
                                   └─► PetCard[] { pet, clinic }
```

## File Dependencies

```
index.tsx
├── imports types.ts
│   └── Pet, Owner, PetsByOwnerProps
│
├── imports useOwnerFiltering.ts
│   └── uses types.ts (Owner)
│
├── imports SearchHeader.tsx
├── imports OwnerList.tsx
│   ├── imports OwnerListItem.tsx
│   │   └── imports utils.ts (isClientActive)
│   └── uses types.ts (Owner)
│
├── imports OwnerDetailsCard.tsx
│   ├── imports utils.ts (formatDate, isClientActive)
│   └── uses types.ts (Owner)
│
├── imports PetsSection.tsx
│   ├── imports PetCard.tsx
│   │   ├── imports utils.ts (calculateAge, getSpeciesEmoji)
│   │   └── uses types.ts (Pet)
│   └── uses types.ts (Owner)
│
└── imports EmptyState.tsx
```

## State Management

### Local State (useState)

```typescript
// Owner selection
const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(
  owners.length > 0 ? owners[0].id : null
)

// Search input
const [searchQuery, setSearchQuery] = useState('')
```

### Derived State (useMemo via custom hook)

```typescript
// useOwnerFiltering.ts
const filteredOwners = useMemo(() => {
  if (!searchQuery.trim()) return owners
  const query = searchQuery.toLowerCase()
  return owners.filter(/* filtering logic */)
}, [owners, searchQuery])
```

### Computed Values

```typescript
// Selected owner from filtered list
const selectedOwner =
  filteredOwners.find((o) => o.id === selectedOwnerId) || filteredOwners[0] || null
```

## Component Responsibilities

### index.tsx (Orchestrator)

- **State management**: selectedOwnerId, searchQuery
- **Data filtering**: Uses custom hook
- **Layout composition**: Assembles sub-components
- **Props distribution**: Passes data to children

### SearchHeader.tsx (Presentation)

- **Search input** rendering
- **Results counter** display
- **User input** handling

### OwnerList.tsx (Container)

- **List rendering** logic
- **Empty state** conditional
- **Props delegation** to items

### OwnerListItem.tsx (Presentation)

- **Individual owner** display
- **Selection state** visual feedback
- **Click handling**

### OwnerDetailsCard.tsx (Presentation)

- **Owner information** display
- **Contact details** grid
- **Quick actions** buttons
- **Status indicators**

### PetsSection.tsx (Container)

- **Pets grid** rendering
- **Empty state** conditional
- **Add pet** action

### PetCard.tsx (Presentation)

- **Pet information** display
- **Photo/emoji** rendering
- **Badges** (age, neutered, chip)
- **Quick actions** (hover)

### EmptyState.tsx (Presentation)

- **Empty selection** message
- **Icon** display

### utils.ts (Pure Functions)

- **formatDate**: Date formatting
- **calculateAge**: Age calculation
- **isClientActive**: Activity check
- **getSpeciesEmoji**: Emoji mapping

### useOwnerFiltering.ts (Custom Hook)

- **Search logic**: Filter owners by query
- **Memoization**: Performance optimization

### types.ts (Type Definitions)

- **Pet interface**: Pet data structure
- **Owner interface**: Owner data structure
- **PetsByOwnerProps interface**: Component props

## CSS Variables Used

```css
/* Theme colors (from clinic theme) */
--primary              /* Primary brand color */
--text-primary         /* Main text color */
--text-secondary       /* Secondary text color */
--bg-default           /* Default background */
--bg-subtle            /* Subtle background */
--border-color         /* Border color */

/* Standard Tailwind utilities */
/* bg-blue-50, bg-green-50, etc. for colored icons */
/* bg-green-500, bg-orange-400 for status indicators */
```

## Accessibility Features

- **Keyboard navigation**: Buttons and links are keyboard accessible
- **Focus indicators**: CSS hover and focus states
- **Semantic HTML**: Proper heading hierarchy (h2, h3, h4)
- **Alt text**: Images have alt attributes
- **ARIA labels**: Title attributes for icons
- **Color contrast**: Follows theme variables for readability

## Performance Optimizations

1. **useMemo in useOwnerFiltering**: Prevents unnecessary filtering
2. **Component memoization**: Small components reduce re-render scope
3. **Conditional rendering**: Only renders selected owner details
4. **Key props**: Proper keys for list items
5. **Event handler stability**: Callbacks don't recreate on every render

## Styling Approach

- **Tailwind CSS**: Utility-first classes
- **CSS Variables**: Theme integration
- **Responsive**: Mobile-first design
- **States**: Hover, focus, active, disabled
- **Transitions**: Smooth animations

## Testing Strategy

### Unit Tests (Recommended)

```
__tests__/
├── utils.test.ts               # Test pure functions
├── useOwnerFiltering.test.ts   # Test custom hook
├── PetCard.test.tsx            # Test presentation
├── OwnerList.test.tsx          # Test list rendering
└── index.test.tsx              # Test integration
```

### Integration Tests

- Test search functionality end-to-end
- Test owner selection flow
- Test navigation to pet/appointment pages

### E2E Tests (Playwright)

- Full user journey: search → select → view details → quick actions

## Future Enhancements

1. **Virtualization**: For large owner lists (react-window)
2. **Pagination**: Alternative to infinite scroll
3. **Sorting**: By name, last visit, pets count
4. **Filtering**: By status (active/inactive)
5. **Export**: CSV/PDF of owner list
6. **Bulk actions**: Select multiple owners
7. **Favorites**: Pin frequently accessed owners
8. **Recent**: Show recently viewed owners
