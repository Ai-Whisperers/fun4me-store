import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'

/**
 * Tenants table
 *
 * Tracks all veterinary clinics in the platform.
 * Supports pre-generation workflow where clinics are created before the owner claims them.
 *
 * Status flow:
 * 1. pregenerated -> Clinic auto-created from scraped data, not yet claimed
 * 2. claimed -> Owner has claimed and is in trial
 * 3. active -> Paid subscription active
 * 4. suspended -> Subscription lapsed
 */
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  country: text('country').default('Paraguay'),
  ruc: text('ruc'),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  settings: jsonb('settings').default({}),
  businessHours: jsonb('business_hours').default({}),
  featuresEnabled: text('features_enabled').array().default(['core']),
  plan: text('plan').default('free'),
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

  // Pre-generation fields
  /** Status: pregenerated | claimed | active | suspended */
  status: text('status').notNull().default('active'),
  /** Whether this tenant was auto-generated from scraped data */
  isPregenerated: boolean('is_pregenerated').notNull().default(false),
  /** When the clinic was claimed by an owner */
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  /** User ID who claimed the clinic */
  claimedBy: text('claimed_by'),
  /** Original scraped data (Google Maps, Instagram, etc) */
  scrapedData: jsonb('scraped_data'),
  /** Clinic type for template selection: general | emergency | specialist | grooming | rural */
  clinicType: text('clinic_type').default('general'),
  /** Zone/neighborhood for local targeting */
  zone: text('zone'),
  /** Google rating from scraping */
  googleRating: text('google_rating'),
  /** Instagram handle if available */
  instagramHandle: text('instagram_handle'),
})
