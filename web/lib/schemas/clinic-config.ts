/**
 * Zod Schemas for JSON-CMS Validation
 * 
 * Validates clinic configuration files at load time to catch typos and
 * schema violations before they cause runtime errors.
 * 
 * Usage:
 *   import { configSchema, themeSchema } from '@/lib/schemas/clinic-config';
 *   const config = configSchema.parse(rawJson);
 */

import { z } from 'zod';

// =============================================================================
// THEME SCHEMA
// =============================================================================

/**
 * Color scale schema (50-950)
 */
const colorScaleSchema = z.object({
  main: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  light: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  dark: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  contrast: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '50': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '100': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '200': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '300': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '400': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '500': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '600': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '700': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '800': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '900': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  '950': z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  rgb: z.string().regex(/^\d+,\s*\d+,\s*\d+$/, 'Must be RGB format: "r, g, b"'),
});

/**
 * Status color schema
 */
const statusColorSchema = z.object({
  main: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  light: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  dark: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  border: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

/**
 * Theme JSON schema
 */
export const themeSchema = z.object({
  colors: z.object({
    primary: colorScaleSchema,
    secondary: colorScaleSchema,
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.object({
      default: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      paper: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      subtle: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      dark: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      hero: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      surface: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      surfaceElevated: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      surfaceOverlay: z.string().regex(/^rgba?\(.*\)$/),
    }),
    text: z.object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      invert: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      link: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      linkHover: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      disabled: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    }),
    border: z.object({
      light: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      default: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      dark: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      focus: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    }),
    status: z.object({
      success: statusColorSchema,
      warning: statusColorSchema,
      error: statusColorSchema,
      info: statusColorSchema,
    }),
    neutral: z.record(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
    interactive: z.record(z.string()),
    input: z.record(z.string()),
    chart: z.record(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
    accents: z.record(z.string().regex(/^#[0-9A-Fa-f]{6}$/)),
  }),
  gradients: z.record(z.string()),
  fonts: z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
    mono: z.string().min(1),
  }),
  typography: z.record(z.object({
    size: z.string(),
    weight: z.string(),
    line_height: z.string(),
  })),
  ui: z.object({
    border_radius: z.string(),
    border_radius_sm: z.string(),
    border_radius_lg: z.string(),
    border_radius_xl: z.string(),
    border_radius_full: z.string(),
    shadow_sm: z.string(),
    shadow_md: z.string(),
    shadow_lg: z.string(),
    shadow_xl: z.string(),
    shadow_card: z.string(),
    shadow_button: z.string(),
    shadow_input: z.string(),
    shadow_dropdown: z.string(),
  }),
  spacing: z.record(z.string()),
  animations: z.record(z.string()),
});

export type ClinicTheme = z.infer<typeof themeSchema>;

// =============================================================================
// CONFIG SCHEMA
// =============================================================================

/**
 * Module settings schema
 */
const moduleSettingsSchema = z.object({
  toxic_checker: z.boolean(),
  age_calculator: z.boolean(),
  growth_charts: z.boolean(),
  vaccine_tracker: z.boolean(),
  qr_tags: z.boolean(),
  loyalty_program: z.boolean(),
  online_store: z.boolean(),
  booking: z.boolean(),
  telemedicine: z.boolean().optional(),
  services_page: z.boolean().optional(), // Whether to show services/pricing page (default true)
});

/**
 * Contact info schema
 */
const contactSchema = z.object({
  whatsapp_number: z.string().regex(/^\d+$/, 'Must be numeric'),
  phone_display: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  google_maps_id: z.string().optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
});

/**
 * Social links schema
 */
const socialSchema = z.object({
  facebook: z.string().url().or(z.literal('')),
  instagram: z.string().url().or(z.literal('')),
  tiktok: z.string().url().or(z.literal('')).optional(),
  youtube: z.string().url().or(z.literal('')).optional(),
  twitter: z.string().url().or(z.literal('')).optional(),
  linkedin: z.string().url().or(z.literal('')).optional(),
});

/**
 * Hours schema
 */
const hoursSchema = z.object({
  weekdays: z.string(),
  saturday: z.string(),
  sunday: z.string(),
  holidays: z.string().optional(),
});

/**
 * Settings schema
 */
const settingsSchema = z.object({
  currency: z.string().length(3, 'Must be 3-letter currency code'),
  currency_symbol: z.string().min(1),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, 'Must be format: xx-YY'),
  timezone: z.string().min(1),
  emergency_24h: z.boolean(),
  accepts_insurance: z.boolean(),
  insurance_providers: z.array(z.string()).optional(),
  delivery_enabled: z.boolean().optional(),
  delivery_minimum: z.number().optional(),
  delivery_zones: z.array(z.string()).optional(),
  modules: moduleSettingsSchema,
  inventory_template_google_sheet_url: z.string().url().optional(),
});

/**
 * Branding assets schema
 */
const brandingSchema = z.object({
  logo_url: z.string().min(1),
  logo_dark_url: z.string().min(1).optional(),
  logo_width: z.number().positive(),
  logo_height: z.number().positive(),
  favicon_url: z.string().min(1),
  hero_image_url: z.string().min(1).optional(),
  og_image_url: z.string().min(1).optional(),
  apple_touch_icon: z.string().min(1).optional(),
});

/**
 * UI labels schema (simplified - validates structure exists)
 */
const uiLabelsSchema = z.object({
  nav: z.record(z.string()),
  footer: z.record(z.string()),
  home: z.record(z.any()), // Allow any structure for flexibility
  services: z.record(z.any()),
  about: z.record(z.any()),
  portal: z.record(z.any()),
  store: z.record(z.any()),
  cart: z.record(z.any()),
  checkout: z.record(z.any()),
  booking: z.record(z.any()),
  common: z.record(z.any()),
  auth: z.record(z.any()),
  tools: z.record(z.any()).optional(),
  errors: z.record(z.any()),
});

/**
 * Complete config schema
 */
export const configSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1),
  tagline: z.string().min(1).optional(),
  contact: contactSchema,
  social: socialSchema,
  hours: hoursSchema,
  settings: settingsSchema,
  branding: brandingSchema,
  ui_labels: uiLabelsSchema,
}).strict(); // Prevent unknown keys

