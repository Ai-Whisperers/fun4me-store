# Formatting Utilities

Centralized formatting utilities for currency, dates, numbers, and text.

> **Location**: `web/lib/formatting/`
> **Last Updated**: January 2026

---

## Overview

The formatting library provides consistent data formatting across the platform:

| Module | Purpose | Locale |
|--------|---------|--------|
| `currency.ts` | Money formatting (PYG, USD, BRL) | es-PY |
| `date.ts` | Date/time formatting | es (Spanish) |
| `number.ts` | Numbers, percentages, vitals | es-PY |
| `text.ts` | String manipulation | - |

**Import:**

```typescript
import { formatPrice, formatDate, formatNumber, truncate } from '@/lib/formatting'
```

---

## Currency Formatting

### formatPrice(amount)

Format price in Paraguayan Guaranies.

```typescript
formatPrice(150000)     // "₲ 150.000"
formatPrice(0)          // "₲ 0"
formatPrice(null)       // "₲ 0"
formatPrice(undefined)  // "₲ 0"
```

### formatCurrency(amount, currency)

Format with specific currency.

```typescript
formatCurrency(150000, 'PYG')  // "₲ 150.000"
formatCurrency(99.99, 'USD')   // "$99.99"
formatCurrency(199.90, 'BRL')  // "R$ 199,90"
```

**Supported Currencies:**

| Code | Symbol | Decimals | Locale |
|------|--------|----------|--------|
| PYG | ₲ | 0 | es-PY |
| USD | $ | 2 | en-US |
| BRL | R$ | 2 | pt-BR |

### formatPriceGs(amount)

Legacy format with "Gs" suffix.

```typescript
formatPriceGs(150000)  // "150.000 Gs"
formatPriceGs(null)    // "0 Gs"
```

### formatPriceRange(min, max)

Format price range.

```typescript
formatPriceRange(50000, 150000)   // "₲ 50.000 - ₲ 150.000"
formatPriceRange(100000, 100000)  // "₲ 100.000"
```

### formatFromPrice(amount)

Format with "Desde" prefix for minimum pricing.

```typescript
formatFromPrice(50000)  // "Desde ₲ 50.000"
formatFromPrice(null)   // ""
```

### parseCurrency(value)

Parse currency string to number.

```typescript
parseCurrency("₲ 150.000")  // 150000
parseCurrency("$99.99")     // 99.99
```

### roundCurrency(amount, currency)

Round to appropriate decimal places.

```typescript
roundCurrency(150000.6, 'PYG')  // 150001
roundCurrency(99.999, 'USD')    // 100.00
```

---

## Date Formatting

All dates formatted in Spanish (es locale) for Paraguay market.

### formatDate(date, pattern?)

Format date with custom pattern.

```typescript
formatDate(new Date())                    // "04/01/2026"
formatDate('2026-01-04', 'dd MMM yyyy')   // "04 ene 2026"
formatDate(null)                          // ""
```

**Common Patterns:**
- `dd/MM/yyyy` - "04/01/2026" (default)
- `dd MMM yyyy` - "04 ene 2026"
- `dd 'de' MMMM 'de' yyyy` - "04 de enero de 2026"
- `HH:mm` - "14:30"
- `EEEE dd 'de' MMMM` - "sábado 04 de enero"

### formatDateTime(date)

Format date with time.

```typescript
formatDateTime('2026-01-04T14:30:00')  // "04/01/2026 a las 14:30"
```

### formatTime(date)

Format time only.

```typescript
formatTime('2026-01-04T14:30:00')  // "14:30"
```

### formatRelative(date)

Format relative to now (Spanish).

```typescript
formatRelative(new Date())              // "Hoy a las 14:30"
formatRelative(yesterday)               // "Ayer a las 10:15"
formatRelative(twoDaysAgo)              // "hace 2 días"
formatRelative(twoWeeksAgo)             // "hace 2 semanas"
```

### formatDateRange(start, end)

Format date/time range.

```typescript
// Same day - shows time range
formatDateRange('2026-01-04T10:00', '2026-01-04T12:00')
// "04/01/2026 10:00 - 12:00"

// Different days - shows full datetimes
formatDateRange('2026-01-04T10:00', '2026-01-05T12:00')
// "04/01/2026 a las 10:00 - 05/01/2026 a las 12:00"
```

### formatAge(birthDate)

Format pet/patient age.

