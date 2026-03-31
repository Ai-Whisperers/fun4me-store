/**
 * Consent Types Unit Tests
 *
 * COMP-003: Tests for consent type utilities and validation
 */

import { describe, it, expect } from 'vitest'
import {
  CONSENT_TYPES,
  CONSENT_SOURCES,
  CONSENT_DESCRIPTIONS,
  REQUIRED_CONSENT_TYPES,
  OPTIONAL_CONSENT_TYPES,
  MARKETING_CONSENT_TYPES,
  isValidConsentType,
  isValidConsentSource,
  getAllConsentTypes,
  getConsentLabel,
  getConsentDescription,
  isRequiredConsent,
  isMarketingConsent,
} from '@/lib/consent'

describe('Consent Types', () => {
  describe('CONSENT_TYPES', () => {
    it('should have 9 consent types defined', () => {
      expect(Object.keys(CONSENT_TYPES)).toHaveLength(9)
    })

    it('should include all required consent types', () => {
      expect(CONSENT_TYPES.MEDICAL_TREATMENT).toBe('medical_treatment')
      expect(CONSENT_TYPES.DATA_PROCESSING).toBe('data_processing')
      expect(CONSENT_TYPES.MARKETING_EMAIL).toBe('marketing_email')
      expect(CONSENT_TYPES.MARKETING_SMS).toBe('marketing_sms')
      expect(CONSENT_TYPES.THIRD_PARTY_SHARING).toBe('third_party_sharing')
      expect(CONSENT_TYPES.ANALYTICS_COOKIES).toBe('analytics_cookies')
      expect(CONSENT_TYPES.PHOTO_SHARING).toBe('photo_sharing')
      expect(CONSENT_TYPES.MARKETING_WHATSAPP).toBe('marketing_whatsapp')
      expect(CONSENT_TYPES.PUSH_NOTIFICATIONS).toBe('push_notifications')
    })
  })

  describe('CONSENT_SOURCES', () => {
    it('should have 6 sources defined', () => {
      expect(Object.keys(CONSENT_SOURCES)).toHaveLength(6)
    })

    it('should include all required sources', () => {
      expect(CONSENT_SOURCES.SIGNUP).toBe('signup')
      expect(CONSENT_SOURCES.SETTINGS).toBe('settings')
      expect(CONSENT_SOURCES.PROCEDURE).toBe('procedure')
      expect(CONSENT_SOURCES.BANNER).toBe('banner')
      expect(CONSENT_SOURCES.API).toBe('api')
      expect(CONSENT_SOURCES.IMPORT).toBe('import')
    })
  })

  describe('CONSENT_DESCRIPTIONS', () => {
    it('should have descriptions for all consent types', () => {
      for (const type of Object.values(CONSENT_TYPES)) {
        expect(CONSENT_DESCRIPTIONS[type]).toBeDefined()
        expect(CONSENT_DESCRIPTIONS[type].label).toBeDefined()
        expect(CONSENT_DESCRIPTIONS[type].description).toBeDefined()
      }
    })

    it('should have Spanish labels', () => {
      expect(CONSENT_DESCRIPTIONS.marketing_email.label).toBe('Correos promocionales')
      expect(CONSENT_DESCRIPTIONS.data_processing.label).toBe('Procesamiento de datos')
    })
  })

  describe('isValidConsentType', () => {
    it('should return true for valid consent types', () => {
      expect(isValidConsentType('marketing_email')).toBe(true)
      expect(isValidConsentType('data_processing')).toBe(true)
      expect(isValidConsentType('photo_sharing')).toBe(true)
    })

    it('should return false for invalid consent types', () => {
      expect(isValidConsentType('invalid_type')).toBe(false)
      expect(isValidConsentType('')).toBe(false)
      expect(isValidConsentType('MARKETING_EMAIL')).toBe(false) // case sensitive
    })
  })

  describe('isValidConsentSource', () => {
    it('should return true for valid sources', () => {
      expect(isValidConsentSource('signup')).toBe(true)
      expect(isValidConsentSource('settings')).toBe(true)
      expect(isValidConsentSource('banner')).toBe(true)
    })

    it('should return false for invalid sources', () => {
      expect(isValidConsentSource('invalid_source')).toBe(false)
      expect(isValidConsentSource('')).toBe(false)
    })
  })

  describe('getAllConsentTypes', () => {
    it('should return all consent types', () => {
      const types = getAllConsentTypes()
      expect(types).toHaveLength(9)
      expect(types).toContain('marketing_email')
      expect(types).toContain('data_processing')
    })
  })

  describe('getConsentLabel', () => {
    it('should return label for valid type', () => {
      expect(getConsentLabel('marketing_email')).toBe('Correos promocionales')
    })

    it('should return type itself for unknown type', () => {
      // @ts-expect-error Testing invalid type
      expect(getConsentLabel('unknown_type')).toBe('unknown_type')
    })
  })

  describe('getConsentDescription', () => {
    it('should return description for valid type', () => {
      const desc = getConsentDescription('marketing_email')
      expect(desc).toContain('ofertas')
    })

    it('should return empty string for unknown type', () => {
      // @ts-expect-error Testing invalid type
      expect(getConsentDescription('unknown_type')).toBe('')
    })
  })

  describe('isRequiredConsent', () => {
    it('should return true for data_processing', () => {
      expect(isRequiredConsent('data_processing')).toBe(true)
    })

    it('should return false for optional consents', () => {
      expect(isRequiredConsent('marketing_email')).toBe(false)
      expect(isRequiredConsent('photo_sharing')).toBe(false)
    })
  })

  describe('isMarketingConsent', () => {
    it('should return true for marketing types', () => {
      expect(isMarketingConsent('marketing_email')).toBe(true)
      expect(isMarketingConsent('marketing_sms')).toBe(true)
      expect(isMarketingConsent('marketing_whatsapp')).toBe(true)
      expect(isMarketingConsent('push_notifications')).toBe(true)
    })

    it('should return false for non-marketing types', () => {
      expect(isMarketingConsent('data_processing')).toBe(false)
      expect(isMarketingConsent('photo_sharing')).toBe(false)
    })
  })

  describe('Consent type categorization', () => {
    it('should have non-overlapping required and optional types', () => {
      const requiredSet = new Set(REQUIRED_CONSENT_TYPES)
      const optionalSet = new Set(OPTIONAL_CONSENT_TYPES)

      for (const type of REQUIRED_CONSENT_TYPES) {
        expect(optionalSet.has(type)).toBe(false)
      }

      for (const type of OPTIONAL_CONSENT_TYPES) {
        expect(requiredSet.has(type)).toBe(false)
      }
    })

    it('should cover all consent types between required and optional', () => {
      const allTypes = new Set([...REQUIRED_CONSENT_TYPES, ...OPTIONAL_CONSENT_TYPES])
      expect(allTypes.size).toBe(Object.keys(CONSENT_TYPES).length)
    })

    it('should have marketing types as subset of optional types', () => {
      for (const type of MARKETING_CONSENT_TYPES) {
        expect(OPTIONAL_CONSENT_TYPES).toContain(type)
      }
    })
  })
})
