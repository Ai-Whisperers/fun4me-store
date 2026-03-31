# State Management

Client-side state management using Zustand and React Context.

> **Location**: `web/lib/store/`
> **Last Updated**: January 2026

---

## Overview

The platform uses a hybrid state management approach:

| Type | Tool | Use Case |
|------|------|----------|
| **Global UI State** | Zustand | Sidebar, modals, toasts |
| **Feature State** | Zustand | Booking wizard, multi-step flows |
| **Shared Data** | React Context | Cart, wishlist, theme |
| **Server State** | Server Components | Most data fetching |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     State Management                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Zustand     │  │   Context    │  │ Server Components │  │
│  │  Stores      │  │   Providers  │  │   (RSC)           │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────────┤  │
│  │ useUIStore   │  │ CartContext  │  │ Direct DB access │  │
│  │ useBooking   │  │ WishlistCtx  │  │ No client state  │  │
│  │ Store        │  │ NotifyCtx    │  │ Props drilling   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│        ↓                  ↓                    ↓            │
│  UI toggles        Cross-component      Initial data       │
│  Form state        sharing             Page renders        │
│  Wizards           Persistence                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Zustand Stores

### UI Store

Global UI state for layout components.

**Location**: `web/lib/store/ui-store.ts`

```typescript
import { useUIStore } from '@/lib/store/ui-store'

// In a component
function Sidebar() {
  const { sidebarOpen, toggleSidebar, closeSidebar, openSidebar } = useUIStore()

  return (
    <aside className={sidebarOpen ? 'w-64' : 'w-0'}>
      {/* ... */}
    </aside>
  )
}

// In header
function HamburgerButton() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)

  return <button onClick={toggleSidebar}>Menu</button>
}
```

**API:**

```typescript
interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
  openSidebar: () => void
}
```

---

### Booking Store

Multi-step appointment booking wizard state.

**Location**: `web/lib/store/booking-store.ts`

```typescript
import { useBookingStore } from '@/lib/store/booking-store'

// Initialize on page load
function BookingWizard({ clinic, userPets }) {
  const { initialize, step, selection, services } = useBookingStore()

  useEffect(() => {
    initialize(clinic, userPets, initialServiceId, initialPetId)
  }, [])

  return <StepRenderer step={step} />
}

// Update selection
function ServiceStep() {
  const { services, updateSelection, setStep } = useBookingStore()

  const handleSelect = (serviceId: string) => {
    updateSelection({ serviceId })
    setStep('pet')
  }

  return (
    <div>
      {services.map(service => (
        <button key={service.id} onClick={() => handleSelect(service.id)}>
          {service.name}
        </button>
      ))}
    </div>
  )
}

// Submit booking
function ConfirmStep() {
  const { submitBooking, isSubmitting, submitError } = useBookingStore()

  const handleSubmit = async () => {
    const success = await submitBooking()
    if (success) {
      // Redirects to success step automatically
    }
  }

  return (
    <div>
      {submitError && <p className="text-red-500">{submitError}</p>}
      <button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Procesando...' : 'Confirmar Reserva'}
      </button>
    </div>
  )
}
```

**API:**

```typescript
interface BookingState {
  // State
  clinicId: string
  pets: Pet[]
  step: 'service' | 'pet' | 'datetime' | 'confirm' | 'success'
  selection: {
    serviceId: string | null
    petId: string | null
    date: string
    time_slot: string
    notes: string
  }
  isSubmitting: boolean
  submitError: string | null
  services: BookableService[]

  // Actions
  setStep: (step: Step) => void
  updateSelection: (updates: Partial<BookingSelection>) => void
  initialize: (clinic, userPets, initialService?, initialPetId?) => void
  submitBooking: (currentServiceName?: string) => Promise<boolean>
  reset: () => void
}
```

**Features:**

