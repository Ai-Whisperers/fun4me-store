/**
 * Theme Types - Comprehensive Design System
 * Defines the complete theming structure for clinics
 */

// ============================================================================
// Color Types
// ============================================================================

/** Color scale from 50 (lightest) to 900 (darkest) plus RGB for opacity variants */
export interface ColorScale {
  main: string
  light: string
  dark: string
  contrast: string
  '50'?: string
  '100'?: string
  '200'?: string
  '300'?: string
  '400'?: string
  '500'?: string
  '600'?: string
  '700'?: string
  '800'?: string
  '900'?: string
  '950'?: string
  rgb?: string // e.g., "47, 82, 51" for rgba() usage
}

/** Status color with full semantic variants */
export interface StatusColorSet {
  main: string
  light?: string
  dark?: string
  bg?: string
  border?: string
}

/** Full status color palette */
export interface StatusColors {
  success: string | StatusColorSet
  warning: string | StatusColorSet
  error: string | StatusColorSet
  info: string | StatusColorSet
}

/** Background color variants */
export interface BackgroundColors {
  default: string
  paper: string
  subtle: string
  dark: string
  hero?: string
  surface?: string
  surfaceElevated?: string
  surfaceOverlay?: string
}

/** Text color variants */
export interface TextColors {
  primary: string
  secondary: string
  muted: string
  invert: string
  link?: string
  linkHover?: string
  disabled?: string
}

/** Border color variants */
export interface BorderColors {
  light: string
  default: string
  dark: string
  focus?: string
}

/** Interactive state colors */
export interface InteractiveColors {
  hover?: string
  active?: string
  focus?: string
  focusRing?: string
  disabled?: string
  selected?: string
}

/** Form input colors */
export interface InputColors {
  bg?: string
  border?: string
  borderHover?: string
  borderFocus?: string
  placeholder?: string
  ring?: string
}

/** Chart color palette (up to 12 colors) */
export interface ChartColors {
  '1'?: string
  '2'?: string
  '3'?: string
  '4'?: string
  '5'?: string
  '6'?: string
  '7'?: string
  '8'?: string
  '9'?: string
  '10'?: string
  '11'?: string
  '12'?: string
}

/** Named accent colors */
export interface AccentColors {
  teal?: ColorScale | string
  purple?: ColorScale | string
  pink?: ColorScale | string
  orange?: ColorScale | string
  cyan?: ColorScale | string
  lime?: ColorScale | string
  amber?: ColorScale | string
  rose?: ColorScale | string
  indigo?: ColorScale | string
  emerald?: ColorScale | string
}

/** Neutral/gray palette for UI */
export interface NeutralColors {
  '50'?: string
  '100'?: string
  '200'?: string
  '300'?: string
  '400'?: string
  '500'?: string
  '600'?: string
  '700'?: string
  '800'?: string
  '900'?: string
  '950'?: string
}

/** All theme colors */
export interface ThemeColors {
  // Core brand colors
  primary: ColorScale
  secondary: ColorScale
  accent?: string

  // Semantic colors
  background: BackgroundColors
  text: TextColors
  border: BorderColors
  status: StatusColors

  // Extended palettes (optional)
  neutral?: NeutralColors
  interactive?: InteractiveColors
  input?: InputColors
  chart?: ChartColors
  accents?: AccentColors
}

// ============================================================================
// Typography & Fonts
// ============================================================================

/** Font families */
export interface ThemeFonts {
  heading: string
  body: string
  mono?: string
}

/** Typography settings */
export interface TypographySettings {
  size: string
  weight: string
  line_height: string
}

export interface ThemeTypography {
  h1?: TypographySettings
  h2?: TypographySettings
  h3?: TypographySettings
  h4?: TypographySettings
  body?: TypographySettings
  small?: TypographySettings
}

// ============================================================================
// UI Settings
// ============================================================================

/** Gradient definitions */
export interface ThemeGradients {
  hero?: string
  primary?: string
  accent?: string
  dark?: string
  card?: string
  toRight?: string
  toBottom?: string
  radial?: string
  [key: string]: string | undefined
}

/** UI settings (shadows, radii, etc.) */
export interface ThemeUI {
  border_radius: string
  border_radius_sm?: string
  border_radius_lg?: string
  border_radius_xl?: string
  border_radius_full?: string
  shadow_sm?: string
  shadow_md?: string
  shadow_lg?: string
  shadow_xl?: string
  shadow_card?: string
  shadow_button?: string
  shadow_input?: string
  shadow_dropdown?: string
}

/** Spacing settings */
export interface ThemeSpacing {
  section_padding?: string
  container_max_width?: string
  card_padding?: string
  input_padding?: string
}

/** Animation/transition settings */
export interface ThemeAnimations {
  transition_fast?: string
  transition_normal?: string
  transition_slow?: string
  hover_scale?: string
  hover_lift?: string
}

// ============================================================================
// Complete Theme
// ============================================================================

/** Complete clinic theme */
export interface ClinicTheme {
  colors: ThemeColors
  gradients: ThemeGradients
  fonts: ThemeFonts
  typography?: ThemeTypography
  ui: ThemeUI
  spacing?: ThemeSpacing
  animations?: ThemeAnimations
}
