// Tailwind class merging (shadcn/ui)
export * from './cn'

// Core utilities
export * from './api-client'
export * from './formatting'
export * from './validation'
export * from './sanitize'

// Type safety utilities
export * from './type-guards'
export * from './map'

// Domain-specific utilities
export * from './pet-size'
export * from './cart-utils'

// Performance utilities
export * from './memoize'

// Calendar utilities (Google/Outlook link generation)
export * from './calendar'

// Note: format-compat.ts provides backward compatibility shims.
// It's intentionally NOT re-exported here to avoid conflicts.
// Files using old formatting imports should update to use '@/lib/formatting'.