- Transforms JSON services to bookable format
- Auto-selects pet if user has only one
- Skips steps based on pre-selections
- Validates required fields before submit
- Spanish error messages

---

## Zustand Best Practices

### Selector Pattern

Only subscribe to what you need:

```typescript
// Good - selective subscription
const sidebarOpen = useUIStore((state) => state.sidebarOpen)

// Avoid - subscribes to entire store
const store = useUIStore()
```

### Action-Only Hooks

For components that only dispatch actions:

```typescript
// Good - doesn't re-render on state changes
const toggleSidebar = useUIStore((state) => state.toggleSidebar)

// Alternative: stable reference
const toggleSidebar = useUIStore.getState().toggleSidebar
```

### Multiple Selectors

Use `shallow` for multiple values:

```typescript
import { shallow } from 'zustand/shallow'

const { step, selection } = useBookingStore(
  (state) => ({ step: state.step, selection: state.selection }),
  shallow
)
```

---

## Context vs Zustand

### When to Use Context

- Data needs to be shared across distant components
- Requires persistence (localStorage, database)
- Represents user session data (cart, wishlist)
- Needs server-side initialization

### When to Use Zustand

- UI state (modals, drawers, toggles)
- Feature-specific state (wizards, forms)
- No persistence needed
- Simple subscribe/update patterns
- Performance-critical updates

### Current Contexts

| Context | Location | Purpose |
|---------|----------|---------|
| CartContext | `context/cart-context.tsx` | Shopping cart with DB sync |
| WishlistContext | `context/wishlist-context.tsx` | Product wishlist |
| NotificationContext | `context/notification-context.tsx` | Toast notifications |

See [Context Providers](context-providers.md) for detailed documentation.

---

## Helper Functions

### formatPrice()

Format price for display (from booking-store):

```typescript
import { formatPrice } from '@/lib/store/booking-store'

formatPrice(50000)      // "50.000"
formatPrice(null)       // "0"
formatPrice(undefined)  // "0"
```

### getLocalDateString()

Format date for HTML inputs:

```typescript
import { getLocalDateString } from '@/lib/store/booking-store'

getLocalDateString(new Date())  // "2026-01-04"
```

---

## State Flow Example

```
User Flow: Booking an Appointment
─────────────────────────────────

1. Page Load
   └── initialize(clinic, pets)
       └── Services transformed from JSON
       └── Initial step determined
       └── Pet auto-selected if single

2. Select Service
   └── updateSelection({ serviceId })
   └── setStep('pet')

3. Select Pet
   └── updateSelection({ petId })
   └── setStep('datetime')

4. Select Date/Time
   └── updateSelection({ date, time_slot })
   └── setStep('confirm')

5. Confirm & Submit
   └── submitBooking()
       └── isSubmitting = true
       └── API call to createAppointmentJson
       └── success → setStep('success')
       └── error → submitError = message

6. Cleanup
   └── reset() on unmount or new booking
```

---

## Adding a New Store

```typescript
// lib/store/my-feature-store.ts
import { create } from 'zustand'

interface MyFeatureState {
  // State
  items: Item[]
  isLoading: boolean

  // Actions
  addItem: (item: Item) => void
  removeItem: (id: string) => void
  reset: () => void
}

const initialState = {
  items: [],
  isLoading: false,
}

export const useMyFeatureStore = create<MyFeatureState>((set) => ({
  ...initialState,

  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),

  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),

  reset: () => set(initialState),
}))
```

---

## Persistence (If Needed)

Zustand supports middleware for persistence:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useMyStore = create(
  persist<MyState>(
    (set) => ({
      // ... store definition
    }),
    {
      name: 'my-store',  // localStorage key
      partialize: (state) => ({ items: state.items }),  // What to persist
    }
  )
)
```

---

## Related Documentation

- [Context Providers](context-providers.md)
- [Hooks Library](../development/hooks-library.md)
- [Booking System](../features/overview.md#appointments--scheduling)
