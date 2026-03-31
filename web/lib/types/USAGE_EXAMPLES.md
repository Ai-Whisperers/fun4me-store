# Type Usage Examples

This guide shows how to use the clinic configuration types in your components.

## Basic Import

```typescript
import { getClinicData } from '@/lib/clinics'
import type { ClinicData, Service, TeamMember } from '@/lib/clinics'
```

## Example 1: Homepage Component

```typescript
import { getClinicData } from '@/lib/clinics';
import type { HomeData, HeroSection } from '@/lib/clinics';

export default async function HomePage({ params }: { params: Promise<{ clinic: string }> }) {
  const { clinic } = await params;
  const clinicData = await getClinicData(clinic);

  if (!clinicData) {
    notFound();
  }

  const { home, config } = clinicData;

  // ✅ TypeScript knows home.hero is HeroSection
  const hero: HeroSection = home.hero;

  return (
    <div>
      <h1>{hero.headline}</h1>
      <p>{hero.subhead}</p>

      {/* ✅ TypeScript validates trust_badges is TrustBadge[] */}
      {hero.trust_badges.map((badge) => (
        <div key={badge.text}>
          <span>{badge.icon}</span>
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  );
}
```

## Example 2: Services Page

```typescript
import { getClinicData } from '@/lib/clinics';
import type { ServicesData, Service, ServiceVariant } from '@/lib/clinics';

export default async function ServicesPage({ params }: { params: Promise<{ clinic: string }> }) {
  const { clinic } = await params;
  const clinicData = await getClinicData(clinic);

  if (!clinicData) {
    notFound();
  }

  const services: ServicesData = clinicData.services;

  return (
    <div>
      <h1>{services.meta.title}</h1>

      {services.services.map((service: Service) => (
        <div key={service.id}>
          <h2>{service.title}</h2>
          <p>{service.summary}</p>

          {/* ✅ TypeScript knows variants is ServiceVariant[] */}
          {service.variants.map((variant: ServiceVariant) => (
            <div key={variant.name}>
              <span>{variant.name}</span>
              <span>{variant.price_display}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Example 3: About Page with Team

```typescript
import { getClinicData } from '@/lib/clinics';
import type { AboutData, TeamMember } from '@/lib/clinics';

