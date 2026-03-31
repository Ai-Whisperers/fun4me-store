import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  fullName: text('full_name'),
  email: text('email'),
  phone: text('phone'),
  secondaryPhone: text('secondary_phone'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('owner'),
  clientCode: text('client_code'),
  address: text('address'),
  city: text('city'),
  documentType: text('document_type'),
  documentNumber: text('document_number'),
  preferredContact: text('preferred_contact').default('phone'),
  notes: text('notes'),
  signatureUrl: text('signature_url'),
  licenseNumber: text('license_number'),
  specializations: text('specializations').array(),
  bio: text('bio'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references((): any => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
