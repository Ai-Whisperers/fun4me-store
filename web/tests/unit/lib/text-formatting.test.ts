/**
 * Text Formatting Tests
 *
 * Tests for lib/formatting/text.ts
 */

import { describe, it, expect } from 'vitest'
import {
  truncate,
  capitalize,
  titleCase,
  slugify,
  initials,
  pluralize,
  formatCount,
  joinList,
  removeAccents,
  highlight,
  escapeRegex,
  camelToSentence,
  maskText,
  sanitizeFilename,
  nl2br,
} from '@/lib/formatting/text'

describe('Text Formatting', () => {
  describe('truncate', () => {
    it('returns original text if within limit', () => {
      expect(truncate('Short', 10)).toBe('Short')
    })

    it('truncates long text with default suffix', () => {
      expect(truncate('This is a long text', 10)).toBe('This is...')
    })

    it('truncates with custom suffix', () => {
      expect(truncate('Long text here', 12, '…')).toBe('Long text h…')
    })

    it('handles empty string', () => {
      expect(truncate('', 10)).toBe('')
    })

    it('handles exact length match', () => {
      expect(truncate('Exact', 5)).toBe('Exact')
    })
  })

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello world')).toBe('Hello world')
    })

    it('lowercases rest of text', () => {
      expect(capitalize('HELLO')).toBe('Hello')
    })

    it('handles empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('handles single character', () => {
      expect(capitalize('a')).toBe('A')
    })
  })

  describe('titleCase', () => {
    it('capitalizes each word', () => {
      expect(titleCase('hello world')).toBe('Hello World')
    })

    it('handles multiple words', () => {
      expect(titleCase('the quick brown fox')).toBe('The Quick Brown Fox')
    })

    it('handles empty string', () => {
      expect(titleCase('')).toBe('')
    })

    it('handles single word', () => {
      expect(titleCase('hello')).toBe('Hello')
    })
  })

  describe('slugify', () => {
    it('converts to lowercase with hyphens', () => {
      expect(slugify('TerraPet')).toBe('terrapet')
    })

    it('removes accents and special characters', () => {
      expect(slugify('Café & Té')).toBe('cafe-te')
    })

    it('handles multiple spaces', () => {
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces')
    })

    it('handles empty string', () => {
      expect(slugify('')).toBe('')
    })

    it('handles numbers', () => {
      expect(slugify('Product 123')).toBe('product-123')
    })
  })

  describe('initials', () => {
    it('returns initials from name', () => {
      expect(initials('Juan Pérez')).toBe('JP')
    })

    it('respects maxChars parameter', () => {
      expect(initials('María del Carmen López', 3)).toBe('MDC')
    })

    it('handles single name', () => {
      expect(initials('Ana')).toBe('A')
    })

    it('handles empty string', () => {
      expect(initials('')).toBe('')
    })

    it('handles multiple spaces', () => {
      expect(initials('Juan  Pedro')).toBe('JP')
    })
  })

  describe('pluralize', () => {
    it('returns singular for count 1', () => {
      expect(pluralize(1, 'mascota')).toBe('mascota')
    })

    it('returns plural for count > 1', () => {
      expect(pluralize(2, 'mascota')).toBe('mascotas')
    })

    it('returns plural for count 0', () => {
      expect(pluralize(0, 'mascota')).toBe('mascotas')
    })

    it('uses custom plural form', () => {
      expect(pluralize(1, 'mes', 'meses')).toBe('mes')
      expect(pluralize(5, 'mes', 'meses')).toBe('meses')
    })
  })

  describe('formatCount', () => {
    it('formats count with singular', () => {
      expect(formatCount(1, 'mascota')).toBe('1 mascota')
    })

    it('formats count with plural', () => {
      expect(formatCount(5, 'mascota')).toBe('5 mascotas')
    })

    it('uses custom plural', () => {
      expect(formatCount(3, 'mes', 'meses')).toBe('3 meses')
    })

    it('handles zero', () => {
      expect(formatCount(0, 'item')).toBe('0 items')
    })
  })

  describe('joinList', () => {
    it('joins two items with conjunction', () => {
      expect(joinList(['perro', 'gato'])).toBe('perro y gato')
    })

    it('joins multiple items with commas and conjunction', () => {
      expect(joinList(['perro', 'gato', 'loro'])).toBe('perro, gato y loro')
    })

    it('uses custom conjunction', () => {
      expect(joinList(['uno', 'dos', 'tres'], 'o')).toBe('uno, dos o tres')
    })

    it('handles single item', () => {
      expect(joinList(['solo'])).toBe('solo')
    })

    it('handles empty array', () => {
      expect(joinList([])).toBe('')
    })
  })

  describe('removeAccents', () => {
    it('removes Spanish accents', () => {
      expect(removeAccents('María José Pérez')).toBe('Maria Jose Perez')
    })

    it('removes ñ accent', () => {
      expect(removeAccents('Año')).toBe('Ano')
    })

    it('handles text without accents', () => {
      expect(removeAccents('Hello World')).toBe('Hello World')
    })

    it('handles empty string', () => {
      expect(removeAccents('')).toBe('')
    })
  })

  describe('highlight', () => {
    it('highlights search term with mark tags', () => {
      expect(highlight('Hello World', 'world')).toBe('Hello <mark>World</mark>')
    })

    it('highlights multiple occurrences', () => {
      expect(highlight('Test test TEST', 'test')).toBe(
        '<mark>Test</mark> <mark>test</mark> <mark>TEST</mark>'
      )
    })

    it('handles case sensitivity', () => {
      expect(highlight('Test TEST test', 'TEST', true)).toBe('Test <mark>TEST</mark> test')
    })

    it('returns original text when no search term', () => {
      expect(highlight('Hello World', '')).toBe('Hello World')
    })

    it('handles special regex characters', () => {
      expect(highlight('Price: $100', '$100')).toBe('Price: <mark>$100</mark>')
    })
  })

  describe('escapeRegex', () => {
    it('escapes special regex characters', () => {
      expect(escapeRegex('hello.world')).toBe('hello\\.world')
    })

    it('escapes dollar sign', () => {
      expect(escapeRegex('$100')).toBe('\\$100')
    })

    it('escapes multiple special characters', () => {
      expect(escapeRegex('a+b*c?')).toBe('a\\+b\\*c\\?')
    })

    it('handles text without special characters', () => {
      expect(escapeRegex('hello')).toBe('hello')
    })
  })

  describe('camelToSentence', () => {
    it('converts camelCase to sentence case', () => {
      expect(camelToSentence('camelCaseText')).toBe('Camel case text')
    })

    it('converts PascalCase to sentence case', () => {
      expect(camelToSentence('PascalCase')).toBe(' pascal case')
    })

    it('handles single word', () => {
      expect(camelToSentence('hello')).toBe('Hello')
    })
  })

  describe('maskText', () => {
    it('masks middle of text', () => {
      expect(maskText('sensitive@email.com', 3)).toBe('sen*************com')
    })

    it('uses custom mask character', () => {
      expect(maskText('0981123456', 2, 'X')).toBe('09XXXXXX56')
    })

    it('returns original if too short to mask', () => {
      expect(maskText('short', 3)).toBe('short')
    })

    it('handles exact boundary', () => {
      expect(maskText('123456', 3)).toBe('123456')
    })
  })

  describe('sanitizeFilename', () => {
    it('removes invalid characters', () => {
      expect(sanitizeFilename('My File: Version 2.pdf')).toBe('My File Version 2.pdf')
    })

    it('preserves hash character (not a filesystem invalid char)', () => {
      expect(sanitizeFilename('Invoice #123.pdf')).toBe('Invoice #123.pdf')
    })

    it('removes question mark', () => {
      expect(sanitizeFilename('file?.pdf')).toBe('file.pdf')
    })

    it('handles windows path separators', () => {
      expect(sanitizeFilename('folder\\file.txt')).toBe('folderfile.txt')
    })

    it('handles clean filename', () => {
      expect(sanitizeFilename('clean-file.pdf')).toBe('clean-file.pdf')
    })
  })

  describe('nl2br', () => {
    it('converts newlines to br tags', () => {
      expect(nl2br('Line 1\nLine 2')).toBe('Line 1<br>Line 2')
    })

    it('handles multiple newlines', () => {
      expect(nl2br('A\nB\nC')).toBe('A<br>B<br>C')
    })

    it('handles text without newlines', () => {
      expect(nl2br('No newlines')).toBe('No newlines')
    })

    it('handles empty string', () => {
      expect(nl2br('')).toBe('')
    })
  })
})
