/**
 * Color Utilities for Theme Generation
 *
 * Generates full color scales (50-950) from a single hex color.
 * Used to create theme.json for new clinic signups.
 */

import type { ColorScale } from './types'

// ============================================================================
// Color Conversion Types
// ============================================================================

interface RGB {
  r: number
  g: number
  b: number
}

interface HSL {
  h: number
  s: number
  l: number
}

// ============================================================================
// Hex Parsing & Validation
// ============================================================================

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '')

  // Expand shorthand (e.g., "03F" -> "0033FF")
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex

  const num = parseInt(fullHex, 16)

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/**
 * Convert RGB to "r, g, b" string format
 */
export function rgbToString(rgb: RGB): string {
  return `${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}`
}

// ============================================================================
// HSL Conversions
// ============================================================================

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
  }
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360
  const s = hsl.s / 100
  const l = hsl.l / 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: r * 255,
    g: g * 255,
    b: b * 255,
  }
}

// ============================================================================
// Color Manipulation
// ============================================================================

/**
 * Adjust lightness of a color
 */
export function adjustLightness(hex: string, lightness: number): string {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb)
  hsl.l = Math.max(0, Math.min(100, lightness))
  return rgbToHex(hslToRgb(hsl))
}

/**
 * Adjust saturation of a color
 */
export function adjustSaturation(hex: string, saturationDelta: number): string {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb)
  hsl.s = Math.max(0, Math.min(100, hsl.s + saturationDelta))
  return rgbToHex(hslToRgb(hsl))
}

/**
 * Get relative luminance (for contrast calculation)
 */
function getRelativeLuminance(rgb: RGB): number {
  const srgb = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

/**
 * Determine contrast color (black or white)
 */
export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex)
  const luminance = getRelativeLuminance(rgb)
  return luminance > 0.179 ? '#000000' : '#FFFFFF'
}

// ============================================================================
// Color Scale Generation
// ============================================================================

/**
 * Lightness values for each step in the scale
 * Calibrated to match Tailwind's color scales
 */
const SCALE_LIGHTNESS: Record<string, number> = {
  '50': 97,
  '100': 94,
  '200': 86,
  '300': 74,
  '400': 60,
  '500': 48,
  '600': 40,
  '700': 32,
  '800': 24,
  '900': 18,
  '950': 10,
}

/**
 * Saturation adjustments for scale steps
 * Lighter colors are slightly desaturated, darker are slightly more saturated
 */
const SCALE_SATURATION: Record<string, number> = {
  '50': -30,
  '100': -20,
  '200': -10,
  '300': -5,
  '400': 0,
  '500': 0,
  '600': 5,
  '700': 5,
  '800': 5,
  '900': 5,
  '950': 5,
}

/**
 * Generate a full color scale from a base hex color
 */
export function generateColorScale(baseHex: string): ColorScale {
  const baseRgb = hexToRgb(baseHex)
  const baseHsl = rgbToHsl(baseRgb)

  // Generate scale steps
  const scale: Partial<ColorScale> = {}

  for (const [step, lightness] of Object.entries(SCALE_LIGHTNESS)) {
    const hsl: HSL = {
      h: baseHsl.h,
      s: Math.max(0, Math.min(100, baseHsl.s + (SCALE_SATURATION[step] || 0))),
      l: lightness,
    }
    scale[step as keyof ColorScale] = rgbToHex(hslToRgb(hsl))
  }

  // Main color is the 500 step
  scale.main = scale['500'] || baseHex

  // Light variant (400 step)
  scale.light = scale['400'] || baseHex

  // Dark variant (600 step)
  scale.dark = scale['600'] || baseHex

  // Contrast color
  scale.contrast = getContrastColor(scale.main || baseHex)

  // RGB string
  scale.rgb = rgbToString(baseRgb)

  return scale as ColorScale
}

/**
 * Generate color scale using the input color as the 500 value
 * This preserves the user's exact color choice as the main color
 */
