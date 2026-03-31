/**
 * SEO Structured Data Components
 * JSON-LD schemas for improved search engine visibility
 */

import { getSiteUrl, getCanonicalUrl } from '@/lib/config'

// Service Schema for veterinary services
export interface ServiceSchemaProps {
  clinic: string
  clinicName: string
  service: {
    id: string
    title: string
    summary?: string
    description?: string
    base_price?: number
    duration_minutes?: number
    category?: string
    image_url?: string
  }
}

export function ServiceSchema({ clinic, clinicName, service }: ServiceSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${getCanonicalUrl(clinic)}/services/${service.id}#service`,
    name: service.title,
    description: service.summary || service.description,
    provider: {
      '@type': 'VeterinaryCare',
      '@id': `${getCanonicalUrl(clinic)}#organization`,
      name: clinicName,
    },
    serviceType: 'Veterinary Service',
    category: service.category || 'Veterinary Medicine',
    areaServed: {
      '@type': 'City',
      name: 'Asunción',
    },
    ...(service.base_price && {
      offers: {
        '@type': 'Offer',
        price: service.base_price,
        priceCurrency: 'PYG',
        availability: 'https://schema.org/InStock',
      },
    }),
    ...(service.duration_minutes && {
      estimatedDuration: `PT${service.duration_minutes}M`,
    }),
    ...(service.image_url && {
      image: service.image_url.startsWith('/') ? getSiteUrl(service.image_url) : service.image_url,
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// Product Schema for store products
export interface ProductSchemaProps {
  clinic: string
  clinicName: string
  product: {
    id: string
    name: string
    description?: string
    short_description?: string
    base_price: number
    image_url?: string
    sku?: string
    brand?: string
    category?: string
    stock_quantity?: number
    rating?: number
    review_count?: number
  }
}

export function ProductSchema({ clinic, clinicName, product }: ProductSchemaProps) {
  const availability =
    product.stock_quantity && product.stock_quantity > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock'

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${getCanonicalUrl(clinic)}/store/product/${product.id}#product`,
    name: product.name,
    description: product.description || product.short_description,
    sku: product.sku || product.id,
    ...(product.brand && { brand: { '@type': 'Brand', name: product.brand } }),
    ...(product.category && { category: product.category }),
    ...(product.image_url && {
      image: product.image_url.startsWith('/') ? getSiteUrl(product.image_url) : product.image_url,
    }),
    offers: {
      '@type': 'Offer',
      url: `${getCanonicalUrl(clinic)}/store/product/${product.id}`,
      price: product.base_price,
      priceCurrency: 'PYG',
      availability,
      seller: {
        '@type': 'VeterinaryCare',
        '@id': `${getCanonicalUrl(clinic)}#organization`,
        name: clinicName,
      },
    },
    ...(product.rating &&
      product.review_count && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.review_count,
        },
      }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// Breadcrumb Schema for navigation
export interface BreadcrumbItem {
  name: string
  url: string
}

export interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('/') ? getSiteUrl(item.url) : item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// FAQ Schema for FAQ pages
export interface FaqItem {
  question: string
  answer: string
}

export interface FaqSchemaProps {
  items: FaqItem[]
}

export function FaqSchema({ items }: FaqSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// Organization Schema (for root pages)
export interface OrganizationSchemaProps {
  name: string
  description: string
  url: string
  logo?: string
  sameAs?: string[]
}

export function OrganizationSchema({
  name,
  description,
  url,
  logo,
  sameAs,
}: OrganizationSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    ...(logo && { logo: logo.startsWith('/') ? getSiteUrl(logo) : logo }),
    ...(sameAs && sameAs.length > 0 && { sameAs }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// Person Schema for team members
export interface TeamMember {
  name: string
  role: string
  bio?: string
  photo_url?: string
  specialties?: string[]
}

export interface TeamSchemaProps {
  clinic: string
  clinicName: string
  members: TeamMember[]
}

export function TeamSchema({ clinic, clinicName, members }: TeamSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': members.map((member, index) => ({
      '@type': 'Person',
      '@id': `${getCanonicalUrl(clinic)}/about#team-${index}`,
      name: member.name,
      jobTitle: member.role,
      description: member.bio,
      ...(member.photo_url && {
        image: member.photo_url.startsWith('/') ? getSiteUrl(member.photo_url) : member.photo_url,
      }),
      ...(member.specialties &&
        member.specialties.length > 0 && {
          knowsAbout: member.specialties,
        }),
      worksFor: {
        '@type': 'VeterinaryCare',
        '@id': `${getCanonicalUrl(clinic)}#organization`,
        name: clinicName,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// HowTo Schema for tools/tutorials
export interface HowToStep {
  name?: string
  text: string
  image?: string
}

export interface HowToSchemaProps {
  name: string
  description: string
  steps: HowToStep[]
  totalTime?: string // ISO 8601 duration, e.g., "PT5M"
  image?: string
}

export function HowToSchema({ name, description, steps, totalTime, image }: HowToSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    ...(totalTime && { totalTime }),
    ...(image && { image: image.startsWith('/') ? getSiteUrl(image) : image }),
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      ...(step.name && { name: step.name }),
      text: step.text,
      ...(step.image && {
        image: step.image.startsWith('/') ? getSiteUrl(step.image) : step.image,
      }),
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

// WebApplication Schema for interactive tools
export interface WebApplicationSchemaProps {
  name: string
  description: string
  url: string
  applicationCategory?: string
  operatingSystem?: string
}

export function WebApplicationSchema({
  name,
  description,
  url,
  applicationCategory = 'HealthApplication',
  operatingSystem = 'Web Browser',
}: WebApplicationSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url: url.startsWith('/') ? getSiteUrl(url) : url,
    applicationCategory,
    operatingSystem,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
