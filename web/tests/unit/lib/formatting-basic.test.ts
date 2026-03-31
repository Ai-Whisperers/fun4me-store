/**
 * Basic tests for formatting utilities
 *
 * These tests verify the core functionality of the consolidated formatting module.
 */

import { describe, it, expect } from 'vitest'

// Currency formatting
import {
  formatPrice,
  formatPriceGs,
  parseCurrency,
  formatPriceRange,
} from '@/lib/formatting/currency'

// Date formatting
import { formatDate, formatAge, formatTime } from '@/lib/formatting/date'

// Number formatting
import { formatNumber, formatPercentage, formatBytes, formatWeight } from '@/lib/formatting/number'

// Text utilities
import { truncate, capitalize, slugify, initials, pluralize } from '@/lib/formatting/text'

describe('Currency Formatting', () => {
  it('formats price in PYG correctly', () => {
    expect(formatPrice(150000)).toContain('150')
    expect(formatPrice(null)).toBeDefined()
  })

  it('formats price with Gs suffix', () => {
    expect(formatPriceGs(150000)).toBe('150.000 Gs')
    expect(formatPriceGs(null)).toBe('0 Gs')
  })

  it('parses currency strings', () => {
    expect(parseCurrency('₲ 150.000')).toBeGreaterThan(0)
    expect(parseCurrency('$99.99')).toBeCloseTo(99.99)
  })

  it('formats price ranges', () => {
    const range = formatPriceRange(50000, 150000)
    expect(range).toContain('50')
    expect(range).toContain('150')
  })

  it('handles same min/max in range', () => {
    const range = formatPriceRange(100000, 100000)
    expect(range).not.toContain('-')
  })
})

describe('Date Formatting', () => {
  it('formats dates in DD/MM/YYYY format', () => {
    const formatted = formatDate(new Date('2024-12-19'))
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('formats time correctly', () => {
    const formatted = formatTime(new Date('2024-12-19T14:30:00'))
    expect(formatted).toMatch(/\d{2}:\d{2}/)
  })

  it('calculates age from birth date', () => {
    const age = formatAge(new Date('2022-06-15'))
    expect(age).toContain('año')
  })

  it('handles null dates gracefully', () => {
    expect(formatDate(null)).toBe('')
    expect(formatAge(null)).toBe('')
  })
})

describe('Number Formatting', () => {
  it('formats numbers with locale', () => {
    expect(formatNumber(1500)).toBe('1.500')
    expect(formatNumber(1500.5, 1)).toBe('1.500,5')
  })

  it('formats percentages', () => {
    const percent = formatPercentage(0.15)
    expect(percent).toContain('15')
    expect(percent).toContain('%')
  })

  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toContain('KB')
    expect(formatBytes(1536000)).toContain('MB')
  })

  it('formats weight in kg/g', () => {
    expect(formatWeight(2.5)).toContain('kg')
    expect(formatWeight(0.5)).toContain('g')
  })
})

describe('Text Utilities', () => {
  it('truncates text', () => {
    expect(truncate('This is a long text', 10)).toBe('This is...')
    expect(truncate('Short', 10)).toBe('Short')
  })

  it('capitalizes text', () => {
    expect(capitalize('hello world')).toBe('Hello world')
    expect(capitalize('HELLO')).toBe('Hello')
  })

  it('creates slugs', () => {
    expect(slugify('TerraPet')).toBe('terrapet')
    expect(slugify('Café & Té')).toBe('cafe-te')
  })

  it('generates initials', () => {
    expect(initials('Juan Pérez')).toBe('JP')
    expect(initials('María del Carmen López', 3)).toBe('MDC')
  })

  it('pluralizes Spanish words', () => {
    expect(pluralize(1, 'mascota')).toBe('mascota')
    expect(pluralize(2, 'mascota')).toBe('mascotas')
    expect(pluralize(1, 'mes', 'meses')).toBe('mes')
    expect(pluralize(5, 'mes', 'meses')).toBe('meses')
  })
})
