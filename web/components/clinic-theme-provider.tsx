'use client'

import type {
  ClinicTheme,
  StatusColorSet,
  NeutralColors,
} from '@/lib/types/clinic-config'
import { useEffect } from 'react'

/**
 * Injects clinic-specific CSS variables from theme.json into the document root.
 * This allows per-clinic theming while globals.css provides sensible defaults.
 */
export function ClinicThemeProvider({ theme }: { theme: ClinicTheme }): null {
  useEffect(() => {
    const root = document.documentElement

    // Safely set a CSS property if value exists
    const setProp = (name: string, value: string | undefined): void => {
      if (value) root.style.setProperty(name, value)
    }

    // Helper to convert hex to RGB for opacity variants
    const hexToRgb = (hex: string): string | null => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : null
    }

    // ==========================================================================
    // 1. PRIMARY COLOR (with full scale)
    // ==========================================================================
    const primary = theme.colors.primary
    setProp('--primary', primary.main)
    setProp('--primary-light', primary.light)
    setProp('--primary-dark', primary.dark)
    setProp('--primary-contrast', primary.contrast)

    // Primary scale (50-950) if provided
    if (primary['50']) setProp('--primary-50', primary['50'])
    if (primary['100']) setProp('--primary-100', primary['100'])
    if (primary['200']) setProp('--primary-200', primary['200'])
    if (primary['300']) setProp('--primary-300', primary['300'])
    if (primary['400']) setProp('--primary-400', primary['400'])
    if (primary['500']) setProp('--primary-500', primary['500'])
    if (primary['600']) setProp('--primary-600', primary['600'])
    if (primary['700']) setProp('--primary-700', primary['700'])
    if (primary['800']) setProp('--primary-800', primary['800'])
    if (primary['900']) setProp('--primary-900', primary['900'])
    if (primary['950']) setProp('--primary-950', primary['950'])

    // RGB for opacity variants
    const primaryRgb = primary.rgb || hexToRgb(primary.main)
    if (primaryRgb) setProp('--primary-rgb', primaryRgb)

    // ==========================================================================
    // 2. SECONDARY COLOR (with full scale)
    // ==========================================================================
    const secondary = theme.colors.secondary
    setProp('--secondary', secondary.main)
    setProp('--secondary-light', secondary.light)
    setProp('--secondary-dark', secondary.dark)
    setProp('--secondary-contrast', secondary.contrast)

    // Secondary scale (50-950) if provided
    if (secondary['50']) setProp('--secondary-50', secondary['50'])
    if (secondary['100']) setProp('--secondary-100', secondary['100'])
    if (secondary['200']) setProp('--secondary-200', secondary['200'])
    if (secondary['300']) setProp('--secondary-300', secondary['300'])
    if (secondary['400']) setProp('--secondary-400', secondary['400'])
    if (secondary['500']) setProp('--secondary-500', secondary['500'])
    if (secondary['600']) setProp('--secondary-600', secondary['600'])
    if (secondary['700']) setProp('--secondary-700', secondary['700'])
    if (secondary['800']) setProp('--secondary-800', secondary['800'])
    if (secondary['900']) setProp('--secondary-900', secondary['900'])
    if (secondary['950']) setProp('--secondary-950', secondary['950'])

    // RGB for opacity variants
    const secondaryRgb = secondary.rgb || hexToRgb(secondary.main)
    if (secondaryRgb) setProp('--secondary-rgb', secondaryRgb)

    // Accent (backwards compatibility)
    if (theme.colors.accent) setProp('--accent', theme.colors.accent)

    // ==========================================================================
    // 3. NEUTRAL PALETTE
    // ==========================================================================
    const neutral = theme.colors.neutral
    if (neutral) {
      const keys: (keyof NeutralColors)[] = [
        '50',
        '100',
        '200',
        '300',
        '400',
        '500',
        '600',
        '700',
        '800',
        '900',
        '950',
      ]
      keys.forEach((key) => {
        if (neutral[key]) setProp(`--neutral-${key}`, neutral[key])
      })
    }

    // ==========================================================================
    // 4. BACKGROUND COLORS
    // ==========================================================================
    const bg = theme.colors.background
    setProp('--bg-default', bg.default)
    setProp('--bg-paper', bg.paper)
    setProp('--bg-subtle', bg.subtle)
    setProp('--bg-dark', bg.dark)
    if (bg.hero) setProp('--bg-hero', bg.hero)
    if (bg.surface) setProp('--bg-surface', bg.surface)
    if (bg.surfaceElevated) setProp('--bg-surface-elevated', bg.surfaceElevated)
    if (bg.surfaceOverlay) setProp('--bg-surface-overlay', bg.surfaceOverlay)

    // ==========================================================================
    // 5. TEXT COLORS
    // ==========================================================================
    const text = theme.colors.text
    setProp('--text-primary', text.primary)
    setProp('--text-main', text.primary) // Alias
    setProp('--text-secondary', text.secondary)
    setProp('--text-muted', text.muted)
    setProp('--text-invert', text.invert)
    if (text.link) setProp('--text-link', text.link)
    if (text.linkHover) setProp('--text-link-hover', text.linkHover)
    if (text.disabled) setProp('--text-disabled', text.disabled)

    // ==========================================================================
    // 6. BORDER COLORS
    // ==========================================================================
    const border = theme.colors.border
    setProp('--border-light', border.light)
    setProp('--border-default', border.default)
    setProp('--border-color', border.default) // Alias
    setProp('--border-dark', border.dark)
    if (border.focus) setProp('--border-focus', border.focus)

    // ==========================================================================
    // 7. STATUS/SEMANTIC COLORS
    // ==========================================================================
    const status = theme.colors.status

    // Helper to set status colors (handles both string and object formats)
    const setStatusColor = (name: string, color: string | StatusColorSet): void => {
      if (typeof color === 'string') {
        setProp(`--${name}`, color)
        setProp(`--status-${name}`, color)
        // Auto-generate variants from main color
        const rgb = hexToRgb(color)
        if (rgb) {
          setProp(`--${name}-bg`, `rgba(${rgb}, 0.1)`)
          setProp(`--status-${name}-bg`, `rgba(${rgb}, 0.1)`)
        }
      } else {
        setProp(`--${name}`, color.main)
        setProp(`--status-${name}`, color.main)
        if (color.light) setProp(`--${name}-light`, color.light)
        if (color.dark) setProp(`--${name}-dark`, color.dark)
        if (color.bg) {
          setProp(`--${name}-bg`, color.bg)
          setProp(`--status-${name}-bg`, color.bg)
        }
        if (color.border) setProp(`--${name}-border`, color.border)
      }
    }

    setStatusColor('success', status.success)
    setStatusColor('warning', status.warning)
    setStatusColor('error', status.error)
    setStatusColor('info', status.info)

    // ==========================================================================
    // 8. INTERACTIVE STATE COLORS
    // ==========================================================================
    const interactive = theme.colors.interactive
    if (interactive) {
      if (interactive.hover) setProp('--hover-bg', interactive.hover)
      if (interactive.active) setProp('--active-bg', interactive.active)
      if (interactive.focus) setProp('--focus-bg', interactive.focus)
      if (interactive.focusRing) setProp('--focus-ring', interactive.focusRing)
      if (interactive.disabled) setProp('--disabled-bg', interactive.disabled)
      if (interactive.selected) setProp('--selected-bg', interactive.selected)
    }

    // ==========================================================================
    // 9. FORM INPUT COLORS
    // ==========================================================================
    const input = theme.colors.input
    if (input) {
      if (input.bg) setProp('--input-bg', input.bg)
      if (input.border) setProp('--input-border', input.border)
      if (input.borderHover) setProp('--input-border-hover', input.borderHover)
      if (input.borderFocus) setProp('--input-border-focus', input.borderFocus)
      if (input.placeholder) setProp('--input-placeholder', input.placeholder)
      if (input.ring) setProp('--input-ring', input.ring)
    }

    // ==========================================================================
    // 10. CHART COLORS
    // ==========================================================================
    const chart = theme.colors.chart
    if (chart) {
      const chartKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const
      chartKeys.forEach((key) => {
        if (chart[key]) setProp(`--chart-${key}`, chart[key])
      })
    }

    // ==========================================================================
    // 11. ACCENT COLORS
    // ==========================================================================
    const accents = theme.colors.accents
    if (accents) {
      const accentNames = [
        'teal',
        'purple',
        'pink',
        'orange',
        'cyan',
        'lime',
        'amber',
        'rose',
        'indigo',
        'emerald',
      ] as const
      accentNames.forEach((name) => {
        const accent = accents[name]
        if (!accent) return

        if (typeof accent === 'string') {
          setProp(`--accent-${name}`, accent)
        } else {
          setProp(`--accent-${name}`, accent.main)
          if (accent.light) setProp(`--accent-${name}-light`, accent.light)
          if (accent.dark) setProp(`--accent-${name}-dark`, accent.dark)
          if (accent.rgb) setProp(`--accent-${name}-rgb`, accent.rgb)
        }
      })
    }

    // ==========================================================================
    // 12. GRADIENTS
    // ==========================================================================
    const gradients = theme.gradients
    setProp('--gradient-hero', gradients.hero)
    setProp('--gradient-primary', gradients.primary)
    setProp('--gradient-accent', gradients.accent)
    if (gradients.dark) setProp('--gradient-dark', gradients.dark)
    if (gradients.card) setProp('--gradient-card', gradients.card)
    if (gradients.toRight) setProp('--gradient-to-right', gradients.toRight)
    if (gradients.toBottom) setProp('--gradient-to-bottom', gradients.toBottom)
    if (gradients.radial) setProp('--gradient-radial', gradients.radial)

    // ==========================================================================
    // 13. FONTS
    // ==========================================================================
    setProp('--font-heading', theme.fonts.heading)
    setProp('--font-body', theme.fonts.body)
    if (theme.fonts.mono) setProp('--font-mono', theme.fonts.mono)

    // ==========================================================================
    // 14. TYPOGRAPHY
    // ==========================================================================
    const typography = theme.typography
    if (typography) {
      const typoLevels = ['h1', 'h2', 'h3', 'h4', 'body', 'small'] as const
      typoLevels.forEach((level) => {
        const settings = typography[level]
        if (settings) {
          setProp(`--font-size-${level}`, settings.size)
          setProp(`--font-weight-${level}`, settings.weight)
          setProp(`--line-height-${level}`, settings.line_height)
        }
      })
    }

    // ==========================================================================
    // 15. UI (Radii & Shadows)
    // ==========================================================================
    const ui = theme.ui
    setProp('--radius', ui.border_radius)
    if (ui.border_radius_sm) setProp('--radius-sm', ui.border_radius_sm)
    if (ui.border_radius_lg) setProp('--radius-lg', ui.border_radius_lg)
    if (ui.border_radius_xl) setProp('--radius-xl', ui.border_radius_xl)
    if (ui.border_radius_full) setProp('--radius-full', ui.border_radius_full)

    if (ui.shadow_sm) setProp('--shadow-sm', ui.shadow_sm)
    if (ui.shadow_md) setProp('--shadow-md', ui.shadow_md)
    if (ui.shadow_lg) setProp('--shadow-lg', ui.shadow_lg)
    if (ui.shadow_xl) setProp('--shadow-xl', ui.shadow_xl)
    if (ui.shadow_card) setProp('--shadow-card', ui.shadow_card)
    if (ui.shadow_button) setProp('--shadow-button', ui.shadow_button)
    if (ui.shadow_input) setProp('--shadow-input', ui.shadow_input)
    if (ui.shadow_dropdown) setProp('--shadow-dropdown', ui.shadow_dropdown)

    // ==========================================================================
    // 16. SPACING
    // ==========================================================================
    const spacing = theme.spacing
    if (spacing) {
      if (spacing.section_padding) setProp('--section-padding', spacing.section_padding)
      if (spacing.container_max_width) setProp('--container-max-width', spacing.container_max_width)
      if (spacing.card_padding) setProp('--card-padding', spacing.card_padding)
      if (spacing.input_padding) setProp('--input-padding', spacing.input_padding)
    }

    // ==========================================================================
    // 17. ANIMATIONS
    // ==========================================================================
    const animations = theme.animations
    if (animations) {
      if (animations.transition_fast) setProp('--transition-fast', animations.transition_fast)
      if (animations.transition_normal) setProp('--transition-normal', animations.transition_normal)
      if (animations.transition_slow) setProp('--transition-slow', animations.transition_slow)
      if (animations.hover_scale) setProp('--hover-scale', animations.hover_scale)
      if (animations.hover_lift) setProp('--hover-lift', animations.hover_lift)
    }
  }, [theme])

  return null
}
