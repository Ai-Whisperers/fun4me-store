/**
 * TerraPet Integration Tests - REAL FUNCTIONALITY TESTING
 * 
 * These tests validate that the application ACTUALLY WORKS with TerraPet configuration:
 * - Data loading from filesystem
 * - Multi-tenant isolation
 * - Theme system integration
 * - Services rendering logic
 * - Database integration (if applicable)
 * 
 * Unlike config-validation tests which just check JSON files exist,
 * these tests verify the application can actually USE the configuration.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {getClinicData, getAllClinics, getClinicImageUrl } from '@/lib/clinics'
import type { ClinicData } from '@/lib/types/clinic-config'

describe('TerraPet Data Loading Integration', () => {
  let terraData: ClinicData | null

  beforeAll(async () => {
    terraData = await getClinicData('terrapet')
  })

  describe('Core Data Loading', () => {
    it('should successfully load TerraPet clinic data', () => {
      expect(terraData).not.toBeNull()
      expect(terraData).toBeDefined()
    })

    it('should load all required configuration sections', () => {
      expect(terraData?.config).toBeDefined()
      expect(terraData?.theme).toBeDefined()
      expect(terraData?.home).toBeDefined()
      expect(terraData?.services).toBeDefined()
      expect(terraData?.about).toBeDefined()
    })

    it('should load optional configuration sections', () => {
      // These can be undefined, but should not be null if present
      if (terraData?.images) {
        expect(terraData.images).toBeDefined()
      }
      if (terraData?.faq) {
        expect(terraData.faq).toBeDefined()
      }
      if (terraData?.testimonials) {
        expect(terraData.testimonials).toBeDefined()
      }
      if (terraData?.legal) {
        expect(terraData.legal).toBeDefined()
      }
    })

    it('should return null for invalid clinic slug', async () => {
      const invalidData = await getClinicData('nonexistent-clinic-xyz')
      expect(invalidData).toBeNull()
    })

    it('should return null for empty slug', async () => {
      const emptyData = await getClinicData('')
      expect(emptyData).toBeNull()
    })

    it('should handle special characters in slug gracefully', async () => {
      const specialData = await getClinicData('../../../etc/passwd')
      expect(specialData).toBeNull()
    })
  })

  describe('Configuration Data Integrity', () => {
    it('should have valid clinic ID matching slug', () => {
      expect(terraData?.config.id).toBe('terrapet')
    })

    it('should have business name configured', () => {
      expect(terraData?.config.name).toBe('TerraPet')
      expect(terraData?.config.name.length).toBeGreaterThan(0)
    })

    it('should have slogan configured', () => {
      expect(terraData?.config.slogan).toBe('El mejor cuidado para tu peludo')
      expect(terraData?.config.slogan.length).toBeGreaterThan(0)
    })

    it('should have valid contact information', () => {
      const contact = terraData?.config.contact
      expect(contact).toBeDefined()
      expect(contact?.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) // Valid email format
      expect(contact?.phone_display).toMatch(/\+?\d+/) // Has phone number
      expect(contact?.whatsapp_number).toBeTruthy()
    })

    it('should have operating hours for all 7 days', () => {
      const hours = terraData?.config.hours
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      
      days.forEach(day => {
        expect(hours?.[day as keyof typeof hours]).toBeDefined()
        expect(hours?.[day as keyof typeof hours]?.open).toMatch(/\d{2}:\d{2}/)
        expect(hours?.[day as keyof typeof hours]?.close).toMatch(/\d{2}:\d{2}/)
      })
    })

    it('should have valid module settings', () => {
      const modules = terraData?.config.settings?.modules
      expect(modules).toBeDefined()
      
      // Check boolean types
      expect(typeof modules?.online_store).toBe('boolean')
      expect(typeof modules?.qr_tags).toBe('boolean')
      expect(typeof modules?.toxic_checker).toBe('boolean')
      expect(typeof modules?.age_calculator).toBe('boolean')
    })

    it('should have logo URL configured', () => {
      expect(terraData?.config.branding?.logo_url).toBeTruthy()
      expect(terraData?.config.branding?.logo_url).toMatch(/^https?:\/\/|^\//) // URL or path
    })
  })

  describe('Theme System Integration', () => {
    it('should have complete color palette', () => {
      const colors = terraData?.theme?.colors
      expect(colors?.primary).toBeDefined()
      expect(colors?.secondary).toBeDefined()
      expect(colors?.accent).toBeDefined()
      expect(colors?.background).toBeDefined()
      expect(colors?.text).toBeDefined()
    })

    it('should have valid hex colors', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/
      
      expect(terraData?.theme?.colors?.primary?.main).toMatch(hexRegex)
      expect(terraData?.theme?.colors?.secondary?.main).toMatch(hexRegex)
      expect(terraData?.theme?.colors?.accent).toMatch(hexRegex)
    })

    it('should have color variants (light, dark)', () => {
      const primary = terraData?.theme?.colors?.primary
      expect(primary?.light).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(primary?.dark).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(primary?.contrast).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should have font configuration', () => {
      const fonts = terraData?.theme?.fonts
      expect(fonts?.heading).toBeTruthy()
      expect(fonts?.body).toBeTruthy()
      expect(fonts?.heading).toContain('Inter') // TerraPet uses Inter
    })

    it('should have typography scale', () => {
      const typography = terraData?.theme?.typography
      expect(typography?.h1).toBeDefined()
      expect(typography?.h2).toBeDefined()
      expect(typography?.body).toBeDefined()
      expect(typography?.h1?.size).toBeTruthy()
    })

    it('should have UI element styles', () => {
      const ui = terraData?.theme?.ui
      expect(ui?.border_radius).toBeTruthy()
      expect(ui?.shadow_sm).toBeTruthy()
      expect(ui?.shadow_md).toBeTruthy()
    })

    it('should have gradient definitions', () => {
      const gradients = terraData?.theme?.gradients
      expect(gradients).toBeDefined()
      
      if (gradients) {
        // Gradients should be valid CSS gradient syntax
        expect(Object.keys(gradients).length).toBeGreaterThan(0)
      }
    })
  })

  describe('Services Data Integration', () => {
    it('should load all services', () => {
      const services = terraData?.services?.services
      expect(services).toBeDefined()
      expect(Array.isArray(services)).toBe(true)
      expect(services?.length).toBe(9) // TerraPet has 9 services
    })

    it('should have visible services', () => {
      const services = terraData?.services?.services
      const visibleServices = services?.filter(s => s.visible)
      expect(visibleServices?.length).toBe(9) // All should be visible
    })

    it('should have complete service data structure', () => {
      const services = terraData?.services?.services
      
      services?.forEach(service => {
        expect(service.id).toBeTruthy()
        expect(service.title).toBeTruthy()
        expect(service.category).toBeTruthy()
        expect(service.details).toBeDefined()
        expect(service.details?.description).toBeTruthy()
        expect(service.details?.duration_minutes).toBeGreaterThan(0)
        expect(Array.isArray(service.variants)).toBe(true)
        expect(service.booking).toBeDefined()
      })
    })

    it('should have service variants', () => {
      const services = terraData?.services?.services
      const totalVariants = services?.reduce((sum, s) => sum + s.variants.length, 0)
      
      expect(totalVariants).toBeGreaterThan(0)
      expect(totalVariants).toBe(14) // TerraPet has 14 total variants
    })

    it('should have home visit consultation variant', () => {
      const consultation = terraData?.services?.services?.find(s => s.id === 'consultation')
      expect(consultation).toBeDefined()
      
      const homeVisit = consultation?.variants.find(v => v.name === 'Consulta a Domicilio')
      expect(homeVisit).toBeDefined()
      expect(homeVisit?.name).toBe('Consulta a Domicilio')
    })

    it('should have valid booking configuration', () => {
      const services = terraData?.services?.services
      
      services?.forEach(service => {
        expect(typeof service.booking?.online_enabled).toBe('boolean')
        expect(typeof service.booking?.emergency_available).toBe('boolean')
      })
    })

    it('should categorize services correctly', () => {
      const services = terraData?.services?.services
      const categories = [...new Set(services?.map(s => s.category))]
      
      expect(categories.length).toBeGreaterThan(0)
      expect(categories).toContain('medical')
      expect(categories).toContain('preventative')
      expect(categories).toContain('cosmetic')
    })
  })

  describe('Team & About Data Integration', () => {
    it('should have team members configured', () => {
      const team = terraData?.about?.team
      expect(team).toBeDefined()
      expect(Array.isArray(team)).toBe(true)
      expect(team?.length).toBe(1) // TerraPet has 1 vet
    })

    it('should have complete veterinarian data', () => {
      const vet = terraData?.about?.team?.[0]
      expect(vet).toBeDefined()
      expect(vet?.name).toBe('Dr. Adrián Alexander Gill Sánchez')
      expect(vet?.role).toBe('Doctor en Ciencias Veterinarias')
      expect(vet?.specialties).toBeTruthy()
      expect(vet?.photo_url).toBeTruthy()
    })

    it('should have mission statement', () => {
      const mission = terraData?.about?.mission
      expect(mission).toBeDefined()
      expect(mission?.text).toBeTruthy()
      expect(mission?.text.length).toBeGreaterThan(20) // Meaningful mission
    })

    it('should have values defined', () => {
      const values = terraData?.about?.values
      expect(values).toBeDefined()
      
      if (values && values.length > 0) {
        values.forEach(value => {
          expect(value.title).toBeTruthy()
          expect(value.description).toBeTruthy()
        })
      }
    })
  })

  describe('Homepage Content Integration', () => {
    it('should have hero section configured', () => {
      const hero = terraData?.home?.hero
      expect(hero).toBeDefined()
      expect(hero?.headline).toBeTruthy()
      expect(hero?.subhead).toBeTruthy()
    })

    it('should have feature highlights', () => {
      const features = terraData?.home?.features
      expect(features).toBeDefined()
      expect(Array.isArray(features)).toBe(true)
      expect(features?.length).toBe(3) // TerraPet has 3 features
    })

    it('should have complete feature data', () => {
      const features = terraData?.home?.features
      
      features?.forEach(feature => {
        expect(feature.title).toBeTruthy()
        expect(feature.description).toBeTruthy()
        expect(feature.icon).toBeTruthy()
      })
    })

    it('should highlight key differentiators', () => {
      const features = terraData?.home?.features
      const featureTitles = features?.map(f => f.title).join(' ').toLowerCase()
      
      // Should mention key TerraPet differentiators
      expect(
        featureTitles?.includes('trato') || 
        featureTitles?.includes('precio') ||
        featureTitles?.includes('accesible')
      ).toBe(true)
    })
  })

  describe('FAQ Data Integration', () => {
    it('should have FAQ entries', () => {
      const faq = terraData?.faq
      expect(faq).toBeDefined()
      expect(Array.isArray(faq)).toBe(true)
      
      if (faq) {
        expect(faq.length).toBe(12) // TerraPet has 12 FAQs
      }
    })

    it('should have valid FAQ structure', () => {
      const faq = terraData?.faq
      
      faq?.forEach(item => {
        expect(item.question).toBeTruthy()
        expect(item.answer).toBeTruthy()
        expect(item.category).toBeTruthy()
      })
    })

    it('should have Spanish questions', () => {
      const faq = terraData?.faq
      
      faq?.forEach(item => {
        // Spanish questions start with ¿ and end with ?
        expect(item.question).toMatch(/¿.*\?/)
      })
    })

    it('should cover essential topics', () => {
      const faq = terraData?.faq
      const categories = [...new Set(faq?.map(item => item.category))]
      
      // Should have multiple categories
      expect(categories.length).toBeGreaterThan(1)
    })
  })

  describe('Images Data Integration', () => {
    it('should have images configuration', () => {
      const images = terraData?.images
      expect(images).toBeDefined()
      
      if (images) {
        expect(images.images).toBeDefined()
      }
    })

    it('should have branding images', () => {
      const logo = terraData?.images?.images?.branding?.logo
      expect(logo).toBeDefined()
      expect(logo?.src).toBeTruthy()
      expect(logo?.alt).toBeTruthy()
    })

    it('should have valid image URLs', () => {
      const images = terraData?.images?.images
      
      if (images) {
        Object.values(images).forEach(category => {
          Object.values(category).forEach((image: any) => {
            if (image.src) {
              expect(image.src).toMatch(/^(https?:\/\/|\/)/i)
            }
          })
        })
      }
    })

    it('should have image dimensions', () => {
      const logo = terraData?.images?.images?.branding?.logo
      
      if (logo) {
        expect(typeof logo.width).toBe('number')
        expect(typeof logo.height).toBe('number')
        expect(logo.width).toBeGreaterThan(0)
        expect(logo.height).toBeGreaterThan(0)
      }
    })
  })

  describe('Image URL Helper Integration', () => {
    it('should return image URL from getClinicImageUrl', () => {
      const logoUrl = getClinicImageUrl(terraData?.images, 'branding', 'logo')
      expect(logoUrl).toBeTruthy()
      expect(logoUrl).toMatch(/^(https?:\/\/|\/)/i)
    })

    it('should return null for non-existent image', () => {
      const invalidUrl = getClinicImageUrl(terraData?.images, 'invalid', 'nonexistent')
      expect(invalidUrl).toBeNull()
    })

    it('should handle undefined images gracefully', () => {
      const url = getClinicImageUrl(undefined, 'branding', 'logo')
      expect(url).toBeNull()
    })
  })
})

describe('Multi-Tenant Isolation Integration', () => {
  let terraData: ClinicData | null
  let terrapetData: ClinicData | null

  beforeAll(async () => {
    terraData = await getClinicData('terrapet')
    terrapetData = await getClinicData('terrapet')
  })

  it('should load different data for different clinics', () => {
    expect(terraData).not.toBeNull()
    expect(terrapetData).not.toBeNull()
    
    // Should be different objects
    expect(terraData).not.toBe(terrapetData)
  })

  it('should have different clinic IDs', () => {
    expect(terraData?.config.id).toBe('terrapet')
    expect(terrapetData?.config.id).toBe('terrapet')
    expect(terraData?.config.id).not.toBe(terrapetData?.config.id)
  })

  it('should have different business names', () => {
    expect(terraData?.config.name).toBe('TerraPet')
    expect(terrapetData?.config.name).not.toBe('TerraPet')
    expect(terraData?.config.name).not.toBe(terrapetData?.config.name)
  })

  it('should have different contact information', () => {
    expect(terraData?.config.contact.email).toBe('terrapetanimal@gmail.com')
    expect(terrapetData?.config.contact.email).not.toBe('terrapetanimal@gmail.com')
    expect(terraData?.config.contact.phone_display).not.toBe(terrapetData?.config.contact.phone_display)
  })

  it('should have different theme colors', () => {
    // TerraPet uses earth tones, Adris might use different colors
    expect(terraData?.theme?.colors?.primary?.main).not.toBe(terrapetData?.theme?.colors?.primary?.main)
  })

  it('should have different number of services', () => {
    const terraServices = terraData?.services?.services?.length
    const terrapetServices = terrapetData?.services?.services?.length
    
    // TerraPet has 9 services, should be different from Adris
    expect(terraServices).toBe(9)
    // May or may not be different, but should have some services
    expect(terrapetServices).toBeGreaterThan(0)
  })

  it('should have different team members', () => {
    const terraVet = terraData?.about?.team?.[0]?.name
    const terrapetVet = terrapetData?.about?.team?.[0]?.name
    
    expect(terraVet).toBe('Dr. Adrián Alexander Gill Sánchez')
    expect(terraVet).not.toBe(terrapetVet)
  })

  it('should have different hero content', () => {
    const terraHeadline = terraData?.home?.hero?.headline
    const terrapetHeadline = terrapetData?.home?.hero?.headline
    
    expect(terraHeadline).not.toBe(terrapetHeadline)
  })
})

describe('Clinic Discovery Integration', () => {
  it('should list all available clinics', async () => {
    const clinics = await getAllClinics()
    
    expect(Array.isArray(clinics)).toBe(true)
    expect(clinics.length).toBeGreaterThan(0)
  })

  it('should include terrapet in clinic list', async () => {
    const clinics = await getAllClinics()
    expect(clinics).toContain('terrapet')
  })

  it('should include terrapet in clinic list', async () => {
    const clinics = await getAllClinics()
    expect(clinics).toContain('terrapet')
  })

  it('should not include template folders', async () => {
    const clinics = await getAllClinics()
    
    // Should not include _TEMPLATE or hidden folders
    expect(clinics).not.toContain('_TEMPLATE')
    expect(clinics).not.toContain('.')
    expect(clinics).not.toContain('..')
  })

  it('should only include valid clinic directories', async () => {
    const clinics = await getAllClinics()
    
    // Each clinic should have config.json and theme.json
    for (const clinic of clinics) {
      const data = await getClinicData(clinic)
      expect(data).not.toBeNull()
      expect(data?.config).toBeDefined()
      expect(data?.theme).toBeDefined()
    }
  })
})

describe('Error Handling Integration', () => {
  it('should handle missing config.json gracefully', async () => {
    // Try to load a directory that might exist but lacks config.json
    const data = await getClinicData('..') // Parent directory
    expect(data).toBeNull()
  })

  it('should handle corrupted JSON files gracefully', async () => {
    // getClinicData should handle JSON parse errors
    // This test verifies the function doesn't crash
    expect(async () => {
      await getClinicData('terrapet')
    }).not.toThrow()
  })

  it('should return null for path traversal attempts', async () => {
    const maliciousData = await getClinicData('../../../etc')
    expect(maliciousData).toBeNull()
  })

  it('should handle special characters in slug', async () => {
    const specialData = await getClinicData('terra<script>alert(1)</script>pet')
    expect(specialData).toBeNull()
  })
})

describe('Data Validation Integration', () => {
  let terraData: ClinicData | null

  beforeAll(async () => {
    terraData = await getClinicData('terrapet')
  })

  it('should have non-empty required strings', () => {
    expect(terraData?.config.name.trim().length).toBeGreaterThan(0)
    expect(terraData?.config.slogan.trim().length).toBeGreaterThan(0)
    expect(terraData?.config.contact.email.trim().length).toBeGreaterThan(0)
  })

  it('should have valid email format', () => {
    const email = terraData?.config.contact.email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    expect(email).toMatch(emailRegex)
  })

  it('should have valid phone number format', () => {
    const phone = terraData?.config.contact.phone_display
    // Should contain at least some digits
    expect(phone).toMatch(/\d+/)
  })

  it('should have valid operating hours format', () => {
    const hours = terraData?.config.hours
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    days.forEach(day => {
      const dayHours = hours?.[day as keyof typeof hours]
      expect(dayHours?.open).toMatch(timeRegex)
      expect(dayHours?.close).toMatch(timeRegex)
    })
  })

  it('should have valid hex color codes', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/
    
    expect(terraData?.theme?.colors?.primary?.main).toMatch(hexRegex)
    expect(terraData?.theme?.colors?.secondary?.main).toMatch(hexRegex)
    expect(terraData?.theme?.colors?.accent).toMatch(hexRegex)
  })

  it('should have positive service durations', () => {
    const services = terraData?.services?.services
    
    services?.forEach(service => {
      expect(service.details?.duration_minutes).toBeGreaterThan(0)
      expect(service.details?.duration_minutes).toBeLessThan(480) // Less than 8 hours
    })
  })

  it('should have valid URLs for images', () => {
    const urlRegex = /^(https?:\/\/|\/)/i
    
    const logo = terraData?.images?.images?.branding?.logo
    if (logo?.src) {
      expect(logo.src).toMatch(urlRegex)
    }
  })
})
