/**
 * Pet-related validation schemas
 */

import { z } from 'zod'
import { uuidSchema, optionalString, requiredString, enumSchema } from './common'

/**
 * Pet species options
 */
export const PET_SPECIES = [
  'dog',
  'cat',
  'bird',
  'rabbit',
  'hamster',
  'fish',
  'reptile',
  'other',
] as const
export type PetSpecies = (typeof PET_SPECIES)[number]

/**
 * Pet gender options
 */
export const PET_GENDERS = ['male', 'female', 'unknown'] as const
export type PetGender = (typeof PET_GENDERS)[number]

/**
 * Schema for creating a new pet
 */
export const createPetSchema = z.object({
  name: requiredString('Nombre', 50),
  species: enumSchema(PET_SPECIES, 'Especie'),
  breed: optionalString(100),
  gender: enumSchema(PET_GENDERS, 'Género').optional(),
  birth_date: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val).toISOString() : undefined)),
  weight: z.coerce
    .number()
    .min(0, 'El peso debe ser positivo')
    .max(500, 'Peso inválido')
    .optional()
    .nullable(),
  microchip_id: optionalString(50),
  color: optionalString(50),
  notes: optionalString(1000),
  is_neutered: z.coerce.boolean().optional(),
  // Photo is handled separately via file upload
})

export type CreatePetInput = z.infer<typeof createPetSchema>

/**
 * Schema for updating a pet
 */
export const updatePetSchema = createPetSchema.partial().extend({
  id: uuidSchema,
})

export type UpdatePetInput = z.infer<typeof updatePetSchema>

/**
 * Schema for API pet update (PATCH /api/pets/[id])
 * Maps form field names - service layer handles DB column mapping
 */
export const apiUpdatePetSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  species: enumSchema(PET_SPECIES, 'Especie').optional(),
  breed: z.string().max(100).optional().nullable(),
  weight_kg: z.number().min(0).max(500).optional().nullable(),
  microchip_id: z.string().max(50).optional().nullable(),
  diet_category: z.string().max(50).optional().nullable(),
  diet_notes: z.string().max(500).optional().nullable(),
  sex: enumSchema(PET_GENDERS, 'Sexo').optional(),
  is_neutered: z.boolean().optional(),
  color: z.string().max(50).optional().nullable(),
  temperament: z.string().max(100).optional().nullable(),
  allergies: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  existing_conditions: z.string().max(500).optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
}).strict()

export type ApiUpdatePetInput = z.infer<typeof apiUpdatePetSchema>

/**
 * Schema for pet query parameters
 */
export const petQuerySchema = z.object({
  species: enumSchema(PET_SPECIES, 'Especie').optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PetQueryParams = z.infer<typeof petQuerySchema>

/**
 * Schema for deleting a pet (soft delete confirmation)
 */
export const deletePetSchema = z.object({
  id: uuidSchema,
  confirm: z.literal(true, {
    message: 'Debe confirmar la eliminación',
  }),
})