export default async function AboutPage({ params }: { params: Promise<{ clinic: string }> }) {
  const { clinic } = await params;
  const clinicData = await getClinicData(clinic);

  if (!clinicData) {
    notFound();
  }

  const about: AboutData = clinicData.about;

  return (
    <div>
      <h1>{about.intro.title}</h1>
      <p>{about.intro.text}</p>

      {/* ✅ TypeScript knows team is TeamMember[] */}
      {about.team.map((member: TeamMember) => (
        <div key={member.name}>
          <h3>{member.name}</h3>
          <p>{member.role}</p>

          {/* ✅ TypeScript knows specialties is string[] */}
          <ul>
            {member.specialties.map((specialty) => (
              <li key={specialty}>{specialty}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

## Example 4: Using UI Labels

```typescript
import { getClinicData } from '@/lib/clinics';
import type { UiLabels, NavLabels } from '@/lib/clinics';

export default async function Navigation({ clinic }: { clinic: string }) {
  const clinicData = await getClinicData(clinic);

  if (!clinicData) {
    return null;
  }

  const labels: UiLabels = clinicData.config.ui_labels;
  const nav: NavLabels = labels.nav;

  return (
    <nav>
      {/* ✅ TypeScript auto-completes all nav properties */}
      <a href={`/${clinic}`}>{nav.home}</a>
      <a href={`/${clinic}/services`}>{nav.services}</a>
      <a href={`/${clinic}/about`}>{nav.about}</a>
      <a href={`/${clinic}/store`}>{nav.store}</a>
      <a href={`/${clinic}/book`}>{nav.book}</a>
    </nav>
  );
}
```

## Example 5: Client Component with Types

```typescript
'use client';

import type { Service, ServiceVariant } from '@/lib/clinics';

interface ServiceCardProps {
  service: Service;
  onBookClick: (serviceId: string, variant: ServiceVariant) => void;
}

export function ServiceCard({ service, onBookClick }: ServiceCardProps) {
  return (
    <div>
      <h3>{service.title}</h3>
      <p>{service.summary}</p>

      {/* ✅ TypeScript validates all properties */}
      {service.variants.map((variant) => (
        <button
          key={variant.name}
          onClick={() => onBookClick(service.id, variant)}
          disabled={variant.price_value === 0}
        >
          {variant.name} - {variant.price_display}
        </button>
      ))}
    </div>
  );
}
```

## Example 6: Type Guards

```typescript
import type { Service } from '@/lib/clinics'

function isBookableService(service: Service): boolean {
  return service.booking.online_enabled
}

function isEmergencyService(service: Service): boolean {
  return service.booking.emergency_available
}

// Usage
const services = clinicData.services.services
const bookableServices = services.filter(isBookableService)
const emergencyServices = services.filter(isEmergencyService)
```

## Example 7: Utility Functions

```typescript
import type { ServicesData, Service } from '@/lib/clinics'

export function getServiceById(servicesData: ServicesData, serviceId: string): Service | undefined {
  return servicesData.services.find((s) => s.id === serviceId)
}

export function getServicesByCategory(servicesData: ServicesData, category: string): Service[] {
  return servicesData.services.filter((s) => s.category === category)
}

export function getVisibleServices(servicesData: ServicesData): Service[] {
  return servicesData.services.filter((s) => s.visible)
}
```

## Example 8: Form with UI Labels

```typescript
'use client';

import type { CommonLabels, CommonActions } from '@/lib/clinics';

interface FormProps {
  labels: CommonLabels;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function EditForm({ labels, onSubmit, onCancel }: FormProps) {
  const actions: CommonActions = labels.actions;

  return (
    <form onSubmit={onSubmit}>
      {/* Form fields */}

      <div>
        {/* ✅ TypeScript knows all action labels */}
        <button type="submit">{actions.save}</button>
        <button type="button" onClick={onCancel}>
          {actions.cancel}
        </button>
      </div>
    </form>
  );
}
```

## Example 9: Mapped Types

```typescript
import type { Service } from '@/lib/clinics'

// Create a type with only the fields you need
type ServiceSummary = Pick<Service, 'id' | 'title' | 'summary' | 'category'>

// Create a partial type for updates
type ServiceUpdate = Partial<Service>

// Create a type excluding certain fields
type ServiceWithoutImage = Omit<Service, 'image'>
```

## Example 10: Generic Component

```typescript
import type { Testimonial, FaqItem } from '@/lib/clinics';

interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

export function GenericList<T>({ items, renderItem }: ListProps<T>) {
  return <div>{items.map(renderItem)}</div>;
}

// Usage with Testimonials
function TestimonialsList({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <GenericList
      items={testimonials}
      renderItem={(testimonial) => (
        <div key={testimonial.id}>
          <p>{testimonial.text}</p>
          <span>{testimonial.author}</span>
        </div>
      )}
    />
  );
}

// Usage with FAQs
function FaqList({ faqs }: { faqs: FaqItem[] }) {
  return (
    <GenericList
      items={faqs}
      renderItem={(faq) => (
        <div key={faq.id}>
          <h3>{faq.question}</h3>
          <p>{faq.answer}</p>
        </div>
      )}
    />
  );
}
```

## Benefits of Using Types

### 1. IntelliSense Auto-completion

When you type `clinicData.`, VS Code shows:

- ✅ config
- ✅ theme
- ✅ images
- ✅ home
- ✅ services
- ✅ about
- ✅ testimonials
- ✅ faq
- ✅ legal

### 2. Compile-Time Error Detection

```typescript
// ❌ TypeScript error: Property 'nonexistent' does not exist
const title = clinicData.home.nonexistent

// ✅ TypeScript validates property exists
const title = clinicData.home.hero.headline
```

### 3. Refactoring Support

When you rename a property in the type definition, TypeScript finds all usages automatically.

### 4. Documentation

Types serve as inline documentation. Hover over any property to see its type.

## Common Patterns

### Extract and Use Specific Type

```typescript
const { config, theme, home, services } = clinicData

// All variables are properly typed
config.contact.email // string
theme.colors.primary.main // string
home.hero.headline // string
services.services // Service[]
```

### Optional Chaining with Types

```typescript
// ✅ TypeScript knows these are optional
const logo = clinicData.config.branding?.logo_url
const stats = clinicData.config.stats?.pets_served
const faq = clinicData.faq?.[0]?.question
```

### Type Narrowing

```typescript
if (clinicData.testimonials) {
  // ✅ TypeScript knows testimonials is TestimonialsData (not undefined)
  const count = clinicData.testimonials.length
}
```

## Tips

1. **Import types separately** from values for clarity
2. **Use specific types** instead of ClinicData when possible
3. **Leverage type inference** - let TypeScript infer when obvious
4. **Add JSDoc comments** for complex usage
5. **Use Pick/Omit** to create focused types for components

## Related

- `README.md` - Type system overview
- `clinic-config.ts` - All type definitions
- `../clinics.ts` - Type exports
