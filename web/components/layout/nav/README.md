# Navigation Component Structure

This directory contains the refactored navigation components split from the original 603-line `main-nav.tsx` file.

## File Structure

```
web/components/layout/
├── main-nav.tsx              (142 lines) - Main orchestrator component
└── nav/
    ├── useNavAuth.ts         (65 lines)  - Authentication hook
    ├── ToolsDropdown.tsx     (103 lines) - Tools menu dropdown
    ├── UserMenu.tsx          (65 lines)  - User account menu
    └── MobileMenu.tsx        (310 lines) - Mobile navigation drawer
```

## Component Responsibilities

### `main-nav.tsx` (Orchestrator)

**Purpose:** Main navigation component that coordinates all sub-components.

**Responsibilities:**

- Defines navigation items structure
- Manages cart integration
- Renders desktop and mobile layouts
- Delegates auth to `useNavAuth` hook
- Delegates tools menu to `ToolsDropdown`
- Delegates user actions to `UserMenu`
- Delegates mobile navigation to `MobileMenu`

**Exports:**

- `MainNav` - Main navigation component

**Props:**

```typescript
interface MainNavProps {
  clinic: string
  config: ClinicConfig
}
```

---

### `useNavAuth.ts` (Hook)

**Purpose:** Manages authentication state and logout functionality.

**Responsibilities:**

- Fetches user session from Supabase
- Loads user profile data
- Handles logout logic
- Manages auth state updates
- Provides logout error handling

**Exports:**

```typescript
interface UserProfile {
  id: string
  tenant_id: string
  role: 'owner' | 'vet' | 'admin'
  full_name: string | null
  email: string | null
  phone: string | null
}

interface UseNavAuthReturn {
  user: SupabaseUser | null
  profile: UserProfile | null
  isLoggingOut: boolean
  logoutError: string | null
  handleLogout: () => Promise<void>
}

function useNavAuth(clinic: string): UseNavAuthReturn
```

**Usage:**

```typescript
const { user, profile, isLoggingOut, logoutError, handleLogout } = useNavAuth(clinic)
```

---

### `ToolsDropdown.tsx` (Component)

**Purpose:** Desktop dropdown menu for tools and utilities.

**Responsibilities:**

- Renders tools menu button
- Manages dropdown open/close state
- Handles click outside to close
- Auto-closes on route change
- Displays tools menu items with icons

**Tools Items:**

- Age Calculator
- Toxic Food Checker
- FAQ
- Loyalty Program

**Props:**

```typescript
interface ToolsDropdownProps {
  clinic: string
  config: ClinicConfig
  isActive: (href: string) => boolean
  pathname: string
}
```

**Features:**

- Animated dropdown with Framer Motion
- Accessible (ARIA attributes)
- Keyboard-friendly
- Auto-closes on navigation

---

### `UserMenu.tsx` (Component)

**Purpose:** Desktop user menu with login/logout actions.

**Responsibilities:**

- Displays login/portal link
- Renders logout button for authenticated users
- Shows logout errors as toast
- Manages logout loading state

**Props:**

```typescript
interface UserMenuProps {
  clinic: string
  config: ClinicConfig
  user: SupabaseUser | null
  isActive: (href: string, exact?: boolean) => boolean
  isLoggingOut: boolean
  logoutError: string | null
  handleLogout: () => Promise<void>
}
```

**Features:**

- Conditional rendering based on auth state
- Error toast for logout failures
- Loading state during logout

---

### `MobileMenu.tsx` (Component)

**Purpose:** Full-screen mobile navigation drawer.

**Responsibilities:**

- Renders mobile menu trigger button
- Manages drawer open/close state
- Displays user profile section
- Shows navigation items
- Displays tools section
- Shows account actions
- Handles emergency contact button
- Manages focus trap for accessibility
- Prevents body scroll when open

**Props:**

```typescript
interface MobileMenuProps {
  clinic: string
  config: ClinicConfig
  user: SupabaseUser | null
  profile: UserProfile | null
  navItems: NavItem[]
  isActive: (href: string, exact?: boolean) => boolean
  isLoggingOut: boolean
  handleLogout: () => Promise<void>
}

interface NavItem {
  label: string
  href: string
  exact?: boolean
  icon: LucideIcon
}
```

**Features:**

- Slide-in animation with Framer Motion
- Backdrop overlay
- Portaled to document.body
- Focus trap with keyboard navigation
- ESC key to close
- User avatar with initials
- Book appointment CTA
- Organized sections (Navigation, Tools, Account)
- Emergency button (conditional)
- Footer with copyright

---

## Design Patterns Used

### 1. Separation of Concerns

Each file has a single, well-defined responsibility:

- `useNavAuth`: Authentication logic
- `ToolsDropdown`: Tools menu UI
- `UserMenu`: User actions UI
- `MobileMenu`: Mobile drawer UI
- `main-nav`: Coordination

### 2. Prop Drilling Minimization

The `useNavAuth` hook is called once in `main-nav.tsx` and the results are passed to child components, avoiding duplicate auth calls.

### 3. Composition Over Inheritance

Components are composed together in the main orchestrator rather than using complex inheritance hierarchies.

### 4. Single Responsibility Principle

Each component and hook handles one aspect of navigation:

- Auth state
- Tools menu
- User menu
- Mobile drawer

### 5. Accessibility First

All components include:

- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader labels

---

## Migration Notes

### Before (603 lines)

```typescript
// Single massive file with:
// - Auth logic
// - Tools dropdown
// - User menu
// - Mobile menu
// - All state management
```

### After (620 total lines across 5 files)

```typescript
// Clean separation:
main-nav.tsx      - 142 lines (orchestration)
useNavAuth.ts     - 65 lines  (auth logic)
ToolsDropdown.tsx - 103 lines (tools menu)
UserMenu.tsx      - 65 lines  (user actions)
MobileMenu.tsx    - 310 lines (mobile UI)
```

### Benefits

1. **Maintainability:** Each file is focused and easy to understand
2. **Testability:** Components can be tested in isolation
3. **Reusability:** Hooks and components can be reused elsewhere
4. **Performance:** No change - same functionality, cleaner structure
5. **Developer Experience:** Easier to find and modify specific features

---

## Usage Example

```typescript
import { MainNav } from '@/components/layout/main-nav';

export default function Header({ clinic, config }) {
  return (
    <header>
      <MainNav clinic={clinic} config={config} />
    </header>
  );
}
```

The API remains identical to the original component - this is a pure refactoring with no breaking changes.

---

## Testing Checklist

- [ ] Desktop navigation links work
- [ ] Tools dropdown opens and closes
- [ ] Tools menu items navigate correctly
- [ ] User login/logout flow works
- [ ] Mobile menu opens and closes
- [ ] Mobile menu focus trap works
- [ ] ESC key closes mobile menu
- [ ] Cart icon shows correct count
- [ ] Notification bell renders for logged-in users
- [ ] Active link highlighting works
- [ ] Logout error toast displays
- [ ] Emergency button appears (if configured)
- [ ] User avatar shows correct initial
- [ ] All links navigate to correct routes

---

## Future Improvements

1. **Split MobileMenu further** - Could extract sections into smaller components
2. **Add unit tests** - Test each component and hook independently
3. **Memoization** - Add React.memo for performance optimization
4. **Custom hooks** - Extract more reusable logic (e.g., `useClickOutside`, `useFocusTrap`)
5. **Theme variants** - Support different nav styles per clinic
