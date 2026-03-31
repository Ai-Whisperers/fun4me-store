/**
 * HTML Sanitization Utilities
 *
 * Centralized HTML sanitization to prevent XSS attacks when using dangerouslySetInnerHTML.
 * Uses DOMPurify with strict configuration for different content contexts.
 *
 * @module lib/utils/sanitize
 * @see SEC-012: Missing HTML Sanitization
 */

import DOMPurify, { Config as DOMPurifyConfig } from 'dompurify'

/**
 * Sanitization presets for different content contexts
 */
export const SANITIZE_PRESETS = {
  /**
   * For rich text content like product descriptions, blog posts
   * Allows basic formatting and links
   */
  richText: {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'a',
      'span',
      'div',
      'blockquote',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'form',
      'input',
      'button',
      'link',
      'meta',
      'object',
      'embed',
    ],
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur', 'src', 'action'],
    // Force all links to open in new tab with noopener
    ADD_ATTR: ['target', 'rel'],
  },

  /**
   * For consent documents and legal text
   * More restrictive - no links allowed for security
   */
  consent: {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
    ],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'form',
      'input',
      'button',
      'link',
      'meta',
      'object',
      'embed',
      'a',
    ],
    FORBID_ATTR: [
      'onclick',
      'onerror',
      'onload',
      'onmouseover',
      'onfocus',
      'onblur',
      'href',
      'src',
      'action',
    ],
  },

  /**
   * Most restrictive - plain text only with basic formatting
   * For user-generated content in comments, messages, etc.
   */
  basicText: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i'],
    ALLOWED_ATTR: [],
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'form',
      'input',
      'button',
      'link',
      'meta',
      'object',
      'embed',
      'a',
      'img',
    ],
    FORBID_ATTR: [
      'onclick',
      'onerror',
      'onload',
      'onmouseover',
      'onfocus',
      'onblur',
      'href',
      'src',
      'action',
      'class',
      'style',
    ],
  },
} as const

export type SanitizePreset = keyof typeof SANITIZE_PRESETS

/**
 * Sanitizes HTML content to prevent XSS attacks
 *
 * @param html - Raw HTML string to sanitize
 * @param preset - Preset configuration name or custom config
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 *
 * @example
 * // Using a preset
 * const safeHtml = sanitizeHtml(product.description, 'richText')
 *
 * @example
 * // With custom config
 * const safeHtml = sanitizeHtml(content, {
 *   ALLOWED_TAGS: ['p', 'br'],
 *   ALLOWED_ATTR: []
 * })
 */
export function sanitizeHtml(
  html: string | null | undefined,
  preset: SanitizePreset | DOMPurifyConfig = 'richText'
): string {
  if (!html) return ''

  const config = typeof preset === 'string' ? SANITIZE_PRESETS[preset as SanitizePreset] : preset

  // @ts-expect-error DOMPurify type mismatch between versions
  return DOMPurify.sanitize(html, config)
}

/**
 * Creates a sanitized HTML object for React's dangerouslySetInnerHTML
 *
 * @param html - Raw HTML string to sanitize
 * @param preset - Preset configuration name or custom config
 * @returns Object with __html property for dangerouslySetInnerHTML
 *
 * @example
 * <div dangerouslySetInnerHTML={createSanitizedHtml(product.description, 'richText')} />
 */
export function createSanitizedHtml(
  html: string | null | undefined,
  preset: SanitizePreset | DOMPurifyConfig = 'richText'
): { __html: string } {
  return { __html: sanitizeHtml(html, preset) }
}