export type ClinicConfig = z.infer<typeof configSchema>;

// =============================================================================
// HOME DATA SCHEMA (Simplified)
// =============================================================================

export const homeDataSchema = z.object({
  hero: z.object({
    title: z.string(),
    subtitle: z.string(),
    cta_primary: z.string().optional(),
    cta_secondary: z.string().optional(),
  }).passthrough(), // Allow additional fields
  features: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })).optional(),
  stats: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).optional(),
}).passthrough(); // Allow additional top-level fields

// =============================================================================
// SERVICES DATA SCHEMA (Simplified)
// =============================================================================

export const servicesDataSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
  })),
  services: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().optional(),
    price: z.number().or(z.string()).optional(),
  })),
}).passthrough();

// =============================================================================
// ABOUT DATA SCHEMA (Simplified)
// =============================================================================

export const aboutDataSchema = z.object({
  intro: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  values: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).optional(),
  team: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })).optional(),
}).passthrough();

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates a clinic config file
 * @throws {ZodError} with detailed error messages if invalid
 */
export function validateConfig(data: unknown): ClinicConfig {
  try {
    return configSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Config validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw error;
  }
}

/**
 * Validates a clinic theme file
 * @throws {ZodError} with detailed error messages if invalid
 */
export function validateTheme(data: unknown): ClinicTheme {
  try {
    return themeSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Theme validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw error;
  }
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidateConfig(data: unknown): { success: true; data: ClinicConfig } | { success: false; errors: z.ZodError } {
  const result = configSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Safe theme validation
 */
export function safeValidateTheme(data: unknown): { success: true; data: ClinicTheme } | { success: false; errors: z.ZodError } {
  const result = themeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
