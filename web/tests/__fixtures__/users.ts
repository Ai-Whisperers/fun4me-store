/**
 * Test Fixtures: Users
 *
 * Pre-defined user data for testing authentication and role-based access.
 */

export type UserRole = 'owner' | 'vet' | 'admin'

export interface UserFixture {
  id: string
  email: string
  password: string
  fullName: string
  phone: string
  role: UserRole
  tenantId: string
  clientCode?: string
}

/** Test user credentials - DO NOT USE IN PRODUCTION */
const TEST_PASSWORD = 'TestPassword123!'

/** Pre-defined test users by role */
export const USERS: Record<string, UserFixture> = {
  // Pet Owners
  owner1: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'owner1@test.local',
    password: TEST_PASSWORD,
    fullName: 'Juan Propietario',
    phone: '+595981123456',
    role: 'owner',
    tenantId: 'terrapet',
    clientCode: 'ADR-001',
  },
  owner2: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'owner2@test.local',
    password: TEST_PASSWORD,
    fullName: 'Maria Cliente',
    phone: '+595981234567',
    role: 'owner',
    tenantId: 'terrapet',
    clientCode: 'ADR-002',
  },
  ownerPetlife: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'owner.petlife@test.local',
    password: TEST_PASSWORD,
    fullName: 'Carlos PetLife',
    phone: '+595981345678',
    role: 'owner',
    tenantId: 'petlife',
    clientCode: 'PL-001',
  },

  // Veterinarians
  vet1: {
    id: '00000000-0000-0000-0000-000000000010',
    email: 'vet1@test.local',
    password: TEST_PASSWORD,
    fullName: 'Dr. Roberto Veterinario',
    phone: '+595981456789',
    role: 'vet',
    tenantId: 'terrapet',
  },
  vet2: {
    id: '00000000-0000-0000-0000-000000000011',
    email: 'vet2@test.local',
    password: TEST_PASSWORD,
    fullName: 'Dra. Ana Veterinaria',
    phone: '+595981567890',
    role: 'vet',
    tenantId: 'terrapet',
  },

  // Administrators
  admin1: {
    id: '00000000-0000-0000-0000-000000000020',
    email: 'admin@test.local',
    password: TEST_PASSWORD,
    fullName: 'Admin Principal',
    phone: '+595981678901',
    role: 'admin',
    tenantId: 'terrapet',
  },
  adminPetlife: {
    id: '00000000-0000-0000-0000-000000000021',
    email: 'admin.petlife@test.local',
    password: TEST_PASSWORD,
    fullName: 'Admin PetLife',
    phone: '+595981789012',
    role: 'admin',
    tenantId: 'petlife',
  },
}

/** Get user by key */
export function getUser(key: string): UserFixture {
  const user = USERS[key]
  if (!user) {
    throw new Error(`Unknown user: ${key}`)
  }
  return user
}

/** Get users by role */
export function getUsersByRole(role: UserRole): UserFixture[] {
  return Object.values(USERS).filter((user) => user.role === role)
}

/** Get users by tenant */
export function getUsersByTenant(tenantId: string): UserFixture[] {
  return Object.values(USERS).filter((user) => user.tenantId === tenantId)
}

/** Default users for quick access */
export const DEFAULT_OWNER = USERS.owner1
export const DEFAULT_VET = USERS.vet1
export const DEFAULT_ADMIN = USERS.admin1

/** Invalid credentials for testing auth failures */
export const INVALID_CREDENTIALS = {
  email: 'nonexistent@test.local',
  password: 'WrongPassword123!',
}

/** Generate unique test email */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${prefix}-${timestamp}-${random}@test.local`
}

/** Generate unique phone number */
export function generateTestPhone(): string {
  const random = Math.floor(Math.random() * 900000000) + 100000000
  return `+595${random}`
}
