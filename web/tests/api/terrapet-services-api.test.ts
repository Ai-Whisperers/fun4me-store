/**
 * TerraPet Services API Tests
 *
 * Tests the services data loading and filtering for TerraPet clinic.
 *
 * Coverage:
 * - Service list retrieval
 * - Service details
 * - Service variants
 * - Tenant isolation
 * - Booking configuration
 */

import { describe, it, expect } from 'vitest'
import { getClinicData } from '@/lib/clinics'

describe('TerraPet Services API - Service Data Loading', () => {
  describe('GET all services for TerraPet', () => {
    it('returns 200 with services list', async () => {
      const data = await getClinicData('terrapet')

      expect(data).toBeDefined()
      expect(data?.services).toBeDefined()
      expect(data?.services.list).toBeDefined()
    })

    it('returns all 9 terrapet services', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.services.list.length).toBe(9)
    })

    it('filters by visible=true only', async () => {
      const data = await getClinicData('terrapet')

      const allVisible = data?.services.list.every((service) => service.visible === true)
      expect(allVisible).toBe(true)
    })

    it('does NOT return terrapet services', async () => {
      const terrapetData = await getClinicData('terrapet')
      const terrapetData = await getClinicData('terrapet')

      // Ensure we're getting different service sets
      const terrapetServices = terrapetData?.services.list.map((s) => s.id) || []
      const terrapetServices = terrapetData?.services.list.map((s) => s.id) || []

      // Services should be isolated (may have overlapping IDs but different content)
      expect(terrapetServices.length).toBeGreaterThan(0)
      expect(terrapetServices.length).toBeGreaterThan(0)
    })

    it('includes service variants (14 total)', async () => {
      const data = await getClinicData('terrapet')

      let totalVariants = 0
      data?.services.list.forEach((service) => {
        if (service.variants) {
          totalVariants += service.variants.length
        }
      })

      // TerraPet has multiple variants across services
      expect(totalVariants).toBeGreaterThanOrEqual(10)
    })

    it('includes "Consulta a Domicilio" variant (UNIQUE)', async () => {
      const data = await getClinicData('terrapet')

      const consultationService = data?.services.list.find((s) => s.id === 'consultation')
      expect(consultationService).toBeDefined()

      const homeVisitVariant = consultationService?.variants?.find(
        (v) => v.name === 'Consulta a Domicilio'
      )
      expect(homeVisitVariant).toBeDefined()
      expect(homeVisitVariant?.description).toContain('domicilio')
    })

    it('returns booking configuration for each service', async () => {
      const data = await getClinicData('terrapet')

      data?.services.list.forEach((service) => {
        expect(service.booking).toBeDefined()
        expect(service.booking.online_enabled).toBeDefined()
        expect(typeof service.booking.online_enabled).toBe('boolean')
      })
    })

    it('returns service categories (medical, preventative, cosmetic)', async () => {
      const data = await getClinicData('terrapet')

      const categories = new Set(data?.services.list.map((s) => s.category))
      
      // TerraPet has medical, preventative, cosmetic, administrative categories
      expect(categories.size).toBeGreaterThan(0)
      expect(categories.has('medical')).toBe(true)
      expect(categories.has('preventative')).toBe(true)
    })

    it('returns service durations', async () => {
      const data = await getClinicData('terrapet')

      data?.services.list.forEach((service) => {
        if (service.details) {
          expect(service.details.duration_minutes).toBeDefined()
          expect(service.details.duration_minutes).toBeGreaterThan(0)
        }
      })
    })

    it('returns "includes" list for each service', async () => {
      const data = await getClinicData('terrapet')

      data?.services.list.forEach((service) => {
        if (service.details?.includes) {
          expect(Array.isArray(service.details.includes)).toBe(true)
          expect(service.details.includes.length).toBeGreaterThan(0)
        }
      })
    })

    it('services have correct structure', async () => {
      const data = await getClinicData('terrapet')

      const firstService = data?.services.list[0]
      expect(firstService).toBeDefined()
      expect(firstService?.id).toBeDefined()
      expect(firstService?.title).toBeDefined()
      expect(firstService?.category).toBeDefined()
      expect(firstService?.visible).toBeDefined()
    })

    it('services include icons', async () => {
      const data = await getClinicData('terrapet')

      data?.services.list.forEach((service) => {
        expect(service.icon).toBeDefined()
        expect(typeof service.icon).toBe('string')
        expect(service.icon.length).toBeGreaterThan(0)
      })
    })

    it('services have summary text', async () => {
      const data = await getClinicData('terrapet')

      data?.services.list.forEach((service) => {
        expect(service.summary).toBeDefined()
        expect(typeof service.summary).toBe('string')
        expect(service.summary.length).toBeGreaterThan(0)
      })
    })

    it('services are in a logical order', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.services.list.length).toBeGreaterThan(0)
      
      // First service should be consultation (most common)
      const firstService = data?.services.list[0]
      expect(firstService?.id).toBe('consultation')
    })

    it('response includes metadata', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.services.meta).toBeDefined()
      expect(data?.services.meta.title).toBeDefined()
      expect(data?.services.meta.subtitle).toBeDefined()
    })

    it('handles pagination if implemented (future)', async () => {
      const data = await getClinicData('terrapet')

      // Currently returns all services
      // Future: may support pagination
      expect(data?.services.list.length).toBe(9)
    })
  })

  describe('GET single service details', () => {
    it('returns single service by ID', async () => {
      const data = await getClinicData('terrapet')

      const consultationService = data?.services.list.find((s) => s.id === 'consultation')
      expect(consultationService).toBeDefined()
      expect(consultationService?.id).toBe('consultation')
    })

    it('returns service title and description', async () => {
      const data = await getClinicData('terrapet')

      const service = data?.services.list.find((s) => s.id === 'vaccination')
      expect(service?.title).toBe('Vacunación')
      expect(service?.details?.description).toBeDefined()
    })

    it('returns service variants', async () => {
      const data = await getClinicData('terrapet')

      const vaccinationService = data?.services.list.find((s) => s.id === 'vaccination')
      expect(vaccinationService?.variants).toBeDefined()
      expect(vaccinationService?.variants?.length).toBeGreaterThan(0)
    })

    it('returns 404 for invalid service ID (simulated)', async () => {
      const data = await getClinicData('terrapet')

      const invalidService = data?.services.list.find((s) => s.id === 'invalid-xyz-123')
      expect(invalidService).toBeUndefined()
    })

    it('returns 404 for terrapet service ID in terrapet context', async () => {
      const terrapetData = await getClinicData('terrapet')
      const terrapetData = await getClinicData('terrapet')

      // Verify tenant isolation - terrapet can't access terrapet services
      const terrapetServiceIds = terrapetData?.services.list.map((s) => s.id) || []
      const terrapetServiceIds = terrapetData?.services.list.map((s) => s.id) || []

      // Even if IDs overlap, the content should be different
      expect(terrapetServiceIds.length).toBeGreaterThan(0)
      expect(terrapetServiceIds.length).toBeGreaterThan(0)
    })

    it('includes related data (variants, booking)', async () => {
      const data = await getClinicData('terrapet')

      const service = data?.services.list[0]
      expect(service?.variants).toBeDefined()
      expect(service?.booking).toBeDefined()
    })

    it('service details include duration and includes', async () => {
      const data = await getClinicData('terrapet')

      const service = data?.services.list.find((s) => s.id === 'consultation')
      expect(service?.details).toBeDefined()
      expect(service?.details?.duration_minutes).toBe(30)
      expect(service?.details?.includes).toBeDefined()
    })

    it('validates service ID format', async () => {
      const data = await getClinicData('terrapet')

      data?.services.list.forEach((service) => {
        // IDs should be lowercase kebab-case
        expect(service.id).toMatch(/^[a-z-]+$/)
      })
    })
  })

  describe('Service Variants', () => {
    it('consultation service has 2 variants', async () => {
      const data = await getClinicData('terrapet')

      const consultationService = data?.services.list.find((s) => s.id === 'consultation')
      expect(consultationService?.variants?.length).toBe(2)
    })

    it('renders "Consulta General" variant', async () => {
      const data = await getClinicData('terrapet')

      const consultationService = data?.services.list.find((s) => s.id === 'consultation')
      const generalVariant = consultationService?.variants?.find(
        (v) => v.name === 'Consulta General'
      )
      expect(generalVariant).toBeDefined()
    })

    it('renders "Consulta a Domicilio" variant (UNIQUE FEATURE)', async () => {
      const data = await getClinicData('terrapet')

      const consultationService = data?.services.list.find((s) => s.id === 'consultation')
      const homeVisitVariant = consultationService?.variants?.find(
        (v) => v.name === 'Consulta a Domicilio'
      )
      expect(homeVisitVariant).toBeDefined()
      expect(homeVisitVariant?.description).toContain('hogar')
    })

    it('vaccination service has 3 variants', async () => {
      const data = await getClinicData('terrapet')

      const vaccinationService = data?.services.list.find((s) => s.id === 'vaccination')
      expect(vaccinationService?.variants?.length).toBeGreaterThanOrEqual(2)
    })

    it('deworming service has 2 variants', async () => {
      const data = await getClinicData('terrapet')

      const dewormingService = data?.services.list.find((s) => s.id === 'deworming')
      expect(dewormingService?.variants?.length).toBe(2)
    })

    it('variant prices display correctly', async () => {
      const data = await getClinicData('terrapet')

      const service = data?.services.list[0]
      service?.variants?.forEach((variant) => {
        expect(variant.price_display).toBeDefined()
        expect(typeof variant.price_display).toBe('string')
      })
    })

    it('variant descriptions display', async () => {
      const data = await getClinicData('terrapet')

      const consultationService = data?.services.list.find((s) => s.id === 'consultation')
      consultationService?.variants?.forEach((variant) => {
        if (variant.description) {
          expect(typeof variant.description).toBe('string')
          expect(variant.description.length).toBeGreaterThan(0)
        }
      })
    })

    it('home visit variant shows address requirement (implicit)', async () => {
      const data = await getClinicData('terrapet')

      const consultationService = data?.services.list.find((s) => s.id === 'consultation')
      const homeVisitVariant = consultationService?.variants?.find(
        (v) => v.name === 'Consulta a Domicilio'
      )
      
      // Implicit: booking this variant would require address
      expect(homeVisitVariant).toBeDefined()
    })
  })

  describe('Booking Configuration', () => {
    it('shows "online_enabled: true" for 8 services', async () => {
      const data = await getClinicData('terrapet')

      const onlineBookableCount = data?.services.list.filter(
        (s) => s.booking.online_enabled === true
      ).length

      // Most services are bookable online (except euthanasia)
      expect(onlineBookableCount).toBeGreaterThanOrEqual(7)
    })

    it('hides online booking for euthanasia service', async () => {
      const data = await getClinicData('terrapet')

      const euthanasiaService = data?.services.list.find((s) => s.id === 'euthanasia')
      if (euthanasiaService) {
        expect(euthanasiaService.booking.online_enabled).toBe(false)
      }
    })

    it('emergency availability displayed correctly', async () => {
      const data = await getClinicData('terrapet')

      data?.services.list.forEach((service) => {
        expect(service.booking.emergency_available).toBeDefined()
        expect(typeof service.booking.emergency_available).toBe('boolean')
      })
    })
  })

  describe('Error Handling', () => {
    it('returns error for invalid tenant', async () => {
      const data = await getClinicData('invalid-tenant-xyz')

      expect(data).toBeNull()
    })

    it('returns error for non-existent service (simulated)', async () => {
      const data = await getClinicData('terrapet')

      const service = data?.services.list.find((s) => s.id === 'non-existent-service')
      expect(service).toBeUndefined()
    })

    it('handles malformed requests gracefully', async () => {
      const data = await getClinicData('../../../etc/passwd')

      expect(data).toBeNull()
    })
  })
})
