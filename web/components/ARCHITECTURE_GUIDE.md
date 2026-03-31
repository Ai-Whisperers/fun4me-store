# Component Architecture Guide

This document outlines the modular, professional React component architecture implemented across the application.

## 🏗️ Architecture Overview

The component architecture follows a **modular, centralized, and professional** approach with clear separation of concerns:

### Core Principles

- **Modular**: Components are broken into focused, reusable modules
- **Centralized**: Shared logic lives in dedicated hooks and utilities
- **Professional**: TypeScript-first, error boundaries, accessibility, and best practices
- **DRY**: No code duplication, abstracted common patterns

## 📁 Directory Structure

```
web/components/
├── shared/                 # Shared/reusable components
│   ├── error-boundary.tsx # Error boundary component
│   ├── loading-spinner.tsx # Consistent loading indicators
│   ├── empty-state.tsx     # Empty state displays
│   ├── filter-section.tsx  # Reusable filter sections
│   ├── active-filters.tsx  # Active filter display
│   └── index.ts           # Centralized exports
├── ui/                    # Base UI components (existing)
├── [domain]/             # Domain-specific components
│   ├── index.ts          # Domain exports
│   └── [component]/
│       ├── index.tsx     # Main component
│       ├── types.ts      # TypeScript interfaces
│       └── [subcomponent].tsx
└── ARCHITECTURE_GUIDE.md # This file
```

## 🎣 Custom Hooks (`/hooks/`)

### Core Hooks

#### `useAsyncData<T>`

Generic data fetching with loading/error states and retry logic.

```typescript
const { data, isLoading, error, refetch } = useAsyncData(() => fetch('/api/data'), [dependencies], {
  retryCount: 3,
  refetchOnWindowFocus: true,
})
```

#### `useForm`

Complete form state management with validation.

```typescript
const form = useForm({
  initialValues: { email: '' },
  validationRules: {
    email: required('Email required'),
  },
})

const { value, onChange, onBlur, error } = form.getFieldProps('email')
```

#### `useModal`

Simple modal state management.

```typescript
const modal = useModal();
return (
  <button onClick={modal.open}>Open Modal</button>
  <Modal isOpen={modal.isOpen} onClose={modal.close} />
);
```

#### `useExpandableSections`

Manages collapsible sections state.

```typescript
const { expandedSections, toggleSection } = useExpandableSections({
  section1: true,
  section2: false,
})
```

#### `useFilterData`

Specialized hook for filter data fetching.

```typescript
const { categories, brands, isLoading, error } = useFilterData(clinicId)
```

### Utility Hooks

#### `useDebounce`

Debounces values (already existed).

```typescript
const debouncedValue = useDebounce(value, 500)
```

## 🧩 Shared Components (`/shared/`)

### Error Handling

#### `ErrorBoundary`

Catches JavaScript errors in component tree.

```typescript
<ErrorBoundary fallback={<CustomError />}>
  <ComponentThatMightError />
</ErrorBoundary>
```

#### `LoadingSpinner`

Consistent loading indicators.

```typescript
<LoadingSpinner size="lg" text="Loading..." />
<LoadingSpinner fullScreen overlay />
```

#### `EmptyState`

Professional empty state displays.

```typescript
<EmptyState
  icon={<Users />}
  title="No clients found"
  description="Add your first client to get started"
  action={{ label: "Add Client", onClick: handleAdd }}
/>
```

### Filter Components

#### `FilterSection`

Reusable filter sections with expand/collapse.

```typescript
<FilterSection
  title="Categories"
  options={categories}
  selectedValue={selectedCategory}
  onChange={setSelectedCategory}
  isExpanded={expanded}
  onToggle={toggle}
  renderOption={(cat) => cat.name}
  showCounts
/>
```

#### `ActiveFilters`

Displays currently active filters with remove buttons.

```typescript
<ActiveFilters
  selectedCategory={category}
  selectedBrand={brand}
  categories={categories}
  brands={brands}
  onCategoryChange={setCategory}
  onBrandChange={setBrand}
/>
```

## 🛠️ Utilities (`/lib/utils/`)

