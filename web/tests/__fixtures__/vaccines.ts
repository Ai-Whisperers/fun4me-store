/**
 * Test Fixtures: Vaccines
 *
 * Pre-defined vaccine data for testing vaccine management functionality.
 */

export type VaccineStatus = 'pending' | 'verified' | 'rejected'

export interface VaccineFixture {
  id: string
  petId: string
  name: string
  administeredDate?: string
  nextDueDate?: string
  batchNumber?: string
  vetSignature?: string
  administeredBy?: string
  status: VaccineStatus
  photos?: string[]
}

/** Common vaccine names */
export const VACCINE_NAMES = {
  dog: [
    'Rabia',
    'Parvovirus',
    'Distemper',
    'Hepatitis',
    'Leptospirosis',
    'Bordetella',
    'Sextuple',
    'Octuple',
  ],
  cat: ['Rabia', 'Triple Felina', 'Leucemia Felina', 'PIF', 'Chlamydia'],
  rabbit: ['Mixomatosis', 'VHD'],
}

/** Pre-defined test vaccines */
export const VACCINES: Record<string, VaccineFixture> = {
  maxRabia: {
    id: '00000000-0000-0000-0002-000000000001',
    petId: '00000000-0000-0000-0001-000000000001',
    name: 'Rabia',
    administeredDate: '2024-01-15',
    nextDueDate: '2025-01-15',
    batchNumber: 'RAB-2024-001',
    status: 'verified',
    administeredBy: '00000000-0000-0000-0000-000000000010',
  },
  maxParvovirus: {
    id: '00000000-0000-0000-0002-000000000002',
    petId: '00000000-0000-0000-0001-000000000001',
    name: 'Parvovirus',
    administeredDate: '2024-02-20',
    nextDueDate: '2025-02-20',
    batchNumber: 'PARVO-2024-042',
    status: 'verified',
    administeredBy: '00000000-0000-0000-0000-000000000010',
  },
  maxSextuple: {
    id: '00000000-0000-0000-0002-000000000003',
    petId: '00000000-0000-0000-0001-000000000001',
    name: 'Sextuple',
    administeredDate: '2024-03-10',
    nextDueDate: '2025-03-10',
    batchNumber: 'SEX-2024-088',
    status: 'pending',
    administeredBy: '00000000-0000-0000-0000-000000000011',
  },
  mishiTriple: {
    id: '00000000-0000-0000-0002-000000000010',
    petId: '00000000-0000-0000-0001-000000000003',
    name: 'Triple Felina',
    administeredDate: '2024-04-05',
    nextDueDate: '2025-04-05',
    batchNumber: 'TF-2024-012',
    status: 'verified',
    administeredBy: '00000000-0000-0000-0000-000000000010',
  },
  mishiRabia: {
    id: '00000000-0000-0000-0002-000000000011',
    petId: '00000000-0000-0000-0001-000000000003',
    name: 'Rabia',
    administeredDate: '2024-04-05',
    nextDueDate: '2025-04-05',
    batchNumber: 'RAB-2024-099',
    status: 'verified',
    administeredBy: '00000000-0000-0000-0000-000000000010',
  },
}

/** Get vaccine by key */
export function getVaccine(key: string): VaccineFixture {
  const vaccine = VACCINES[key]
  if (!vaccine) {
    throw new Error(`Unknown vaccine: ${key}`)
  }
  return vaccine
}

/** Get vaccines by pet */
export function getVaccinesByPet(petId: string): VaccineFixture[] {
  return Object.values(VACCINES).filter((vaccine) => vaccine.petId === petId)
}

/** Get vaccines by status */
export function getVaccinesByStatus(status: VaccineStatus): VaccineFixture[] {
  return Object.values(VACCINES).filter((vaccine) => vaccine.status === status)
}

/** Generate vaccine data for creation tests */
export function generateVaccineData(
  petId: string,
  overrides: Partial<VaccineFixture> = {}
): Omit<VaccineFixture, 'id'> {
  const today = new Date()
  const nextYear = new Date(today)
  nextYear.setFullYear(nextYear.getFullYear() + 1)

  return {
    petId,
    name: 'Test Vaccine',
    administeredDate: today.toISOString().split('T')[0],
    nextDueDate: nextYear.toISOString().split('T')[0],
    batchNumber: `TEST-${Date.now()}`,
    status: 'pending',
    ...overrides,
  }
}

/** Get upcoming vaccines (due within X days) */
export function getUpcomingVaccines(daysAhead: number = 30): VaccineFixture[] {
  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  return Object.values(VACCINES).filter((vaccine) => {
    if (!vaccine.nextDueDate) return false
    const dueDate = new Date(vaccine.nextDueDate)
    return dueDate >= today && dueDate <= futureDate
  })
}

/** Get overdue vaccines */
export function getOverdueVaccines(): VaccineFixture[] {
  const today = new Date()

  return Object.values(VACCINES).filter((vaccine) => {
    if (!vaccine.nextDueDate) return false
    const dueDate = new Date(vaccine.nextDueDate)
    return dueDate < today
  })
}
