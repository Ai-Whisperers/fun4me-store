/**
 * Type Guards Tests
 *
 * Tests for lib/utils/type-guards.ts
 */

import { describe, it, expect } from 'vitest'
import {
  isDefined,
  isNonEmptyString,
  isNonEmptyArray,
  isValidNumber,
  isPositiveNumber,
  isPlainObject,
  hasProperty,
  hasProperties,
  isUserRole,
  isStaffRole,
  isType,
  assertDefined,
  assert,
  safeJsonParse,
  isJoinedRecord,
  isCategoryJoin,
  isBrandJoin,
  narrowOrDefault,
  filterMap,
  typedKeys,
  typedEntries,
  exhaustive,
} from '@/lib/utils/type-guards'

describe('Type Guards', () => {
  describe('isDefined', () => {
    it('returns true for defined values', () => {
      expect(isDefined(0)).toBe(true)
      expect(isDefined('')).toBe(true)
      expect(isDefined(false)).toBe(true)
      expect(isDefined({})).toBe(true)
      expect(isDefined([])).toBe(true)
    })

    it('returns false for null and undefined', () => {
      expect(isDefined(null)).toBe(false)
      expect(isDefined(undefined)).toBe(false)
    })
  })

  describe('isNonEmptyString', () => {
    it('returns true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true)
      expect(isNonEmptyString(' ')).toBe(true)
    })

    it('returns false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false)
    })

    it('returns false for non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false)
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(undefined)).toBe(false)
      expect(isNonEmptyString({})).toBe(false)
    })
  })

  describe('isNonEmptyArray', () => {
    it('returns true for non-empty arrays', () => {
      expect(isNonEmptyArray([1])).toBe(true)
      expect(isNonEmptyArray([1, 2, 3])).toBe(true)
    })

    it('returns false for empty arrays', () => {
      expect(isNonEmptyArray([])).toBe(false)
    })

    it('returns false for null and undefined', () => {
      expect(isNonEmptyArray(null)).toBe(false)
      expect(isNonEmptyArray(undefined)).toBe(false)
    })
  })

  describe('isValidNumber', () => {
    it('returns true for valid numbers', () => {
      expect(isValidNumber(0)).toBe(true)
      expect(isValidNumber(42)).toBe(true)
      expect(isValidNumber(-1)).toBe(true)
      expect(isValidNumber(3.14)).toBe(true)
    })

    it('returns false for NaN', () => {
      expect(isValidNumber(NaN)).toBe(false)
    })

    it('returns false for non-numbers', () => {
      expect(isValidNumber('123')).toBe(false)
      expect(isValidNumber(null)).toBe(false)
      expect(isValidNumber(undefined)).toBe(false)
    })
  })

  describe('isPositiveNumber', () => {
    it('returns true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true)
      expect(isPositiveNumber(0.001)).toBe(true)
      expect(isPositiveNumber(1000)).toBe(true)
    })

    it('returns false for zero and negative numbers', () => {
      expect(isPositiveNumber(0)).toBe(false)
      expect(isPositiveNumber(-1)).toBe(false)
    })

    it('returns false for non-numbers', () => {
      expect(isPositiveNumber('5')).toBe(false)
    })
  })

  describe('isPlainObject', () => {
    it('returns true for plain objects', () => {
      expect(isPlainObject({})).toBe(true)
      expect(isPlainObject({ a: 1 })).toBe(true)
    })

    it('returns false for arrays', () => {
      expect(isPlainObject([])).toBe(false)
    })

    it('returns false for null', () => {
      expect(isPlainObject(null)).toBe(false)
    })

    it('returns false for primitives', () => {
      expect(isPlainObject('string')).toBe(false)
      expect(isPlainObject(123)).toBe(false)
    })
  })

  describe('hasProperty', () => {
    it('returns true when object has property', () => {
      expect(hasProperty({ name: 'test' }, 'name')).toBe(true)
    })

    it('returns false when object lacks property', () => {
      expect(hasProperty({ name: 'test' }, 'id')).toBe(false)
    })

    it('returns false for non-objects', () => {
      expect(hasProperty(null, 'name')).toBe(false)
      expect(hasProperty('string', 'length')).toBe(false)
    })
  })

  describe('hasProperties', () => {
    it('returns true when object has all properties', () => {
      expect(hasProperties({ a: 1, b: 2, c: 3 }, ['a', 'b'])).toBe(true)
    })

    it('returns false when object lacks some properties', () => {
      expect(hasProperties({ a: 1 }, ['a', 'b'])).toBe(false)
    })

    it('returns false for non-objects', () => {
      expect(hasProperties(null, ['a'])).toBe(false)
    })
  })

  describe('isUserRole', () => {
    it('returns true for valid roles', () => {
      expect(isUserRole('owner')).toBe(true)
      expect(isUserRole('vet')).toBe(true)
      expect(isUserRole('admin')).toBe(true)
    })

    it('returns false for invalid roles', () => {
      expect(isUserRole('superadmin')).toBe(false)
      expect(isUserRole('')).toBe(false)
      expect(isUserRole(null)).toBe(false)
    })
  })

  describe('isStaffRole', () => {
    it('returns true for staff roles', () => {
      expect(isStaffRole('vet')).toBe(true)
      expect(isStaffRole('admin')).toBe(true)
    })

    it('returns false for owner', () => {
      expect(isStaffRole('owner')).toBe(false)
    })

    it('returns false for invalid values', () => {
      expect(isStaffRole(null)).toBe(false)
      expect(isStaffRole('manager')).toBe(false)
    })
  })

  describe('isType', () => {
    it('creates a type guard from validator', () => {
      const isString = isType<string>((v) => typeof v === 'string')
      expect(isString('hello')).toBe(true)
      expect(isString(123)).toBe(false)
    })
  })

  describe('assertDefined', () => {
    it('does not throw for defined values', () => {
      expect(() => assertDefined('value')).not.toThrow()
      expect(() => assertDefined(0)).not.toThrow()
      expect(() => assertDefined(false)).not.toThrow()
    })

    it('throws for null', () => {
      expect(() => assertDefined(null)).toThrow('Expected value to be defined')
    })

    it('throws for undefined', () => {
      expect(() => assertDefined(undefined)).toThrow('Expected value to be defined')
    })

    it('throws with custom message', () => {
      expect(() => assertDefined(null, 'Custom error')).toThrow('Custom error')
    })
  })

  describe('assert', () => {
    it('does not throw for true conditions', () => {
      expect(() => assert(true)).not.toThrow()
      expect(() => assert(1 === 1)).not.toThrow()
    })

    it('throws for false conditions', () => {
      expect(() => assert(false)).toThrow('Assertion failed')
    })

    it('throws with custom message', () => {
      expect(() => assert(false, 'Custom assertion')).toThrow('Custom assertion')
    })
  })

  describe('safeJsonParse', () => {
    it('parses valid JSON matching validator', () => {
      const isNumber = (v: unknown): v is number => typeof v === 'number'
      expect(safeJsonParse('42', isNumber)).toBe(42)
    })

    it('returns null for valid JSON not matching validator', () => {
      const isNumber = (v: unknown): v is number => typeof v === 'number'
      expect(safeJsonParse('"string"', isNumber)).toBe(null)
    })

    it('returns null for invalid JSON', () => {
      const isNumber = (v: unknown): v is number => typeof v === 'number'
      expect(safeJsonParse('invalid', isNumber)).toBe(null)
    })
  })

  describe('isJoinedRecord', () => {
    it('returns true for matching object', () => {
      expect(isJoinedRecord({ id: '1', name: 'test' }, ['id', 'name'])).toBe(true)
    })

    it('returns false for missing keys', () => {
      expect(isJoinedRecord({ id: '1' }, ['id', 'name'])).toBe(false)
    })

    it('returns false for non-objects', () => {
      expect(isJoinedRecord(null, ['id'])).toBe(false)
      expect(isJoinedRecord('string', ['length'])).toBe(false)
    })
  })

  describe('isCategoryJoin', () => {
    it('returns true for valid category', () => {
      expect(isCategoryJoin({ id: '1', name: 'Food', slug: 'food' })).toBe(true)
    })

    it('returns false for missing fields', () => {
      expect(isCategoryJoin({ id: '1', name: 'Food' })).toBe(false)
    })

    it('returns false for wrong types', () => {
      expect(isCategoryJoin({ id: 1, name: 'Food', slug: 'food' })).toBe(false)
    })

    it('returns false for non-objects', () => {
      expect(isCategoryJoin(null)).toBe(false)
    })
  })

  describe('isBrandJoin', () => {
    it('returns true for valid brand', () => {
      expect(isBrandJoin({ id: '1', name: 'Royal Canin' })).toBe(true)
    })

    it('returns false for missing fields', () => {
      expect(isBrandJoin({ id: '1' })).toBe(false)
    })

    it('returns false for wrong types', () => {
      expect(isBrandJoin({ id: 1, name: 'Brand' })).toBe(false)
    })

    it('returns false for non-objects', () => {
      expect(isBrandJoin(null)).toBe(false)
    })
  })

  describe('narrowOrDefault', () => {
    it('returns validated value when valid', () => {
      const isNumber = (v: unknown): v is number => typeof v === 'number'
      expect(narrowOrDefault(42, isNumber, 0)).toBe(42)
    })

    it('returns fallback when invalid', () => {
      const isNumber = (v: unknown): v is number => typeof v === 'number'
      expect(narrowOrDefault('string', isNumber, 0)).toBe(0)
    })
  })

  describe('filterMap', () => {
    it('filters and maps in one pass', () => {
      const result = filterMap([1, 2, 3, 4, 5], (n) => (n % 2 === 0 ? n * 2 : null))
      expect(result).toEqual([4, 8])
    })

    it('handles empty arrays', () => {
      expect(filterMap([], (n) => n)).toEqual([])
    })

    it('handles all filtered out', () => {
      expect(filterMap([1, 2, 3], () => null)).toEqual([])
    })

    it('provides index to callback', () => {
      const result = filterMap(['a', 'b', 'c'], (_, i) => i)
      expect(result).toEqual([0, 1, 2])
    })
  })

  describe('typedKeys', () => {
    it('returns typed keys of object', () => {
      const obj = { a: 1, b: 2 }
      const keys = typedKeys(obj)
      expect(keys).toEqual(['a', 'b'])
    })
  })

  describe('typedEntries', () => {
    it('returns typed entries of object', () => {
      const obj = { a: 1, b: 2 }
      const entries = typedEntries(obj)
      expect(entries).toEqual([
        ['a', 1],
        ['b', 2],
      ])
    })
  })

  describe('exhaustive', () => {
    it('throws for unhandled cases', () => {
      const value = 'unexpected' as never
      expect(() => exhaustive(value)).toThrow('Unhandled case: "unexpected"')
    })

    it('throws with custom message', () => {
      const value = 'unexpected' as never
      expect(() => exhaustive(value, 'Custom error')).toThrow('Custom error')
    })
  })
})
