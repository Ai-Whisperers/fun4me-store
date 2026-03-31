/**
 * Search utilities for safe database querying
 * SEC-009: Escape LIKE pattern special characters to prevent injection
 */

/**
 * Escape special characters in LIKE patterns
 * PostgreSQL LIKE uses % and _ as wildcards:
 * - % matches any sequence of characters
 * - _ matches any single character
 *
 * Without escaping, user input like "100%" would match "1000", "100x", etc.
 */
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\') // Escape backslash first
    .replace(/%/g, '\\%') // Escape percent
    .replace(/_/g, '\\_') // Escape underscore
}

/**
 * Create a safe search pattern for ILIKE queries
 * Trims input, escapes special characters, wraps with %
 *
 * @example
 * createSearchPattern('test') // '%test%'
 * createSearchPattern('100%') // '%100\\%%' - literal 100% search
 * createSearchPattern('_a_') // '%\\_a\\_%' - literal _a_ search
 */
export function createSearchPattern(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return ''

  const escaped = escapeLikePattern(trimmed)
  return `%${escaped}%`
}

/**
 * Minimum search query length
 */
export const MIN_SEARCH_LENGTH = 2

/**
 * Maximum search query length
 */
export const MAX_SEARCH_LENGTH = 100

/**
 * Validate and sanitize a search query
 * Returns null if invalid, otherwise returns trimmed query
 */
export function validateSearchQuery(query: string | null | undefined): string | null {
  if (!query) return null

  const trimmed = query.trim()
  if (trimmed.length < MIN_SEARCH_LENGTH) return null
  if (trimmed.length > MAX_SEARCH_LENGTH) return null

  return trimmed
}
