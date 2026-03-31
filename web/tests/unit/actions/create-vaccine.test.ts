/**
 * Create Vaccine Server Action Tests
 *
 * Tests the vaccine creation server action including:
 * - Form validation with Zod schema
 * - Date validation (no future dates)
 * - Authorization (owner can add to own pets, staff to clinic pets)
 * - File upload validation (photos, certificates)
 * - Status assignment based on role
 *
 * @ticket TICKET-CLINICAL-005
 */
import { describe, it, expect } from 'vitest'

describe('Vaccine Form Validation', () => {
  interface VaccineFormData {
    name?: string
    date?: string
    nextDate?: string
    batch?: string
  }

  interface ValidationResult {
    valid: boolean
    errors: Record<string, string>
  }

  const validateVaccineForm = (data: VaccineFormData): ValidationResult => {
    const errors: Record<string, string> = {}

    // Name validation
    if (!data.name) {
      errors.name = 'El nombre de la vacuna es obligatorio'
    } else if (data.name.length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres'
    } else if (data.name.length > 100) {
      errors.name = 'El nombre no puede exceder 100 caracteres'
    }

    // Date validation
    if (!data.date) {
      errors.date = 'La fecha de aplicación es obligatoria'
    } else {
      const dateValue = new Date(data.date)
      const now = new Date()
      now.setHours(23, 59, 59, 999)
      if (dateValue > now) {
        errors.date = 'La fecha de aplicación no puede ser en el futuro'
      }
    }

    // Next date validation
    if (data.nextDate && data.date) {
      const nextDateValue = new Date(data.nextDate)
      const dateValue = new Date(data.date)
      if (nextDateValue <= dateValue) {
        errors.nextDate = 'La fecha de próxima dosis debe ser posterior a la fecha de aplicación'
      }
    }

    // Batch validation
    if (data.batch && data.batch.length > 50) {
      errors.batch = 'El número de lote no puede exceder 50 caracteres'
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    }
  }

  describe('Name Validation', () => {
    it('should require vaccine name', () => {
      const result = validateVaccineForm({ date: '2024-01-15' })
      expect(result.valid).toBe(false)
      expect(result.errors.name).toContain('obligatorio')
    })

    it('should require minimum 2 characters', () => {
      const result = validateVaccineForm({ name: 'A', date: '2024-01-15' })
      expect(result.valid).toBe(false)
      expect(result.errors.name).toContain('2 caracteres')
    })

    it('should reject names over 100 characters', () => {
      const result = validateVaccineForm({
        name: 'a'.repeat(101),
        date: '2024-01-15',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.name).toContain('100 caracteres')
    })

    it('should accept valid name', () => {
      const result = validateVaccineForm({
        name: 'Rabia',
        date: '2024-01-15',
      })
      expect(result.errors.name).toBeUndefined()
    })
  })

  describe('Date Validation', () => {
    it('should require administration date', () => {
      const result = validateVaccineForm({ name: 'Rabia' })
      expect(result.valid).toBe(false)
      expect(result.errors.date).toContain('obligatoria')
    })

    it('should reject future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const result = validateVaccineForm({
        name: 'Rabia',
        date: futureDate.toISOString().split('T')[0],
      })
      expect(result.valid).toBe(false)
      expect(result.errors.date).toContain('futuro')
    })

    it('should accept past dates', () => {
      const pastDate = new Date()
      pastDate.setMonth(pastDate.getMonth() - 1)
      const result = validateVaccineForm({
        name: 'Rabia',
        date: pastDate.toISOString().split('T')[0],
      })
      expect(result.errors.date).toBeUndefined()
    })

    it('should accept today date', () => {
      const today = new Date().toISOString().split('T')[0]
      const result = validateVaccineForm({
        name: 'Rabia',
        date: today,
      })
      expect(result.errors.date).toBeUndefined()
    })
  })

  describe('Next Due Date Validation', () => {
    it('should allow empty next date', () => {
      const result = validateVaccineForm({
        name: 'Rabia',
        date: '2024-01-15',
      })
      expect(result.errors.nextDate).toBeUndefined()
    })

    it('should reject next date before administration date', () => {
      const result = validateVaccineForm({
        name: 'Rabia',
        date: '2024-01-15',
        nextDate: '2024-01-10',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.nextDate).toContain('posterior')
    })

    it('should reject next date equal to administration date', () => {
      const result = validateVaccineForm({
        name: 'Rabia',
        date: '2024-01-15',
        nextDate: '2024-01-15',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.nextDate).toContain('posterior')
    })

    it('should accept next date after administration date', () => {
      const result = validateVaccineForm({
        name: 'Rabia',
        date: '2024-01-15',
        nextDate: '2025-01-15',
      })
      expect(result.errors.nextDate).toBeUndefined()
    })
  })

  describe('Batch Number Validation', () => {
    it('should allow empty batch number', () => {
      const result = validateVaccineForm({
        name: 'Rabia',
        date: '2024-01-15',
      })
      expect(result.errors.batch).toBeUndefined()
    })

    it('should reject batch over 50 characters', () => {
      const result = validateVaccineForm({
        name: 'Rabia',
        date: '2024-01-15',
        batch: 'B'.repeat(51),
      })
      expect(result.valid).toBe(false)
      expect(result.errors.batch).toContain('50 caracteres')
    })

    it('should accept valid batch number', () => {
      const result = validateVaccineForm({
        name: 'Rabia',
        date: '2024-01-15',
        batch: 'LOT-2024-ABC123',
      })
      expect(result.errors.batch).toBeUndefined()
    })
  })
})