```typescript
formatAge('2024-01-15')  // "2 años"
formatAge('2025-07-01')  // "6 meses"
formatAge('2023-06-15')  // "2 años, 6 meses"
formatAge('2026-01-01')  // "3 días" (uses formatAgeInDays)
```

### formatAgeInDays(birthDate)

For very young pets (puppies/kittens < 60 days).

```typescript
formatAgeInDays('2025-12-20')  // "15 días"
formatAgeInDays('2022-01-01')  // "3 años, 11 meses"
```

### formatDateShort(date)

Short format for compact displays.

```typescript
formatDateShort('2026-01-04')  // "04 ene"
```

### formatDateLong(date)

Long formal format.

```typescript
formatDateLong('2026-01-04')  // "04 de enero de 2026"
```

### getLocalDateString(date)

For HTML date input values.

```typescript
getLocalDateString(new Date())  // "2026-01-04"
```

---

## Number Formatting

### formatNumber(value, decimals?)

Format with thousands separators.

```typescript
formatNumber(1500)       // "1.500"
formatNumber(1500.567, 2)  // "1.500,57"
```

### formatPercentage(value, decimals?)

Format as percentage (expects decimal input).

```typescript
formatPercentage(0.15)      // "15,0%"
formatPercentage(0.1567, 2)  // "15,67%"
```

### formatBytes(bytes)

Human-readable file sizes.

```typescript
formatBytes(0)        // "0 B"
formatBytes(1024)     // "1 KB"
formatBytes(1536000)  // "1,5 MB"
```

### formatWeight(kg)

Pet weight in kg or g.

```typescript
formatWeight(2.5)   // "2,5 kg"
formatWeight(0.5)   // "500 g"
formatWeight(0.025)  // "25 g"
```

### formatTemperature(celsius)

For vital signs.

```typescript
formatTemperature(38.5)  // "38,5°C"
formatTemperature(39)    // "39,0°C"
```

### formatHeartRate(bpm)

Beats per minute.

```typescript
formatHeartRate(120)  // "120 bpm"
```

### formatRespiratoryRate(rpm)

Respirations per minute.

```typescript
formatRespiratoryRate(30)  // "30 rpm"
```

### formatDosage(amount, unit)

Medication dosage.

```typescript
formatDosage(250, 'mg')   // "250 mg"
formatDosage(2.5, 'ml')   // "2,5 ml"
formatDosage(5, 'mg/kg')  // "5 mg/kg"
```

### formatVolume(ml)

Fluid volumes.

```typescript
formatVolume(250)   // "250 ml"
formatVolume(1500)  // "1,5 L"
```

### formatPhoneNumber(phone)

Paraguay phone format.

```typescript
formatPhoneNumber("595981123456")  // "+595 981 123 456"
formatPhoneNumber("0981123456")    // "+595 981 123 456"
```

### formatCompactNumber(value)

Compact notation (K, M).

```typescript
formatCompactNumber(1200)     // "1,2K"
formatCompactNumber(1500000)  // "1,5M"
```

### parseNumber(value)

Parse formatted string to number.

```typescript
parseNumber("1.500,50")  // 1500.50
parseNumber("1.500")     // 1500
```

---

## Text Utilities

### truncate(text, maxLength, suffix?)

Truncate with suffix.

```typescript
truncate("This is a long text", 10)      // "This is..."
truncate("Short", 10)                     // "Short"
truncate("Long text here", 12, "…")       // "Long text…"
```

### capitalize(text)

Capitalize first letter only.

```typescript
capitalize("hello world")  // "Hello world"
capitalize("HELLO")        // "Hello"
```

### titleCase(text)

Capitalize each word.

```typescript
titleCase("hello world")           // "Hello World"
titleCase("the quick brown fox")   // "The Quick Brown Fox"
```

### slugify(text)

URL-friendly slug.

```typescript
slugify("Veterinaria Adris")    // "veterinaria-adris"
slugify("Café & Té")            // "cafe-te"
slugify("  Multiple   Spaces  ") // "multiple-spaces"
```

### initials(name, maxChars?)

Get initials from name.

```typescript
initials("Juan Pérez")              // "JP"
initials("María del Carmen López", 3)  // "MDC"
initials("Ana")                     // "A"
```

### pluralize(count, singular, plural?)

Spanish pluralization.

```typescript
pluralize(1, "mascota")        // "mascota"
pluralize(2, "mascota")        // "mascotas"
pluralize(1, "mes", "meses")   // "mes"
pluralize(5, "mes", "meses")   // "meses"
```

