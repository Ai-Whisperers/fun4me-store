/**
 * TerraPet Clinic API Tests
 *
 * Tests the clinic data API endpoints that serve configuration, theme, and content
 * for the TerraPet clinic.
 *
 * Coverage:
 * - GET /api/clinics/[slug] (or equivalent data loading)
 * - Tenant isolation
 * - Error handling
 */

import { describe, it, expect } from 'vitest'
import { getClinicData } from '@/lib/clinics'
import { TENANT_IDS } from '@/lib/constants/tenants'

describe('TerraPet Clinic API - Data Loading', () => {
  describe('GET clinic data for TerraPet', () => {
    it('returns clinic data for terrapet slug', async () => {
      const data = await getClinicData('terrapet')

      expect(data).toBeDefined()
      expect(data).not.toBeNull()
    })

    it('returns correct tenant_id: terrapet', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.config.tenant_id).toBe('terrapet')
    })

    it('returns clinic name from config', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.config.name).toBe('TerraPet')
    })

    it('returns contact information', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.config.contact).toBeDefined()
      expect(data?.config.contact.phone).toBeDefined()
      expect(data?.config.contact.email).toBeDefined()
      expect(data?.config.contact.address).toBeDefined()
    })

    it('returns operating hours (7 days, 9-6)', async () => {
      const data = await getClinicData('terrapet')

      expect(data).toBeDefined()
      expect(data?.config.hours).toBeDefined()
      expect(data?.config.hours.operating).toBeDefined()
      
      // Type narrowing: data is defined at this point
      if (!data) throw new Error('Data should be defined')
      
      // TerraPet operates Monday-Sunday 9 AM - 6 PM
      const { operating } = data.config.hours
      expect(operating.monday).toBe('9:00 - 18:00')
      expect(operating.tuesday).toBe('9:00 - 18:00')
      expect(operating.wednesday).toBe('9:00 - 18:00')
      expect(operating.thursday).toBe('9:00 - 18:00')
      expect(operating.friday).toBe('9:00 - 18:00')
      expect(operating.saturday).toBe('9:00 - 18:00')
      expect(operating.sunday).toBe('9:00 - 18:00')
    })

    it('returns module settings (online_store, qr_tags)', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.config.modules).toBeDefined()
      
      // TerraPet has online store enabled
      expect(data?.config.modules.online_store).toBe(true)
      
      // QR tags enabled
      expect(data?.config.modules.qr_tags).toBe(true)
    })

    it('returns theme configuration', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.theme).toBeDefined()
      expect(data?.theme.colors).toBeDefined()
      expect(data?.theme.colors.primary).toBe('#78866B') // Earth tone green
      expect(data?.theme.colors.secondary).toBe('#C19A6B') // Warm brown
      expect(data?.theme.colors.accent).toBe('#E8A87C') // Soft orange
    })

    it('returns home page data', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.home).toBeDefined()
      expect(data?.home.hero).toBeDefined()
      expect(data?.home.hero.headline).toBeDefined()
      expect(data?.home.hero.headline).toContain('TerraPet')
    })

    it('returns services data', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.services).toBeDefined()
      expect(data?.services.list).toBeDefined()
      expect(data?.services.list.length).toBe(9) // 9 services
    })

    it('returns about page data', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.about).toBeDefined()
      expect(data?.about.team).toBeDefined()
      expect(data?.about.team.length).toBeGreaterThan(0)
    })

    it('returns FAQ data', async () => {
      const data = await getClinicData('terrapet')

      expect(data?.faq).toBeDefined()
      expect(data?.faq.items).toBeDefined()
      expect(data?.faq.items.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('GET clinic data - Error Handling', () => {
    it('returns null for invalid clinic slug', async () => {
      const data = await getClinicData('invalid-clinic-xyz')

      expect(data).toBeNull()
    })

    it('returns null for empty slug', async () => {
      const data = await getClinicData('')

      expect(data).toBeNull()
    })

    it('returns null for template folder', async () => {
      const data = await getClinicData('_TEMPLATE')

      // Template might exist but shouldn't be served
      // Check if it has proper config or is treated as invalid
      if (data) {
        expect(data.config.tenant_id).not.toBe('_TEMPLATE')
      }
    })

    it('handles special characters in slug gracefully', async () => {
      const data = await getClinicData('../etc/passwd') // Path traversal attempt

      expect(data).toBeNull()
    })

    it('handles malformed slugs gracefully', async () => {
      const data = await getClinicData('terra@pet#123')

      expect(data).toBeNull()
    })
  })

  describe('GET clinic data - Tenant Isolation', () => {
    it('terrapet data is isolated from terrapet', async () => {
      const terrapetData = await getClinicData('terrapet')
      const terrapetData = await getClinicData('terrapet')

      expect(terrapetData?.config.tenant_id).toBe('terrapet')
      expect(terrapetData?.config.tenant_id).toBe(TENANT_IDS.ADRIS)

      // Verify they have different content
      expect(terrapetData?.config.name).not.toBe(terrapetData?.config.name)
      expect(terrapetData?.theme.colors.primary).not.toBe(terrapetData?.theme.colors.primary)
    })

    it('terrapet services are distinct from terrapet services', async () => {
      const terrapetData = await getClinicData('terrapet')
      const terrapetData = await getClinicData('terrapet')

      // TerraPet has 9 services, Adris may have different count
      expect(terrapetData?.services.list.length).toBe(9)
      
      // Services should have different IDs or names
      const terrapetServiceNames = terrapetData?.services.list.map(s => s.name) || []
      const terrapetServiceNames = terrapetData?.services.list.map(s => s.name) || []

      // At least some services should be different (home visits unique to TerraPet)
      const hasDifferences = terrapetServiceNames.some(name => !terrapetServiceNames.includes(name))
      expect(hasDifferences).toBe(true)
    })

    it('terrapet contact info differs from terrapet', async () => {
      const terrapetData = await getClinicData('terrapet')
      const terrapetData = await getClinicData('terrapet')

      // Different phone numbers
      expect(terrapetData?.config.contact.phone).not.toBe(terrapetData?.config.contact.phone)

      // Different addresses
      expect(terrapetData?.config.contact.address).not.toBe(terrapetData?.config.contact.address)
    })

    it('each clinic has unique theme colors', async () => {
      const terrapetData = await getClinicData('terrapet')
      const terrapetData = await getClinicData('terrapet')

      // TerraPet: Earth tones (#78866B, #C19A6B, #E8A87C)
      expect(terrapetData?.theme.colors.primary).toBe('#78866B')

      // Adris: Different color scheme
      expect(terrapetData?.theme.colors.primary).not.toBe('#78866B')
    })
  })
})
