# Metadata Utility Usage Guide

This guide shows how to use the metadata utilities for new pages in the Vete platform.

## Quick Start

### 1. Basic Page Metadata

```typescript
import type { Metadata } from 'next'
import { generateClinicMetadata } from '@/lib/metadata'

interface Props {
  params: Promise<{ clinic: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic } = await params

  return generateClinicMetadata(clinic, {
    title: 'Page Title',
    description: 'Page description for SEO (150-160 characters)',
    path: '/page-path', // Optional: for canonical URL
    image: '/path/to/og-image.jpg', // Optional: custom OG image
    noIndex: false, // Optional: set true to prevent indexing
  })
}
```

### 2. Product Page Metadata

```typescript
import { generateProductMetadata } from '@/lib/metadata'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic, id } = await params
  const product = await getProduct(id)
  const clinicData = await getClinicData(clinic)

  return generateProductMetadata(product, clinicData.config.name)
}
```

### 3. Service Page Metadata

```typescript
import { generateServiceMetadata } from '@/lib/metadata'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic, serviceId } = await params
  const service = await getService(serviceId)
  const clinicData = await getClinicData(clinic)

  return generateServiceMetadata(service, clinicData.config.name)
}
```

## Adding Structured Data

### Import Components

```typescript
import {
  BreadcrumbSchema,
  ProductSchema,
  ServiceSchema,
  HowToSchema,
  WebApplicationSchema,
  FaqSchema,
} from '@/components/seo'
```

### Breadcrumb Example

```typescript
const breadcrumbItems = [
  { name: 'Inicio', url: `/${clinic}` },
  { name: 'Servicios', url: `/${clinic}/services` },
  { name: 'Vacunación', url: `/${clinic}/services/vaccination` },
]

return (
  <>
    <BreadcrumbSchema items={breadcrumbItems} />
    {/* Page content */}
  </>
)
```

### Product Schema Example

```typescript
<ProductSchema
  clinic={clinic}
  clinicName={clinicData.config.name}
  product={{
    id: product.id,
    name: product.name,
    description: product.description,
    short_description: product.short_description,
    base_price: product.base_price,
    image_url: product.image_url,
    sku: product.sku,
    brand: product.brand,
    category: product.category_name,
    stock_quantity: product.stock_quantity,
    rating: product.average_rating,
    review_count: product.review_count,
  }}
/>
```

### Service Schema Example

```typescript
<ServiceSchema
  clinic={clinic}
  clinicName={config.name}
  service={{
    id: service.id,
    title: service.title,
    summary: service.summary,
    description: service.description,
    base_price: service.base_price,
    duration_minutes: service.duration_minutes,
    category: service.category,
    image_url: service.image_url,
  }}
/>
```

### HowTo Schema Example (for tutorials/tools)

```typescript
const howToSteps = [
  { text: 'Step 1: Do this' },
  { text: 'Step 2: Then this' },
  { text: 'Step 3: Finally this' },
]

<HowToSchema
  name="How to use this tool"
  description="A detailed guide on using this tool"
  steps={howToSteps}
  totalTime="PT5M" // ISO 8601 duration (5 minutes)
/>
```

### WebApplication Schema (for interactive tools)

```typescript
<WebApplicationSchema
  name="Pet Age Calculator"
  description="Calculate your pet's age in human years"
  url={`/${clinic}/tools/age-calculator`}
  applicationCategory="HealthApplication"
/>
```

### FAQ Schema Example

```typescript
const faqItems = [
  {
    question: '¿Cuánto cuesta una consulta?',
    answer: 'Las consultas tienen un costo de 150,000 PYG.',
  },
  {
    question: '¿Atienden urgencias?',
    answer: 'Sí, atendemos urgencias 24/7.',
  },
]

<FaqSchema items={faqItems} />
```

## Best Practices

### Title Tags

- Keep under 60 characters
- Include clinic name: `"Service | Clinic Name"`
- Use specific, descriptive titles
- Avoid keyword stuffing