### API Client (`api-client.ts`)

Centralized API communication with error handling.

```typescript
import { apiClient } from '@/lib/utils'

// GET request
const response = await apiClient.get('/api/data')

// POST request
const result = await apiClient.post('/api/create', { name: 'John' })
```

### Formatting (`formatting.ts`)

Consistent data formatting utilities.

```typescript
import { formatCurrency, formatPhoneNumber, formatDate } from '@/lib/utils'

formatCurrency(1000000, 'PYG') // ₲ 1.000.000
formatPhoneNumber('0981123456') // 0981 123 456
formatDate(new Date()) // "21 dic 2025"
```

### Validation (`validation.ts`)

Reusable validation rules.

```typescript
import { required, email, minLength, createValidator } from '@/lib/utils'

const rules = {
  email: createValidator(required(), email()),
  password: createValidator(required(), minLength(8)),
}
```

## 🔄 Refactoring Patterns

### Before: Monolithic Component

```typescript
function CatalogFilters() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then(setCategories)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  // 200+ lines of mixed UI and logic...
}
```

### After: Modular Architecture

```typescript
function CatalogFilters() {
  const { categories, isLoading, error } = useFilterData(clinic);
  const { expandedSections, toggleSection } = useExpandableSections();

  if (error) return <ErrorState />;

  return (
    <div>
      <FilterSection
        title="Categories"
        options={categories}
        selectedValue={selectedCategory}
        onChange={setSelectedCategory}
        isExpanded={expandedSections.categories}
        onToggle={() => toggleSection('categories')}
        isLoading={isLoading}
        renderOption={(cat) => cat.name}
        showCounts
      />
    </div>
  );
}
```

## 📋 Implementation Checklist

### Component Refactoring

- [ ] Extract data fetching to `useAsyncData` or custom hooks
- [ ] Use `useForm` for form state management
- [ ] Wrap in `ErrorBoundary` for error handling
- [ ] Use `LoadingSpinner` for loading states
- [ ] Use `EmptyState` for empty data
- [ ] Break large components into smaller, focused modules

### Code Quality

- [ ] TypeScript interfaces for all props and state
- [ ] Proper error handling with user-friendly messages
- [ ] Accessibility attributes (ARIA labels, keyboard navigation)
- [ ] Responsive design considerations
- [ ] Performance optimizations (memo, callbacks)

### Testing

- [ ] Unit tests for custom hooks
- [ ] Component tests with different states
- [ ] Error boundary tests
- [ ] Accessibility testing

## 🎯 Benefits

### Developer Experience

- **Faster Development**: Reusable hooks and components reduce boilerplate
- **Easier Testing**: Isolated logic in hooks, focused components
- **Better DX**: Clear patterns, consistent APIs
- **Type Safety**: Full TypeScript coverage

### Code Quality

- **Maintainable**: Small, focused modules
- **DRY**: No code duplication
- **Reliable**: Error boundaries prevent crashes
- **Accessible**: Built-in accessibility patterns

### Performance

- **Smaller Bundles**: Tree-shakable utilities
- **Efficient Re-renders**: Proper memoization patterns
- **Loading States**: Better perceived performance

### User Experience

- **Error Recovery**: Graceful error handling
- **Loading Feedback**: Consistent loading indicators
- **Accessibility**: Screen reader support, keyboard navigation

## 🚀 Migration Strategy

1. **Audit Existing Components**: Identify candidates for refactoring
2. **Create Shared Utilities**: Build hooks and components as needed
3. **Refactor Incrementally**: Update one component at a time
4. **Update Documentation**: Keep COMPONENT_GUIDE.md current
5. **Test Thoroughly**: Ensure no regressions

## 📚 Related Documentation

- [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) - Component usage examples
- [COMPONENT_SPLITS.md](COMPONENT_SPLITS.md) - Large component refactoring
- [hooks/README.md](../../hooks/README.md) - Hook documentation
- [lib/utils/README.md](../../lib/utils/README.md) - Utilities documentation

---

**Last Updated**: December 21, 2025
**Architecture Version**: 2.0
