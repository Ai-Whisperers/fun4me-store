import { pgTable, text, timestamp, uuid, boolean, jsonb, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const tenants = pgTable(
  'tenants',
  {
    id: text('id').primaryKey().notNull(),
    name: text('name').notNull(),
    legalName: text('legal_name'),
    phone: text(),
    whatsapp: text(),
    email: text(),
    address: text(),
    city: text(),
    country: text().default('Paraguay'),
    ruc: text(),
    logoUrl: text('logo_url'),
    websiteUrl: text('website_url'),
    settings: jsonb().default({}),
    businessHours: jsonb('business_hours').default({}),
    featuresEnabled: text('features_enabled').array().default(['core']),
    plan: text().default('free'),
    planExpiresAt: timestamp('plan_expires_at', { withTimezone: true, mode: 'string' }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'tenants_plan_check',
      sql`plan = ANY (ARRAY['free'::text, 'starter'::text, 'professional'::text, 'enterprise'::text])`
    ),
  ]
)

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().notNull(),
    tenantId: text('tenant_id').references(() => tenants.id),
    fullName: text('full_name'),
    email: text(),
    phone: text(),
    secondaryPhone: text('secondary_phone'),
    avatarUrl: text('avatar_url'),
    role: text().default('owner').notNull(),
    clientCode: text('client_code'),
    address: text(),
    city: text(),
    documentType: text('document_type'),
    documentNumber: text('document_number'),
    preferredContact: text('preferred_contact').default('phone'),
    notes: text(),
    signatureUrl: text('signature_url'),
    licenseNumber: text('license_number'),
    specializations: text().array(),
    bio: text(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
    deletedBy: uuid('deleted_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      'profiles_role_check',
      sql`role = ANY (ARRAY['owner'::text, 'vet'::text, 'admin'::text])`
    ),
  ]
)

export const systemConfigs = pgTable('vete_system_configs', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  tenantId: text('tenant_id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  description: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})