### formatCount(count, singular, plural?)

Number with pluralized word.

```typescript
formatCount(1, "mascota")       // "1 mascota"
formatCount(5, "mascota")       // "5 mascotas"
formatCount(1, "mes", "meses")  // "1 mes"
```

### joinList(items, conjunction?)

Join with proper Spanish grammar.

```typescript
joinList(["perro", "gato"])                // "perro y gato"
joinList(["perro", "gato", "loro"])        // "perro, gato y loro"
joinList(["uno", "dos", "tres"], "o")      // "uno, dos o tres"
```

### removeAccents(text)

Remove diacritics.

```typescript
removeAccents("María José Pérez")  // "Maria Jose Perez"
removeAccents("Año")               // "Ano"
```

### highlight(text, searchTerm, caseSensitive?)

Highlight search matches with `<mark>` tags.

```typescript
highlight("Hello World", "world")
// "Hello <mark>World</mark>"

highlight("Test test TEST", "test")
// "<mark>Test</mark> <mark>test</mark> <mark>TEST</mark>"
```

### escapeRegex(text)

Escape special regex characters.

```typescript
escapeRegex("hello.world")  // "hello\\.world"
escapeRegex("$100")         // "\\$100"
```

### camelToSentence(text)

Convert camelCase to sentence.

```typescript
camelToSentence("camelCaseText")  // "Camel case text"
camelToSentence("PascalCase")     // "Pascal case"
```

### maskText(text, visibleChars?, maskChar?)

Mask sensitive data.

```typescript
maskText("sensitive@email.com", 3)    // "sen*******com"
maskText("0981123456", 2, "X")        // "09XXXXXX56"
```

### sanitizeFilename(filename)

Remove invalid filename characters.

```typescript
sanitizeFilename("My File: Version 2.pdf")  // "My File Version 2.pdf"
sanitizeFilename("Invoice #123.pdf")        // "Invoice 123.pdf"
```

### nl2br(text)

Convert newlines to `<br>` tags.

```typescript
nl2br("Line 1\nLine 2")  // "Line 1<br>Line 2"
```

---

## Usage Examples

### Invoice Display

```typescript
import { formatPrice, formatDate, formatDateTime } from '@/lib/formatting'

function InvoiceRow({ invoice }) {
  return (
    <tr>
      <td>{invoice.invoice_number}</td>
      <td>{formatDate(invoice.created_at)}</td>
      <td>{formatPrice(invoice.total)}</td>
      <td>{formatDateTime(invoice.paid_at)}</td>
    </tr>
  )
}
```

### Pet Profile

```typescript
import { formatAge, formatWeight, formatDate } from '@/lib/formatting'

function PetCard({ pet }) {
  return (
    <div>
      <h3>{pet.name}</h3>
      <p>Edad: {formatAge(pet.birth_date)}</p>
      <p>Peso: {formatWeight(pet.weight_kg)}</p>
      <p>Última visita: {formatRelative(pet.last_visit)}</p>
    </div>
  )
}
```

### Vital Signs

```typescript
import {
  formatTemperature,
  formatHeartRate,
  formatRespiratoryRate,
  formatWeight
} from '@/lib/formatting'

function VitalsDisplay({ vitals }) {
  return (
    <div className="grid grid-cols-4">
      <div>Temp: {formatTemperature(vitals.temperature)}</div>
      <div>FC: {formatHeartRate(vitals.heart_rate)}</div>
      <div>FR: {formatRespiratoryRate(vitals.respiratory_rate)}</div>
      <div>Peso: {formatWeight(vitals.weight)}</div>
    </div>
  )
}
```

### Search with Highlighting

```typescript
import { highlight, truncate } from '@/lib/formatting'

function SearchResult({ item, query }) {
  return (
    <div>
      <h4 dangerouslySetInnerHTML={{
        __html: highlight(item.title, query)
      }} />
      <p>{truncate(item.description, 150)}</p>
    </div>
  )
}
```

---

## Best Practices

### DO

- Import from `@/lib/formatting` barrel export
- Use consistent formatting across the app
- Use Spanish locale functions for user-facing text
- Handle null/undefined gracefully (most functions do)

### DON'T

- Format dates/numbers manually with string concatenation
- Use English locale for Paraguayan users
- Forget to handle null values in display components
- Create duplicate formatting logic in components

---

## Related Documentation

- [Validation System](../backend/validation-system.md)
- [Hooks Library](hooks-library.md)
- [Store Components](../features/store-components.md)