### Meta Descriptions

- Keep between 150-160 characters
- Include a call-to-action
- Use active voice
- Include target keywords naturally
- Make it compelling to click

### Images

- Use 1200x630 for OpenGraph images
- Provide alt text
- Optimize file size
- Use descriptive filenames

### Canonical URLs

- Always set for public pages
- Use absolute URLs
- Match the page's actual URL
- Prevent duplicate content issues

### Structured Data

- Use appropriate schema types
- Fill all required properties
- Test with Schema.org validator
- Keep data accurate and up-to-date

## Complete Page Example

```typescript
import type { Metadata } from 'next'
import { generateClinicMetadata } from '@/lib/metadata'
import { getClinicData } from '@/lib/clinics'
import { notFound } from 'next/navigation'
import { BreadcrumbSchema, ServiceSchema } from '@/components/seo'

interface Props {
  params: Promise<{ clinic: string; serviceId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic, serviceId } = await params
  const clinicData = await getClinicData(clinic)
  const service = await getService(serviceId)

  if (!service) {
    return { title: 'Servicio no encontrado' }
  }

  return generateClinicMetadata(clinic, {
    title: service.title,
    description: service.summary || service.description?.substring(0, 160),
    path: `/services/${serviceId}`,
    image: service.image_url,
  })
}

export default async function ServicePage({ params }: Props) {
  const { clinic, serviceId } = await params
  const clinicData = await getClinicData(clinic)
  const service = await getService(serviceId)

  if (!clinicData || !service) {
    notFound()
  }

  const breadcrumbItems = [
    { name: 'Inicio', url: `/${clinic}` },
    { name: 'Servicios', url: `/${clinic}/services` },
    { name: service.title, url: `/${clinic}/services/${serviceId}` },
  ]

  return (
    <>
      {/* Structured Data */}
      <BreadcrumbSchema items={breadcrumbItems} />
      <ServiceSchema
        clinic={clinic}
        clinicName={clinicData.config.name}
        service={{
          id: service.id,
          title: service.title,
          summary: service.summary,
          description: service.description,
          base_price: service.base_price,
          duration_minutes: service.duration_minutes,
          category: service.category,
          image_url: service.image_url,
        }}
      />

      {/* Page Content */}
      <div className="container mx-auto px-4 py-8">
        <h1>{service.title}</h1>
        <p>{service.description}</p>
      </div>
    </>
  )
}
```

## Environment Variables

Make sure these are set in `.env.local`:

```bash
NEXT_PUBLIC_BASE_URL=https://Vetic.vercel.app
```

## Testing Your Metadata

1. **Build locally**: `npm run build`
2. **View source**: Right-click > View Page Source
3. **Check meta tags**: Look for `<meta>` tags in `<head>`
4. **Validate structured data**: https://validator.schema.org/
5. **Test OpenGraph**: https://developers.facebook.com/tools/debug/
6. **Test Twitter Cards**: https://cards-dev.twitter.com/validator

## Common Pitfalls

### ❌ Don't

- Hardcode clinic names
- Use relative URLs in canonical tags
- Skip meta descriptions
- Use generic titles
- Forget to test on different devices
- Include sensitive data in meta tags

### ✅ Do

- Use dynamic clinic data
- Use absolute URLs
- Write unique descriptions for each page
- Use specific, keyword-rich titles
- Test with real data
- Keep metadata up-to-date

## Schema.org Types Reference

Common types used in Vete:

- `VeterinaryCare` - Main clinic organization
- `Service` - Veterinary services
- `Product` - Store products
- `Person` - Team members
- `HowTo` - Tutorial/guide content
- `WebApplication` - Interactive tools
- `FAQPage` - Frequently asked questions
- `BreadcrumbList` - Navigation breadcrumbs

## Additional Resources

- [Next.js Metadata Docs](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Schema.org Vocabulary](https://schema.org/)
- [OpenGraph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Google Rich Results](https://developers.google.com/search/docs/appearance/structured-data)
