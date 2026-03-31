# Clinic Configuration Types

This directory contains comprehensive TypeScript type definitions for the Vete multi-tenant veterinary platform.

## Overview

All clinic configuration data is strongly typed to ensure type safety across the application. The types are generated from the actual JSON structure in `.content_data/`.

## Files

- `clinic-config.ts` - Main type definitions file with all interfaces
- `index.ts` - Barrel export for convenient importing

## Usage

### Import from the clinics library

```typescript
import { getClinicData } from '@/lib/clinics'
import type { ClinicData, Service, TeamMember } from '@/lib/clinics'

const clinicData = await getClinicData('terrapet')
```

### Import directly from types

```typescript
import type { ClinicConfig, HomeData, ServicesData, UiLabels } from '@/lib/types'
```

## Type Categories

### Core Configuration

- `ClinicConfig` - Main clinic configuration (contact, settings, branding)
- `ClinicTheme` - Theme colors, fonts, gradients
- `ClinicImages` - Image manifest and placeholders
- `ClinicData` - Complete clinic data structure

### UI Labels

- `UiLabels` - All user-facing text labels
  - `NavLabels` - Navigation menu labels
  - `FooterLabels` - Footer section labels
  - `HomeLabels` - Homepage labels
  - `ServicesLabels` - Services page labels
  - `AboutLabels` - About page labels
  - `PortalLabels` - Pet owner portal labels
  - `StoreLabels` - Online store labels
  - `BookingLabels` - Appointment booking labels
  - `CommonLabels` - Shared UI labels (buttons, actions, validation)
  - `AuthLabels` - Authentication labels
  - `ToolsLabels` - Interactive tools labels
  - `ErrorLabels` - Error page labels

### Content Types

- `HomeData` - Homepage content structure
- `ServicesData` - Services catalog with pricing
- `AboutData` - About page with team, facilities, certifications
- `TestimonialsData` - Client testimonials
- `FaqData` - Frequently asked questions
- `LegalData` - Privacy policy, terms, cookie policy

### Component Types

- `Service` - Individual service with variants and booking options
- `TeamMember` - Veterinarian profile with specialties
- `Testimonial` - Client review with rating
- `FaqItem` - Single FAQ entry

## Structure

### Example: Service Type

```typescript
interface Service {
  id: string
  visible: boolean
  category: string
  title: string
  icon: string
  summary: string
  image: string
  details: ServiceDetails
  variants: ServiceVariant[]
  booking: ServiceBooking
}
```

### Example: UI Labels Type

```typescript
interface NavLabels {
  home: string
  services: string
  about: string
  store: string
  book: string
  contact: string
  owners_zone: string
  // ... more labels
}
```

## Benefits

1. **Type Safety** - Catch errors at compile time instead of runtime
2. **IntelliSense** - Auto-completion in VS Code for all clinic data
3. **Documentation** - Types serve as inline documentation
4. **Refactoring** - Safe refactoring with TypeScript's type checking
5. **Consistency** - Ensures all clinics follow the same data structure

## Maintenance

When adding new fields to JSON files:

1. Update the corresponding interface in `clinic-config.ts`
2. Run `npm run typecheck` to verify no breaking changes
3. Update components that use the new fields

## No More `any` Types

All previously untyped (`any`) properties have been replaced with proper TypeScript interfaces:

- ✅ `ui_labels` - Now fully typed with nested interfaces
- ✅ `home` - Typed as `HomeData`
- ✅ `services` - Typed as `ServicesData`
- ✅ `about` - Typed as `AboutData`
- ✅ `testimonials` - Typed as `TestimonialsData`
- ✅ `faq` - Typed as `FaqData`
- ✅ `legal` - Typed as `LegalData`

## Related Documentation

- Main docs: `documentation/architecture/overview.md`
- JSON-CMS guide: `documentation/features/json-cms.md`
- Multi-tenancy: `documentation/architecture/multi-tenancy.md`
