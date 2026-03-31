# Formatting Utilities Migration Guide

This document explains the new consolidated formatting module and how to migrate from old formatting functions.

## Overview

All formatting utilities have been consolidated into a single module at `@/lib/formatting` with the following structure:

```
web/lib/formatting/
├── currency.ts       # Currency and price formatting
├── date.ts          # Date and time formatting
├── number.ts        # Number formatting
├── text.ts          # Text utilities
└── index.ts         # Barrel export
```

## New Modules

### Currency Formatting (`@/lib/formatting/currency.ts`)

```typescript
import { formatPrice, formatCurrency, formatPriceGs, formatPriceRange } from '@/lib/formatting'

// Format price in Paraguayan Guaraníes
formatPrice(150000) // "₲ 150.000"
formatPriceGs(150000) // "150.000 Gs" (legacy format)

// Format in different currencies
formatCurrency(99.99, 'USD') // "$99.99"
formatCurrency(150000, 'PYG') // "₲ 150.000"

// Parse currency strings
parseCurrency('₲ 150.000') // 150000

// Price ranges
formatPriceRange(50000, 150000) // "₲ 50.000 - ₲ 150.000"
formatFromPrice(50000) // "Desde ₲ 50.000"

// Round currency
roundCurrency(150000.6, 'PYG') // 150001
```

### Date Formatting (`@/lib/formatting/date.ts`)

```typescript
import { formatDate, formatDateTime, formatTime, formatRelative, formatAge } from '@/lib/formatting'

// Basic date formatting
formatDate(new Date('2024-12-19')) // "19/12/2024"
formatDate('2024-12-19', 'dd MMM yyyy') // "19 dic 2024"

// Date with time
formatDateTime('2024-12-19T14:30:00') // "19/12/2024 a las 14:30"

// Time only
formatTime('2024-12-19T14:30:00') // "14:30"

// Relative dates
formatRelative(new Date()) // "Hoy a las 14:30"
formatRelative(yesterday) // "Ayer a las 10:15"

// Age formatting
formatAge('2022-06-15') // "2 años, 6 meses"
formatAgeInDays('2024-12-01') // "18 días"

// Date ranges
formatDateRange('2024-12-19T10:00', '2024-12-19T12:00')
// "19/12/2024 10:00 - 12:00"

// ISO date for inputs
getLocalDateString(new Date('2024-12-19')) // "2024-12-19"
```

### Number Formatting (`@/lib/formatting/number.ts`)

```typescript
import {
  formatNumber,
  formatPercentage,
  formatBytes,
  formatWeight,
  formatTemperature,
} from '@/lib/formatting'

// Basic number formatting
formatNumber(1500) // "1.500"
formatNumber(1500.567, 2) // "1.500,57"

// Percentages
formatPercentage(0.15) // "15,0%"
formatPercentage(0.1567, 2) // "15,67%"

// File sizes
formatBytes(1536000) // "1,5 MB"

// Veterinary measurements
formatWeight(2.5) // "2,5 kg"
formatWeight(0.5) // "500 g"
formatTemperature(38.5) // "38,5°C"
formatHeartRate(120) // "120 bpm"
formatRespiratoryRate(30) // "30 rpm"

// Dosages
formatDosage(250, 'mg') // "250 mg"
formatVolume(250) // "250 ml"
formatVolume(1500) // "1,5 L"

// Phone numbers (Paraguay)
formatPhoneNumber('0981123456') // "+595 981 123 456"

// Parse numbers
parseNumber('1.500,50') // 1500.50

// Compact numbers
formatCompactNumber(1500000) // "1,5M"
```

### Text Utilities (`@/lib/formatting/text.ts`)

```typescript
import { truncate, capitalize, titleCase, slugify, initials, pluralize } from '@/lib/formatting'

// Text manipulation
truncate('This is a long text', 10) // "This is..."
capitalize('hello world') // "Hello world"
titleCase('hello world') // "Hello World"

// URL slugs
slugify('Veterinaria Adris') // "veterinaria-terrapet"

// Initials
initials('Juan Pérez') // "JP"

// Pluralization (Spanish)
pluralize(1, 'mascota') // "mascota"
pluralize(2, 'mascota') // "mascotas"
formatCount(5, 'mascota') // "5 mascotas"

// List formatting
joinList(['perro', 'gato', 'loro']) // "perro, gato y loro"

// Utilities
removeAccents('María José Pérez') // "Maria Jose Perez"
highlight('Hello World', 'world') // "Hello <mark>World</mark>"
camelToSentence('camelCaseText') // "Camel case text"
maskText('sensitive@email.com', 3) // "sen*******com"
sanitizeFilename('My File: Version 2.pdf') // "My File Version 2.pdf"
nl2br('Line 1\nLine 2') // "Line 1<br>Line 2"
```