export function generateColorScaleFromMain(mainHex: string): ColorScale {
  const mainRgb = hexToRgb(mainHex)
  const mainHsl = rgbToHsl(mainRgb)

  const scale: Partial<ColorScale> = {}

  // Calculate offsets based on the main color's lightness
  const baseLightness = mainHsl.l
  const targetBase = SCALE_LIGHTNESS['500'] // 48

  for (const [step, targetLightness] of Object.entries(SCALE_LIGHTNESS)) {
    // Calculate relative lightness
    const offset = targetLightness - targetBase
    let newLightness = baseLightness + offset

    // Clamp and adjust for better results at extremes
    if (step === '50' || step === '100') {
      newLightness = Math.max(newLightness, 90)
    }
    if (step === '900' || step === '950') {
      newLightness = Math.min(newLightness, 25)
    }

    newLightness = Math.max(0, Math.min(100, newLightness))

    const hsl: HSL = {
      h: mainHsl.h,
      s: Math.max(0, Math.min(100, mainHsl.s + (SCALE_SATURATION[step] || 0))),
      l: newLightness,
    }

    scale[step as keyof ColorScale] = rgbToHex(hslToRgb(hsl))
  }

  // Override 500 with exact user color
  scale['500'] = mainHex.toLowerCase()
  scale.main = mainHex.toLowerCase()

  // Light variant (400 step)
  scale.light = scale['400'] || mainHex

  // Dark variant (600 step)
  scale.dark = scale['600'] || mainHex

  // Contrast color based on the main color
  scale.contrast = getContrastColor(mainHex)

  // RGB string from the main color
  scale.rgb = rgbToString(mainRgb)

  return scale as ColorScale
}

// ============================================================================
// Theme Generation Helpers
// ============================================================================

/**
 * Generate interactive state colors from primary color
 */
export function generateInteractiveColors(primaryHex: string): Record<string, string> {
  const rgb = hexToRgb(primaryHex)
  const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`

  return {
    hover: `rgba(${rgbStr}, 0.04)`,
    active: `rgba(${rgbStr}, 0.08)`,
    focus: `rgba(${rgbStr}, 0.12)`,
    focusRing: `rgba(${rgbStr}, 0.2)`,
    disabled: '#F4F4F5',
    selected: `rgba(${rgbStr}, 0.08)`,
  }
}

/**
 * Generate input colors based on primary
 */
export function generateInputColors(primaryHex: string): Record<string, string> {
  const rgb = hexToRgb(primaryHex)
  const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`

  return {
    bg: '#FFFFFF',
    border: '#D4D4D8',
    borderHover: '#A1A1AA',
    borderFocus: primaryHex,
    placeholder: '#A1A1AA',
    ring: `rgba(${rgbStr}, 0.2)`,
  }
}

/**
 * Generate gradients based on primary color
 */
export function generateGradients(primaryScale: ColorScale): Record<string, string> {
  return {
    hero: `linear-gradient(135deg, ${primaryScale.main} 0%, ${primaryScale.dark} 100%)`,
    primary: `linear-gradient(135deg, ${primaryScale.light} 0%, ${primaryScale.main} 100%)`,
    accent: `linear-gradient(135deg, ${primaryScale['400']} 0%, ${primaryScale['600']} 100%)`,
    dark: 'linear-gradient(180deg, #18181B 0%, #27272A 100%)',
    card: 'linear-gradient(145deg, #FFFFFF 0%, #FAFAFA 100%)',
    toRight: `linear-gradient(to right, ${primaryScale.main}, ${primaryScale.light})`,
    toBottom: `linear-gradient(to bottom, ${primaryScale.main}, ${primaryScale.dark})`,
    radial: `radial-gradient(circle, ${primaryScale.light}, ${primaryScale.main})`,
  }
}

/**
 * Generate UI shadow colors using primary
 */
export function generateShadows(primaryHex: string): Record<string, string> {
  const rgb = hexToRgb(primaryHex)

  return {
    shadow_sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    shadow_md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    shadow_lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    shadow_xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    shadow_card: `0 4px 20px -2px rgb(${rgb.r} ${rgb.g} ${rgb.b} / 0.1)`,
    shadow_button: `0 4px 14px 0 rgb(${rgb.r} ${rgb.g} ${rgb.b} / 0.2)`,
    shadow_input: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
    shadow_dropdown: '0 10px 40px -5px rgb(0 0 0 / 0.15)',
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if a string is a valid hex color
 */
export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

/**
 * Ensure hex color is properly formatted
 */
export function normalizeHexColor(hex: string): string {
  let clean = hex.trim()

  // Add # if missing
  if (!clean.startsWith('#')) {
    clean = '#' + clean
  }

  // Expand shorthand
  if (clean.length === 4) {
    clean =
      '#' +
      clean[1] +
      clean[1] +
      clean[2] +
      clean[2] +
      clean[3] +
      clean[3]
  }

  return clean.toUpperCase()
}