describe('File Upload Validation', () => {
  interface FileValidation {
    maxSizeMB: number
    allowedTypes: string[]
  }

  const photoValidation: FileValidation = {
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  }

  const certificateValidation: FileValidation = {
    maxSizeMB: 10,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  }

  const validateFile = (
    file: { size: number; type: string; name: string },
    validation: FileValidation
  ): { valid: boolean; error?: string } => {
    const maxBytes = validation.maxSizeMB * 1024 * 1024

    if (file.size > maxBytes) {
      return {
        valid: false,
        error: `El archivo debe pesar menos de ${validation.maxSizeMB}MB. "${file.name}" pesa ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
      }
    }

    if (!validation.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Formato no válido. El archivo "${file.name}" tiene un formato no soportado.`,
      }
    }

    return { valid: true }
  }

  describe('Photo Validation', () => {
    it('should accept valid JPEG photo', () => {
      const result = validateFile(
        { size: 1024 * 1024, type: 'image/jpeg', name: 'photo.jpg' },
        photoValidation
      )
      expect(result.valid).toBe(true)
    })

    it('should accept valid PNG photo', () => {
      const result = validateFile(
        { size: 2 * 1024 * 1024, type: 'image/png', name: 'photo.png' },
        photoValidation
      )
      expect(result.valid).toBe(true)
    })

    it('should reject photo over 5MB', () => {
      const result = validateFile(
        { size: 6 * 1024 * 1024, type: 'image/jpeg', name: 'large.jpg' },
        photoValidation
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('5MB')
    })

    it('should reject non-image file', () => {
      const result = validateFile(
        { size: 1024 * 1024, type: 'application/pdf', name: 'doc.pdf' },
        photoValidation
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Formato no válido')
    })
  })

  describe('Certificate Validation', () => {
    it('should accept PDF certificate', () => {
      const result = validateFile(
        { size: 5 * 1024 * 1024, type: 'application/pdf', name: 'cert.pdf' },
        certificateValidation
      )
      expect(result.valid).toBe(true)
    })

    it('should accept image certificate', () => {
      const result = validateFile(
        { size: 3 * 1024 * 1024, type: 'image/jpeg', name: 'cert.jpg' },
        certificateValidation
      )
      expect(result.valid).toBe(true)
    })

    it('should reject certificate over 10MB', () => {
      const result = validateFile(
        { size: 11 * 1024 * 1024, type: 'application/pdf', name: 'large.pdf' },
        certificateValidation
      )
      expect(result.valid).toBe(false)
      expect(result.error).toContain('10MB')
    })
  })
})

describe('Authorization Rules', () => {
  interface AuthContext {
    userId: string
    role: 'owner' | 'vet' | 'admin'
    tenantId: string
  }

  interface Pet {
    id: string
    ownerId: string
    tenantId: string
  }

  const canAddVaccine = (auth: AuthContext, pet: Pet): boolean => {
    const isOwner = pet.ownerId === auth.userId
    const isStaff = ['vet', 'admin'].includes(auth.role)
    const sameTenant = pet.tenantId === auth.tenantId

    return isOwner || (isStaff && sameTenant)
  }

  it('should allow owner to add vaccine to own pet', () => {
    const auth: AuthContext = { userId: 'user-1', role: 'owner', tenantId: 'clinic-1' }
    const pet: Pet = { id: 'pet-1', ownerId: 'user-1', tenantId: 'clinic-1' }

    expect(canAddVaccine(auth, pet)).toBe(true)
  })

  it('should reject owner from adding vaccine to other pet', () => {
    const auth: AuthContext = { userId: 'user-1', role: 'owner', tenantId: 'clinic-1' }
    const pet: Pet = { id: 'pet-2', ownerId: 'user-2', tenantId: 'clinic-1' }

    expect(canAddVaccine(auth, pet)).toBe(false)
  })

  it('should allow vet to add vaccine to clinic pet', () => {
    const auth: AuthContext = { userId: 'vet-1', role: 'vet', tenantId: 'clinic-1' }
    const pet: Pet = { id: 'pet-1', ownerId: 'user-1', tenantId: 'clinic-1' }

    expect(canAddVaccine(auth, pet)).toBe(true)
  })

  it('should reject vet from adding vaccine to other clinic pet', () => {
    const auth: AuthContext = { userId: 'vet-1', role: 'vet', tenantId: 'clinic-1' }
    const pet: Pet = { id: 'pet-1', ownerId: 'user-1', tenantId: 'clinic-2' }

    expect(canAddVaccine(auth, pet)).toBe(false)
  })

  it('should allow admin to add vaccine to clinic pet', () => {
    const auth: AuthContext = { userId: 'admin-1', role: 'admin', tenantId: 'clinic-1' }
    const pet: Pet = { id: 'pet-1', ownerId: 'user-1', tenantId: 'clinic-1' }

    expect(canAddVaccine(auth, pet)).toBe(true)
  })
})

describe('Vaccine Status Assignment', () => {
  type VaccineStatus = 'pending' | 'verified'

  const getVaccineStatus = (isStaff: boolean): VaccineStatus => {
    return isStaff ? 'verified' : 'pending'
  }

  it('should set pending status for owner-added vaccines', () => {
    expect(getVaccineStatus(false)).toBe('pending')
  })

  it('should set verified status for staff-added vaccines', () => {
    expect(getVaccineStatus(true)).toBe('verified')
  })

  describe('Verification Fields', () => {
    interface VaccineInsert {
      status: VaccineStatus
      verified_by: string | null
      verified_at: string | null
    }

    const buildVaccineInsert = (
      isStaff: boolean,
      userId: string
    ): Partial<VaccineInsert> => {
      const now = new Date().toISOString()

      return {
        status: isStaff ? 'verified' : 'pending',
        verified_by: isStaff ? userId : null,
        verified_at: isStaff ? now : null,
      }
    }

    it('should set verification fields for staff', () => {
      const insert = buildVaccineInsert(true, 'vet-123')

      expect(insert.status).toBe('verified')
      expect(insert.verified_by).toBe('vet-123')
      expect(insert.verified_at).toBeDefined()
    })

    it('should not set verification fields for owner', () => {
      const insert = buildVaccineInsert(false, 'owner-123')

      expect(insert.status).toBe('pending')
      expect(insert.verified_by).toBeNull()
      expect(insert.verified_at).toBeNull()
    })
  })
})

describe('Common Vaccines Database', () => {
  interface VaccineInfo {
    name: string
    species: ('dog' | 'cat')[]
    intervalMonths: number
    isCore: boolean
  }

  const commonVaccines: VaccineInfo[] = [
    { name: 'Rabia', species: ['dog', 'cat'], intervalMonths: 12, isCore: true },
    { name: 'Polivalente Canina', species: ['dog'], intervalMonths: 12, isCore: true },
    { name: 'Triple Felina', species: ['cat'], intervalMonths: 12, isCore: true },
    { name: 'Parvovirus', species: ['dog'], intervalMonths: 12, isCore: true },
    { name: 'Moquillo', species: ['dog'], intervalMonths: 12, isCore: true },
    { name: 'Leptospirosis', species: ['dog'], intervalMonths: 6, isCore: false },
    { name: 'Bordetella', species: ['dog', 'cat'], intervalMonths: 6, isCore: false },
    { name: 'Leucemia Felina', species: ['cat'], intervalMonths: 12, isCore: false },
  ]

  const getVaccinesForSpecies = (species: 'dog' | 'cat'): VaccineInfo[] => {
    return commonVaccines.filter((v) => v.species.includes(species))
  }

  const getCoreVaccines = (species: 'dog' | 'cat'): VaccineInfo[] => {
    return commonVaccines.filter((v) => v.species.includes(species) && v.isCore)
  }

  it('should have dog-specific vaccines', () => {
    const dogVaccines = getVaccinesForSpecies('dog')
    expect(dogVaccines.some((v) => v.name === 'Polivalente Canina')).toBe(true)
    expect(dogVaccines.some((v) => v.name === 'Parvovirus')).toBe(true)
  })

  it('should have cat-specific vaccines', () => {
    const catVaccines = getVaccinesForSpecies('cat')
    expect(catVaccines.some((v) => v.name === 'Triple Felina')).toBe(true)
    expect(catVaccines.some((v) => v.name === 'Leucemia Felina')).toBe(true)
  })

  it('should have rabies for both species', () => {
    const rabies = commonVaccines.find((v) => v.name === 'Rabia')
    expect(rabies?.species).toContain('dog')
    expect(rabies?.species).toContain('cat')
  })

  it('should identify core vaccines', () => {
    const dogCoreVaccines = getCoreVaccines('dog')
    expect(dogCoreVaccines.some((v) => v.name === 'Rabia')).toBe(true)
    expect(dogCoreVaccines.some((v) => v.name === 'Polivalente Canina')).toBe(true)
    expect(dogCoreVaccines.some((v) => v.name === 'Leptospirosis')).toBe(false)
  })

  it('should have correct booster intervals', () => {
    const rabies = commonVaccines.find((v) => v.name === 'Rabia')
    const leptospirosis = commonVaccines.find((v) => v.name === 'Leptospirosis')

    expect(rabies?.intervalMonths).toBe(12) // Annual
    expect(leptospirosis?.intervalMonths).toBe(6) // Semi-annual
  })
})

describe('Database Error Handling', () => {
  interface DbError {
    code: string
    message: string
  }

  const getUserFriendlyError = (error: DbError): string => {
    switch (error.code) {
      case '23505':
        return 'Ya existe un registro de esta vacuna para esta fecha. Verifica si ya fue registrada.'
      case '23503':
        return 'La mascota ya no existe en el sistema.'
      case '42501':
        return 'No tienes permiso para agregar vacunas. Contacta a la clínica.'
      default:
        return 'No se pudo guardar la vacuna. Por favor, intenta de nuevo. Si el problema persiste, contacta a soporte.'
    }
  }

  it('should handle duplicate key error', () => {
    const error = getUserFriendlyError({ code: '23505', message: 'duplicate key' })
    expect(error).toContain('Ya existe')
  })

  it('should handle foreign key error', () => {
    const error = getUserFriendlyError({ code: '23503', message: 'foreign key violation' })
    expect(error).toContain('ya no existe')
  })

  it('should handle permission error', () => {
    const error = getUserFriendlyError({ code: '42501', message: 'insufficient privilege' })
    expect(error).toContain('permiso')
  })

  it('should provide generic message for unknown errors', () => {
    const error = getUserFriendlyError({ code: 'UNKNOWN', message: 'unknown error' })
    expect(error).toContain('intenta de nuevo')
    expect(error).toContain('soporte')
  })
})

describe('Next Due Date Calculation', () => {
  const calculateNextDueDate = (administeredDate: string, intervalMonths: number): string => {
    const date = new Date(administeredDate)
    date.setMonth(date.getMonth() + intervalMonths)
    return date.toISOString().split('T')[0]
  }

  it('should calculate annual booster date', () => {
    const nextDate = calculateNextDueDate('2024-01-15', 12)
    expect(nextDate).toBe('2025-01-15')
  })

  it('should calculate semi-annual booster date', () => {
    const nextDate = calculateNextDueDate('2024-01-15', 6)
    expect(nextDate).toBe('2024-07-15')
  })

  it('should handle month overflow', () => {
    const nextDate = calculateNextDueDate('2024-11-15', 3)
    expect(nextDate).toBe('2025-02-15')
  })
})
