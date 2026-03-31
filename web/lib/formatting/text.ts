/**
 * Text Formatting Utilities
 *
 * Centralized text manipulation and formatting utilities.
 */

/**
 * Truncate text to maximum length with optional suffix
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length including suffix
 * @param suffix - Suffix to append when truncated (default: "...")
 * @returns Truncated text or original if within limit
 *
 * @example
 * truncate("This is a long text", 10) // "This is..."
 * truncate("Short", 10) // "Short"
 * truncate("Long text here", 12, "…") // "Long text…"
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Capitalize first letter of text
 *
 * @param text - Text to capitalize
 * @returns Text with first letter capitalized
 *
 * @example
 * capitalize("hello world") // "Hello world"
 * capitalize("HELLO") // "Hello"
 */
export function capitalize(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Convert text to title case (each word capitalized)
 *
 * @param text - Text to convert
 * @returns Text in title case
 *
 * @example
 * titleCase("hello world") // "Hello World"
 * titleCase("the quick brown fox") // "The Quick Brown Fox"
 */
export function titleCase(text: string): string {
  if (!text) return text
  return text.split(' ').map(capitalize).join(' ')
}

/**
 * Convert text to URL-friendly slug
 *
 * @param text - Text to slugify
 * @returns URL-friendly slug
 *
 * @example
 * slugify("Veterinaria Adris") // "terrapet"
 * slugify("Café & Té") // "cafe-te"
 * slugify("  Multiple   Spaces  ") // "multiple-spaces"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Get initials from name
 *
 * @param name - Full name
 * @param maxChars - Maximum number of initials (default: 2)
 * @returns Initials in uppercase
 *
 * @example
 * initials("Juan Pérez") // "JP"
 * initials("María del Carmen López", 3) // "MDC"
 * initials("Ana") // "A"
 */
export function initials(name: string, maxChars = 2): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, maxChars)
    .join('')
    .toUpperCase()
}

/**
 * Pluralize word based on count (Spanish grammar)
 *
 * @param count - Number to check
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + "s")
 * @returns Appropriate form based on count
 *
 * @example
 * pluralize(1, "mascota") // "mascota"
 * pluralize(2, "mascota") // "mascotas"
 * pluralize(1, "mes", "meses") // "mes"
 * pluralize(5, "mes", "meses") // "meses"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`
}

/**
 * Format count with word (e.g., "5 mascotas", "1 mascota")
 *
 * @param count - Number to display
 * @param singular - Singular form of the word
 * @param plural - Plural form (optional)
 * @returns Formatted count with word
 *
 * @example
 * formatCount(1, "mascota") // "1 mascota"
 * formatCount(5, "mascota") // "5 mascotas"
 * formatCount(1, "mes", "meses") // "1 mes"
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`
}

/**
 * Join array with proper grammar (comma-separated with "y" before last item)
 *
 * @param items - Array of strings
 * @param conjunction - Conjunction word (default: "y")
 * @returns Formatted list
 *
 * @example
 * joinList(["perro", "gato"]) // "perro y gato"
 * joinList(["perro", "gato", "loro"]) // "perro, gato y loro"
 * joinList(["uno", "dos", "tres"], "o") // "uno, dos o tres"
 */
export function joinList(items: string[], conjunction = 'y'): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`

  const allButLast = items.slice(0, -1).join(', ')
  const last = items[items.length - 1]
  return `${allButLast} ${conjunction} ${last}`
}

/**
 * Remove accents/diacritics from text
 *
 * @param text - Text with accents
 * @returns Text without accents
 *
 * @example
 * removeAccents("María José Pérez") // "Maria Jose Perez"
 * removeAccents("Año") // "Ano"
 */
export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Highlight search term in text with HTML mark tags
 *
 * @param text - Text to search in
 * @param searchTerm - Term to highlight
 * @param caseSensitive - Whether search is case sensitive (default: false)
 * @returns Text with <mark> tags around matches
 *
 * @example
 * highlight("Hello World", "world") // "Hello <mark>World</mark>"
 * highlight("Test test TEST", "test") // "<mark>Test</mark> <mark>test</mark> <mark>TEST</mark>"
 */
export function highlight(text: string, searchTerm: string, caseSensitive = false): string {
  if (!searchTerm) return text

  const flags = caseSensitive ? 'g' : 'gi'
  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, flags)
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * Escape special regex characters in string
 *
 * @param text - Text to escape
 * @returns Escaped text safe for use in RegExp
 *
 * @example
 * escapeRegex("hello.world") // "hello\\.world"
 * escapeRegex("$100") // "\\$100"
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Convert camelCase or PascalCase to sentence case
 *
 * @param text - camelCase or PascalCase text
 * @returns Sentence case text
 *
 * @example
 * camelToSentence("camelCaseText") // "Camel case text"
 * camelToSentence("PascalCase") // "Pascal case"
 */
export function camelToSentence(text: string): string {
  const result = text.replace(/([A-Z])/g, ' $1')
  return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase()
}

/**
 * Mask sensitive information (e.g., email, phone)
 *
 * @param text - Text to mask
 * @param visibleChars - Number of visible characters at start/end (default: 3)
 * @param maskChar - Character to use for masking (default: "*")
 * @returns Masked text
 *
 * @example
 * maskText("sensitive@email.com", 3) // "sen*******com"
 * maskText("0981123456", 2, "X") // "09XXXXXX56"
 */
export function maskText(text: string, visibleChars = 3, maskChar = '*'): string {
  if (text.length <= visibleChars * 2) return text

  const start = text.slice(0, visibleChars)
  const end = text.slice(-visibleChars)
  const middle = maskChar.repeat(text.length - visibleChars * 2)
  return `${start}${middle}${end}`
}

/**
 * Sanitize filename by removing invalid characters
 *
 * @param filename - Filename to sanitize
 * @returns Safe filename
 *
 * @example
 * sanitizeFilename("My File: Version 2.pdf") // "My File Version 2.pdf"
 * sanitizeFilename("Invoice #123.pdf") // "Invoice 123.pdf"
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[/\\?%*:|"<>]/g, '')
}

/**
 * Convert newlines to HTML <br> tags
 *
 * @param text - Text with newlines
 * @returns Text with <br> tags
 *
 * @example
 * nl2br("Line 1\nLine 2") // "Line 1<br>Line 2"
 */
export function nl2br(text: string): string {
  return text.replace(/\n/g, '<br>')
}
