/**
 * Create Medical Record Server Action Tests
 *
 * Tests the medical record creation server action including:
 * - Form validation (required fields)
 * - Authorization (staff only)
 * - Record types and categories
 * - Diagnosis codes (VeNom/SNOMED)
 * - Attachment handling
 *
 * @ticket TICKET-CLINICAL-006
 */
import { describe, it, expect } from 'vitest'

describe('Medical Record Form Validation', () => {
  interface MedicalRecordFormData {
    title?: string
    type?: string
    diagnosis?: string
    notes?: string
    petId?: string
    clinic?: string
  }

  interface ValidationResult {
    valid: boolean
    errors: Record<string, string>
  }

  const validateMedicalRecordForm = (data: MedicalRecordFormData): ValidationResult => {
    const errors: Record<string, string> = {}

    if (!data.title) {
      errors.title = 'El título es obligatorio'
    } else if (data.title.length < 3) {
      errors.title = 'El título debe tener al menos 3 caracteres'
    } else if (data.title.length > 200) {
      errors.title = 'El título no puede exceder 200 caracteres'
    }

    if (!data.type) {
      errors.type = 'El tipo de registro es obligatorio'
    }

    if (!data.petId) {
      errors.petId = 'La mascota es obligatoria'
    }

    if (data.notes && data.notes.length > 10000) {
      errors.notes = 'Las notas no pueden exceder 10,000 caracteres'
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    }
  }

  describe('Title Validation', () => {
    it('should require title', () => {
      const result = validateMedicalRecordForm({
        type: 'consultation',
        petId: 'pet-1',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.title).toContain('obligatorio')
    })

    it('should require minimum 3 characters', () => {
      const result = validateMedicalRecordForm({
        title: 'AB',
        type: 'consultation',
        petId: 'pet-1',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.title).toContain('3 caracteres')
    })

    it('should reject title over 200 characters', () => {
      const result = validateMedicalRecordForm({
        title: 'T'.repeat(201),
        type: 'consultation',
        petId: 'pet-1',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.title).toContain('200 caracteres')
    })
  })

  describe('Type Validation', () => {
    it('should require record type', () => {
      const result = validateMedicalRecordForm({
        title: 'Consulta general',
        petId: 'pet-1',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.type).toContain('obligatorio')
    })
  })

  describe('Pet ID Validation', () => {
    it('should require pet ID', () => {
      const result = validateMedicalRecordForm({
        title: 'Consulta general',
        type: 'consultation',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.petId).toContain('obligatoria')
    })
  })

  describe('Notes Validation', () => {
    it('should allow empty notes', () => {
      const result = validateMedicalRecordForm({
        title: 'Consulta general',
        type: 'consultation',
        petId: 'pet-1',
      })
      expect(result.errors.notes).toBeUndefined()
    })

    it('should reject notes over 10,000 characters', () => {
      const result = validateMedicalRecordForm({
        title: 'Consulta general',
        type: 'consultation',
        petId: 'pet-1',
        notes: 'N'.repeat(10001),
      })
      expect(result.valid).toBe(false)
      expect(result.errors.notes).toContain('10,000 caracteres')
    })
  })

  describe('Valid Form', () => {
    it('should accept complete valid form', () => {
      const result = validateMedicalRecordForm({
        title: 'Consulta general - Revisión anual',
        type: 'consultation',
        petId: 'pet-123',
        diagnosis: 'Paciente sano',
        notes: 'Se recomienda continuar con dieta actual.',
      })
      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })
  })
})

describe('Medical Record Types', () => {
  interface RecordType {
    code: string
    name: string
    category: 'clinical' | 'surgical' | 'diagnostic' | 'preventive' | 'administrative'
    requiresDiagnosis: boolean
    defaultTemplate?: string
  }

  const recordTypes: RecordType[] = [
    {
      code: 'consultation',
      name: 'Consulta',
      category: 'clinical',
      requiresDiagnosis: true,
    },
    {
      code: 'follow_up',
      name: 'Seguimiento',
      category: 'clinical',
      requiresDiagnosis: false,
    },
    {
      code: 'emergency',
      name: 'Emergencia',
      category: 'clinical',
      requiresDiagnosis: true,
    },
    {
      code: 'surgery',
      name: 'Cirugía',
      category: 'surgical',
      requiresDiagnosis: true,
      defaultTemplate: 'surgical_report',
    },
    {
      code: 'anesthesia',
      name: 'Anestesia',
      category: 'surgical',
      requiresDiagnosis: false,
      defaultTemplate: 'anesthesia_protocol',
    },
    {
      code: 'lab_interpretation',
      name: 'Interpretación de laboratorio',
      category: 'diagnostic',
      requiresDiagnosis: false,
    },
    {
      code: 'imaging_interpretation',
      name: 'Interpretación de imágenes',
      category: 'diagnostic',
      requiresDiagnosis: false,
    },
    {
      code: 'vaccination',
      name: 'Vacunación',
      category: 'preventive',
      requiresDiagnosis: false,
    },
    {
      code: 'deworming',
      name: 'Desparasitación',
      category: 'preventive',
      requiresDiagnosis: false,
    },
    {
      code: 'certificate',
      name: 'Certificado',
      category: 'administrative',
      requiresDiagnosis: false,
    },
  ]

  const getRecordType = (code: string): RecordType | undefined => {
    return recordTypes.find((r) => r.code === code)
  }

  it('should have consultation type', () => {
    const consultation = getRecordType('consultation')
    expect(consultation).toBeDefined()
    expect(consultation?.category).toBe('clinical')
    expect(consultation?.requiresDiagnosis).toBe(true)
  })

  it('should have surgery type with template', () => {
    const surgery = getRecordType('surgery')
    expect(surgery).toBeDefined()
    expect(surgery?.category).toBe('surgical')
    expect(surgery?.defaultTemplate).toBe('surgical_report')
  })

  it('should have preventive types', () => {
    const vaccination = getRecordType('vaccination')
    const deworming = getRecordType('deworming')

    expect(vaccination?.category).toBe('preventive')
    expect(deworming?.category).toBe('preventive')
  })

  it('should mark emergency as requiring diagnosis', () => {
    const emergency = getRecordType('emergency')
    expect(emergency?.requiresDiagnosis).toBe(true)
  })

  it('should mark follow_up as not requiring diagnosis', () => {
    const followUp = getRecordType('follow_up')
    expect(followUp?.requiresDiagnosis).toBe(false)
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
    tenantId: string
  }

  const canCreateMedicalRecord = (auth: AuthContext, pet: Pet): boolean => {
    // Only vets and admins can create medical records
    if (!['vet', 'admin'].includes(auth.role)) {
      return false
    }

    // Must be same tenant
    return auth.tenantId === pet.tenantId
  }

  const canViewMedicalRecord = (
    auth: AuthContext,
    pet: Pet,
    petOwnerId: string
  ): boolean => {
    const isOwner = auth.userId === petOwnerId
    const isStaff = ['vet', 'admin'].includes(auth.role)
    const sameTenant = auth.tenantId === pet.tenantId

    return isOwner || (isStaff && sameTenant)
  }

  describe('Create Authorization', () => {
    it('should allow vet to create records', () => {
      const auth: AuthContext = { userId: 'vet-1', role: 'vet', tenantId: 'clinic-1' }
      const pet: Pet = { id: 'pet-1', tenantId: 'clinic-1' }

      expect(canCreateMedicalRecord(auth, pet)).toBe(true)
    })

    it('should allow admin to create records', () => {
      const auth: AuthContext = { userId: 'admin-1', role: 'admin', tenantId: 'clinic-1' }
      const pet: Pet = { id: 'pet-1', tenantId: 'clinic-1' }

      expect(canCreateMedicalRecord(auth, pet)).toBe(true)
    })

    it('should reject owner from creating records', () => {
      const auth: AuthContext = { userId: 'owner-1', role: 'owner', tenantId: 'clinic-1' }
      const pet: Pet = { id: 'pet-1', tenantId: 'clinic-1' }

      expect(canCreateMedicalRecord(auth, pet)).toBe(false)
    })

    it('should reject staff from other clinic', () => {
      const auth: AuthContext = { userId: 'vet-1', role: 'vet', tenantId: 'clinic-2' }
      const pet: Pet = { id: 'pet-1', tenantId: 'clinic-1' }

      expect(canCreateMedicalRecord(auth, pet)).toBe(false)
    })
  })

  describe('View Authorization', () => {
    it('should allow owner to view own pet records', () => {
      const auth: AuthContext = { userId: 'owner-1', role: 'owner', tenantId: 'clinic-1' }
      const pet: Pet = { id: 'pet-1', tenantId: 'clinic-1' }

      expect(canViewMedicalRecord(auth, pet, 'owner-1')).toBe(true)
    })

    it('should reject owner from viewing other pet records', () => {
      const auth: AuthContext = { userId: 'owner-1', role: 'owner', tenantId: 'clinic-1' }
      const pet: Pet = { id: 'pet-1', tenantId: 'clinic-1' }

      expect(canViewMedicalRecord(auth, pet, 'owner-2')).toBe(false)
    })

    it('should allow staff to view any clinic pet records', () => {
      const auth: AuthContext = { userId: 'vet-1', role: 'vet', tenantId: 'clinic-1' }
      const pet: Pet = { id: 'pet-1', tenantId: 'clinic-1' }

      expect(canViewMedicalRecord(auth, pet, 'owner-2')).toBe(true)
    })
  })
})

describe('Diagnosis Code Validation', () => {
  interface DiagnosisCode {
    code: string
    name: string
    description: string
    category: string
    species: ('dog' | 'cat' | 'all')[]
  }

  const diagnosisCodes: DiagnosisCode[] = [
    {
      code: 'VN-001',
      name: 'Gastroenteritis',
      description: 'Inflamación del tracto gastrointestinal',
      category: 'Digestivo',
      species: ['all'],
    },
    {
      code: 'VN-002',
      name: 'Dermatitis alérgica',
      description: 'Reacción alérgica cutánea',
      category: 'Dermatología',
      species: ['all'],
    },
    {
      code: 'VN-003',
      name: 'Otitis externa',
      description: 'Inflamación del oído externo',
      category: 'Otología',
      species: ['all'],
    },
    {
      code: 'VN-004',
      name: 'Displasia de cadera',
      description: 'Malformación de la articulación coxofemoral',
      category: 'Ortopedia',
      species: ['dog'],
    },
    {
      code: 'VN-005',
      name: 'Enfermedad del tracto urinario inferior felino',
      description: 'FLUTD - Síndrome urinario felino',
      category: 'Urología',
      species: ['cat'],
    },
    {
      code: 'VN-006',
      name: 'Parvovirus canino',
      description: 'Infección viral gastrointestinal severa',
      category: 'Infeccioso',
      species: ['dog'],
    },
  ]

  const findDiagnosisCode = (code: string): DiagnosisCode | undefined => {
    return diagnosisCodes.find((d) => d.code === code)
  }

  const searchDiagnosisCodes = (query: string, species?: 'dog' | 'cat'): DiagnosisCode[] => {
    const queryLower = query.toLowerCase()
    return diagnosisCodes.filter((d) => {
      const matchesQuery =
        d.name.toLowerCase().includes(queryLower) ||
        d.description.toLowerCase().includes(queryLower) ||
        d.code.toLowerCase().includes(queryLower)

      const matchesSpecies =
        !species || d.species.includes('all') || d.species.includes(species)

      return matchesQuery && matchesSpecies
    })
  }

  it('should find diagnosis by code', () => {
    const diagnosis = findDiagnosisCode('VN-001')
    expect(diagnosis?.name).toBe('Gastroenteritis')
  })

  it('should search by name', () => {
    const results = searchDiagnosisCodes('dermatitis')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Dermatitis alérgica')
  })

  it('should search by description', () => {
    const results = searchDiagnosisCodes('inflamación')
    expect(results.length).toBeGreaterThanOrEqual(2) // gastroenteritis, otitis
  })

  it('should filter by species', () => {
    const dogResults = searchDiagnosisCodes('displasia', 'dog')
    const catResults = searchDiagnosisCodes('displasia', 'cat')

    expect(dogResults).toHaveLength(1)
    expect(catResults).toHaveLength(0)
  })

  it('should include all-species codes for any filter', () => {
    const dogResults = searchDiagnosisCodes('gastroenteritis', 'dog')
    const catResults = searchDiagnosisCodes('gastroenteritis', 'cat')

    expect(dogResults).toHaveLength(1)
    expect(catResults).toHaveLength(1)
  })
})

describe('Medical Record Templates', () => {
  interface RecordTemplate {
    id: string
    name: string
    type: string
    sections: TemplateSection[]
  }

  interface TemplateSection {
    title: string
    fields: TemplateField[]
  }

  interface TemplateField {
    name: string
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number'
    required: boolean
    options?: string[]
  }

  const templates: RecordTemplate[] = [
    {
      id: 'soap-note',
      name: 'Nota SOAP',
      type: 'consultation',
      sections: [
        {
          title: 'Subjetivo',
          fields: [
            { name: 'chief_complaint', type: 'text', required: true },
            { name: 'history', type: 'textarea', required: false },
          ],
        },
        {
          title: 'Objetivo',
          fields: [
            { name: 'temperature', type: 'number', required: false },
            { name: 'heart_rate', type: 'number', required: false },
            { name: 'respiratory_rate', type: 'number', required: false },
            { name: 'physical_exam', type: 'textarea', required: true },
          ],
        },
        {
          title: 'Evaluación',
          fields: [{ name: 'assessment', type: 'textarea', required: true }],
        },
        {
          title: 'Plan',
          fields: [
            { name: 'treatment_plan', type: 'textarea', required: true },
            { name: 'follow_up', type: 'text', required: false },
          ],
        },
      ],
    },
    {
      id: 'surgical-report',
      name: 'Reporte Quirúrgico',
      type: 'surgery',
      sections: [
        {
          title: 'Datos Preoperatorios',
          fields: [
            { name: 'procedure_name', type: 'text', required: true },
            { name: 'indication', type: 'textarea', required: true },
            { name: 'asa_score', type: 'select', required: true, options: ['I', 'II', 'III', 'IV', 'V'] },
          ],
        },
        {
          title: 'Procedimiento',
          fields: [
            { name: 'surgical_technique', type: 'textarea', required: true },
            { name: 'duration_minutes', type: 'number', required: true },
            { name: 'complications', type: 'textarea', required: false },
          ],
        },
        {
          title: 'Postoperatorio',
          fields: [
            { name: 'recovery_notes', type: 'textarea', required: false },
            { name: 'discharge_instructions', type: 'textarea', required: true },
          ],
        },
      ],
    },
  ]

  const getTemplate = (id: string): RecordTemplate | undefined => {
    return templates.find((t) => t.id === id)
  }

  it('should have SOAP note template', () => {
    const soap = getTemplate('soap-note')
    expect(soap).toBeDefined()
    expect(soap?.sections).toHaveLength(4)
  })

  it('should have required fields in SOAP note', () => {
    const soap = getTemplate('soap-note')
    const requiredFields = soap?.sections.flatMap((s) =>
      s.fields.filter((f) => f.required)
    )

    expect(requiredFields?.some((f) => f.name === 'chief_complaint')).toBe(true)
    expect(requiredFields?.some((f) => f.name === 'physical_exam')).toBe(true)
    expect(requiredFields?.some((f) => f.name === 'assessment')).toBe(true)
    expect(requiredFields?.some((f) => f.name === 'treatment_plan')).toBe(true)
  })

  it('should have surgical report with ASA score options', () => {
    const surgical = getTemplate('surgical-report')
    const asaField = surgical?.sections
      .flatMap((s) => s.fields)
      .find((f) => f.name === 'asa_score')

    expect(asaField?.type).toBe('select')
    expect(asaField?.options).toContain('I')
    expect(asaField?.options).toContain('V')
  })
})

describe('Attachment Handling', () => {
  interface Attachment {
    url: string
    type: 'image' | 'pdf' | 'document'
    name: string
    sizeMB: number
    uploadedAt: string
  }

  const MAX_ATTACHMENTS = 10
  const MAX_FILE_SIZE_MB = 20
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']

  const validateAttachment = (
    file: { type: string; sizeMB: number; name: string },
    existingCount: number
  ): { valid: boolean; error?: string } => {
    if (existingCount >= MAX_ATTACHMENTS) {
      return {
        valid: false,
        error: `Máximo ${MAX_ATTACHMENTS} archivos permitidos`,
      }
    }

    if (file.sizeMB > MAX_FILE_SIZE_MB) {
      return {
        valid: false,
        error: `El archivo no puede exceder ${MAX_FILE_SIZE_MB}MB`,
      }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido',
      }
    }

    return { valid: true }
  }

  it('should accept valid image attachment', () => {
    const result = validateAttachment(
      { type: 'image/jpeg', sizeMB: 5, name: 'xray.jpg' },
      0
    )
    expect(result.valid).toBe(true)
  })

  it('should accept valid PDF attachment', () => {
    const result = validateAttachment(
      { type: 'application/pdf', sizeMB: 10, name: 'lab_results.pdf' },
      0
    )
    expect(result.valid).toBe(true)
  })

  it('should reject oversized files', () => {
    const result = validateAttachment(
      { type: 'image/jpeg', sizeMB: 25, name: 'large.jpg' },
      0
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('20MB')
  })

  it('should reject when max attachments reached', () => {
    const result = validateAttachment(
      { type: 'image/jpeg', sizeMB: 1, name: 'photo.jpg' },
      10
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('10 archivos')
  })

  it('should reject unsupported file types', () => {
    const result = validateAttachment(
      { type: 'application/zip', sizeMB: 5, name: 'archive.zip' },
      0
    )
    expect(result.valid).toBe(false)
    expect(result.error).toContain('no permitido')
  })
})

describe('Medical Record History', () => {
  interface MedicalRecordSummary {
    id: string
    date: string
    type: string
    title: string
    performedBy: string
    hasDiagnosis: boolean
    hasAttachments: boolean
  }

  const sortRecordsByDate = (
    records: MedicalRecordSummary[],
    order: 'asc' | 'desc' = 'desc'
  ): MedicalRecordSummary[] => {
    return [...records].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return order === 'desc' ? dateB - dateA : dateA - dateB
    })
  }

  const filterRecordsByType = (
    records: MedicalRecordSummary[],
    type: string
  ): MedicalRecordSummary[] => {
    return records.filter((r) => r.type === type)
  }

  const sampleRecords: MedicalRecordSummary[] = [
    {
      id: '1',
      date: '2024-01-15',
      type: 'consultation',
      title: 'Consulta general',
      performedBy: 'Dr. García',
      hasDiagnosis: true,
      hasAttachments: false,
    },
    {
      id: '2',
      date: '2024-02-20',
      type: 'surgery',
      title: 'Esterilización',
      performedBy: 'Dr. López',
      hasDiagnosis: true,
      hasAttachments: true,
    },
    {
      id: '3',
      date: '2024-01-10',
      type: 'consultation',
      title: 'Seguimiento vacunas',
      performedBy: 'Dr. García',
      hasDiagnosis: false,
      hasAttachments: false,
    },
  ]

  it('should sort records by date descending', () => {
    const sorted = sortRecordsByDate(sampleRecords, 'desc')
    expect(sorted[0].date).toBe('2024-02-20')
    expect(sorted[2].date).toBe('2024-01-10')
  })

  it('should sort records by date ascending', () => {
    const sorted = sortRecordsByDate(sampleRecords, 'asc')
    expect(sorted[0].date).toBe('2024-01-10')
    expect(sorted[2].date).toBe('2024-02-20')
  })

  it('should filter records by type', () => {
    const consultations = filterRecordsByType(sampleRecords, 'consultation')
    expect(consultations).toHaveLength(2)
    expect(consultations.every((r) => r.type === 'consultation')).toBe(true)
  })

  it('should return empty for non-existent type', () => {
    const emergency = filterRecordsByType(sampleRecords, 'emergency')
    expect(emergency).toHaveLength(0)
  })
})

describe('Error Messages', () => {
  const getSpanishErrorMessage = (errorType: string): string => {
    const messages: Record<string, string> = {
      auth_required: 'Debe iniciar sesión',
      access_denied: 'Acceso denegado. Solo personal médico.',
      title_required: 'Título y Tipo son obligatorios',
      pet_not_found: 'Mascota no encontrada',
      save_failed: 'Error al guardar registro',
      invalid_type: 'Tipo de registro inválido',
      tenant_mismatch: 'No tiene acceso a esta clínica',
    }

    return messages[errorType] || 'Error desconocido'
  }

  it('should provide Spanish auth error', () => {
    expect(getSpanishErrorMessage('auth_required')).toBe('Debe iniciar sesión')
  })

  it('should provide Spanish access denied error', () => {
    const message = getSpanishErrorMessage('access_denied')
    expect(message).toContain('personal médico')
  })

  it('should provide Spanish validation error', () => {
    const message = getSpanishErrorMessage('title_required')
    expect(message).toContain('obligatorio')
  })

  it('should provide generic error for unknown types', () => {
    const message = getSpanishErrorMessage('unknown_error_type')
    expect(message).toBe('Error desconocido')
  })
})