## Constants Module

All application constants are now in `@/lib/constants`:

```typescript
import { LIMITS, USER_ROLES, SPECIES, PAYMENT_METHODS, APPOINTMENT_STATUSES } from '@/lib/constants'

// Pagination and limits
LIMITS.DEFAULT_PAGE_SIZE // 20
LIMITS.MAX_IMAGE_SIZE // 5MB
LIMITS.MAX_NAME_LENGTH // 100

// User roles
USER_ROLES // ['owner', 'vet', 'admin']
USER_ROLE_LABELS.vet // "Veterinario"

// Species
SPECIES // ['dog', 'cat', 'bird', ...]
SPECIES_LABELS.dog // "Perro"

// Payment methods
PAYMENT_METHODS // ['cash', 'card', 'transfer', ...]
PAYMENT_METHOD_LABELS.cash // "Efectivo"

// Appointment statuses
APPOINTMENT_STATUSES // ['scheduled', 'confirmed', ...]
APPOINTMENT_STATUS_LABELS.scheduled // "Programado"
APPOINTMENT_STATUS_COLORS.scheduled // "bg-blue-100 text-blue-700"

// Helper functions
isValidEnum('cash', PAYMENT_METHODS) // true
getEnumLabel('cash', PAYMENT_METHOD_LABELS) // "Efectivo"
```

## Memoization Utility

New memoization utility at `@/lib/utils/memoize`:

```typescript
import { memoize, memoizeAsync, memoizeWithControl } from '@/lib/utils/memoize'

// Basic memoization
const expensive = (a: number, b: number) => a * b
const memoized = memoize(expensive, {
  maxSize: 50,
  ttlMs: 60000, // 1 minute
})

// Async memoization
const fetchUser = async (id: string) => {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}
const memoizedFetch = memoizeAsync(fetchUser, { ttlMs: 300000 })

// With cache control
const controlled = memoizeWithControl(expensive, { maxSize: 10 })
controlled(1, 2)
console.log(controlled.size()) // 1
controlled.clear()
```

## Migration Path

### Old Code

```typescript
// OLD - Scattered imports
import { formatPriceGs } from '@/lib/utils/pet-size'
import { formatCurrency, formatDate } from '@/lib/types/invoicing'
import { formatPrice } from '@/components/booking/booking-wizard/useBookingState'
```

### New Code

```typescript
// NEW - Consolidated imports
import { formatPrice, formatCurrency, formatDate } from '@/lib/formatting'
```

## Backward Compatibility

For gradual migration, a compatibility shim is available:

```typescript
// Temporary compatibility import
import { formatPrice } from '@/lib/utils/format-compat'
```

**Note:** The shim is marked as deprecated and will be removed in the future. Migrate to `@/lib/formatting` as soon as possible.

## Files to Update

The following files have duplicate formatting functions that should be migrated:

1. `web/lib/types/invoicing.ts` - `formatCurrency`, `formatDate`
2. `web/lib/utils/pet-size.ts` - `formatPriceGs`
3. `web/components/booking/booking-wizard/useBookingState.ts` - `formatPrice`, `getLocalDateString`
4. `web/lib/email/templates/*.ts` - Local `formatCurrency`, `formatDate` functions

## Benefits

1. **Single source of truth** - All formatting in one place
2. **Comprehensive coverage** - More formatting options available
3. **Type safety** - Full TypeScript support with proper types
4. **Consistency** - Spanish locale (es-PY) throughout
5. **Documentation** - JSDoc comments with examples
6. **Testable** - Easy to unit test in isolation
7. **Tree-shakeable** - Import only what you need

## Testing

Add unit tests for formatting functions in `web/tests/unit/lib/formatting/`:

```typescript
import { formatPrice, formatDate, formatWeight } from '@/lib/formatting'

describe('Currency Formatting', () => {
  it('formats price correctly', () => {
    expect(formatPrice(150000)).toBe('₲ 150.000')
  })
})
```

## Next Steps

1. ✅ Created consolidated formatting module
2. ✅ Created constants module
3. ✅ Created memoization utility
4. ✅ Created backward compatibility shim
5. ⏳ Gradually migrate existing code
6. ⏳ Add unit tests for formatting functions
7. ⏳ Remove compatibility shim after full migration
8. ⏳ Remove deprecated functions from old files

---

**Last updated:** December 19, 2024
