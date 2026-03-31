/**
 * Privacy Types Unit Tests
 *
 * COMP-002: Tests for privacy policy type utilities
 */

import { describe, it, expect } from 'vitest'
import {
  isValidVersion,
  compareVersions,
  incrementVersion,
  VERSION_REGEX,
  DEFAULT_POLICY_SECTIONS,
} from '@/lib/privacy'

describe('Privacy Policy Types', () => {
  describe('VERSION_REGEX', () => {
    it('should match valid version formats', () => {
      expect(VERSION_REGEX.test('1.0')).toBe(true)
      expect(VERSION_REGEX.test('2.1')).toBe(true)
      expect(VERSION_REGEX.test('1.0.0')).toBe(true)
      expect(VERSION_REGEX.test('10.20.30')).toBe(true)
      expect(VERSION_REGEX.test('0.1')).toBe(true)
      expect(VERSION_REGEX.test('99.99.99')).toBe(true)
    })

    it('should reject invalid version formats', () => {
      expect(VERSION_REGEX.test('')).toBe(false)
      expect(VERSION_REGEX.test('1')).toBe(false)
      expect(VERSION_REGEX.test('1.')).toBe(false)
      expect(VERSION_REGEX.test('.1')).toBe(false)
      expect(VERSION_REGEX.test('1.0.0.0')).toBe(false)
      expect(VERSION_REGEX.test('v1.0')).toBe(false)
      expect(VERSION_REGEX.test('1.0-beta')).toBe(false)
      expect(VERSION_REGEX.test('1.a')).toBe(false)
      expect(VERSION_REGEX.test('a.b')).toBe(false)
    })
  })

  describe('isValidVersion', () => {
    it('should return true for valid versions', () => {
      expect(isValidVersion('1.0')).toBe(true)
      expect(isValidVersion('2.1')).toBe(true)
      expect(isValidVersion('1.0.0')).toBe(true)
      expect(isValidVersion('10.20.30')).toBe(true)
    })

    it('should return false for invalid versions', () => {
      expect(isValidVersion('')).toBe(false)
      expect(isValidVersion('1')).toBe(false)
      expect(isValidVersion('v1.0')).toBe(false)
      expect(isValidVersion('1.0.0.0')).toBe(false)
    })
  })

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.0', '1.0')).toBe(0)
      expect(compareVersions('2.1.3', '2.1.3')).toBe(0)
      expect(compareVersions('1.0', '1.0.0')).toBe(0)
    })

    it('should return -1 when first version is smaller', () => {
      expect(compareVersions('1.0', '2.0')).toBe(-1)
      expect(compareVersions('1.0', '1.1')).toBe(-1)
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
      expect(compareVersions('1.9', '2.0')).toBe(-1)
      expect(compareVersions('1.0', '1.0.1')).toBe(-1)
    })

    it('should return 1 when first version is larger', () => {
      expect(compareVersions('2.0', '1.0')).toBe(1)
      expect(compareVersions('1.1', '1.0')).toBe(1)
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1)
      expect(compareVersions('2.0', '1.9')).toBe(1)
      expect(compareVersions('1.0.1', '1.0')).toBe(1)
    })

    it('should handle multi-digit version numbers', () => {
      expect(compareVersions('10.0', '9.0')).toBe(1)
      expect(compareVersions('1.10', '1.9')).toBe(1)
      expect(compareVersions('1.0.10', '1.0.9')).toBe(1)
    })

    it('should handle different version lengths', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0)
      expect(compareVersions('1.0.0', '1.0')).toBe(0)
      expect(compareVersions('1.0.1', '1.0')).toBe(1)
      expect(compareVersions('1.0', '1.0.1')).toBe(-1)
    })
  })

  describe('incrementVersion', () => {
    it('should increment minor version for 2-part versions', () => {
      expect(incrementVersion('1.0')).toBe('1.1')
      expect(incrementVersion('1.9')).toBe('1.10')
      expect(incrementVersion('2.5')).toBe('2.6')
    })

    it('should increment patch version for 3-part versions', () => {
      expect(incrementVersion('1.0.0')).toBe('1.0.1')
      expect(incrementVersion('1.0.9')).toBe('1.0.10')
      expect(incrementVersion('2.1.5')).toBe('2.1.6')
    })

    it('should handle edge cases', () => {
      expect(incrementVersion('0.0')).toBe('0.1')
      expect(incrementVersion('0.0.0')).toBe('0.0.1')
      expect(incrementVersion('99.99')).toBe('99.100')
    })
  })

  describe('DEFAULT_POLICY_SECTIONS', () => {
    it('should have all required sections', () => {
      const expectedSections = [
        'introduction',
        'dataCollected',
        'howWeUseData',
        'dataSharing',
        'dataRetention',
        'userRights',
        'cookies',
        'security',
        'children',
        'changes',
        'contact',
      ]

      expectedSections.forEach((section) => {
        expect(DEFAULT_POLICY_SECTIONS).toHaveProperty(section)
      })
    })

    it('should have Spanish labels for all sections', () => {
      Object.values(DEFAULT_POLICY_SECTIONS).forEach((label) => {
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })
  })
})
