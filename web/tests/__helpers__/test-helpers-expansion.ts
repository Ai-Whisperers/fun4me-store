/**
 * Test Helper Functions Expansion
 *
 * Additional utility functions for advanced testing scenarios,
 * database setup, and test data management.
 */

import { createClient } from '@supabase/supabase-js'
import { factories } from '../__fixtures__/factories'
import { UserFixture } from '../__fixtures__/users'

// Database client for test setup
let testDb: ReturnType<typeof createClient> | null = null

/**
 * Get Supabase client for test operations
 */
export function getTestDb() {
  if (!testDb) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables for test DB')
    }

    testDb = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }

  return testDb
}

/**
 * Clean up test database before/after tests
 */
export async function cleanupTestDb(tables?: string[]): Promise<void> {
  const db = getTestDb()
  const defaultTables = [
    'pets',
    'appointments',
    'medical_records',
    'prescriptions',
    'vaccines',
    'lab_orders',
    'orders',
    'invoices',
    'messages',
    'products',
    'kennels',
    'services',
  ]

  const tablesToCleanup = tables || defaultTables

  for (const table of tablesToCleanup) {
    try {
      // Only delete test data (created in last 24 hours or with test- prefix)
      const { error } = await db
        .from(table)
        .delete()
        .or('created_at.gt.24h', 'id.ilike.test-')
        .or('name.ilike.test-', 'description.ilike.test-')
      
      if (error) {
        console.warn(`Failed to cleanup table ${table}:`, error)
      }
    } catch (error) {
      console.error(`Error cleaning up table ${table}:`, error)
    }
  }
}

/**
 * Setup test tenant for isolated testing
 */
export async function setupTestTenant(): Promise<{ tenantId: string; user: UserFixture }> {
  const db = getTestDb()
  
  // Create test tenant
  const { data: tenant, error: tenantError } = await db
    .from('tenants')
    .insert({
      name: 'Test Tenant',
      subdomain: 'test-tenant',
      status: 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (tenantError || !tenant) {
    throw new Error(`Failed to create test tenant: ${tenantError?.message}`)
  }

  // Create test user for the tenant
  const { data: user, error: userError } = await db.auth.admin.createUser({
    email: `test-user-${Date.now()}@test.local`,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User',
      role: 'owner',
      tenant_id: tenant.id,
      phone: '+595981234567',
      client_code: 'TEST-001',
    },
  })

  if (userError || !user) {
    throw new Error(`Failed to create test user: ${userError?.message}`)
  }

  return {
    tenantId: tenant.id,
    user: {
      id: user.id,
      email: user.email,
      password: 'TestPassword123!',
      fullName: 'Test User',
      phone: '+595981234567',
      role: 'owner',
      tenantId: tenant.id,
      clientCode: 'TEST-001',
    }
  }
}

/**
 * Create related test data (pet with owner, appointment with pet, etc.)
 */
export async function createTestDataRelationships(
  tenantId: string,
  ownerUser: UserFixture
): Promise<{
    pet: any
    appointment: any
    medicalRecord: any
    service: any
  }> {
  const db = getTestDb()

  // Create pet
  const pet = factories.pet({
    tenant_id: tenantId,
    owner_id: ownerUser.id,
  })
  const { data: createdPet, error: petError } = await db
    .from('pets')
    .insert(pet)
    .select()
    .single()

  if (petError || !createdPet) {
    throw new Error(`Failed to create test pet: ${petError?.message}`)
  }

  // Create service
  const service = factories.service({
    tenant_id: tenantId,
  })
  const { data: createdService, error: serviceError } = await db
    .from('services')
    .insert(service)
    .select()
    .single()

  if (serviceError || !createdService) {
    throw new Error(`Failed to create test service: ${serviceError?.message}`)
  }

  // Create appointment
  const appointment = factories.appointment({
    tenant_id: tenantId,
    owner_id: ownerUser.id,
    pet_id: createdPet.id,
    service_id: createdService.id,
    veterinarian_id: 'test-vet-id',
    status: 'confirmed',
  })
  const { data: createdAppointment, error: appointmentError } = await db
    .from('appointments')
    .insert(appointment)
    .select()
    .single()

  if (appointmentError || !createdAppointment) {
    throw new Error(`Failed to create test appointment: ${appointmentError?.message}`)
  }

  // Create medical record
  const medicalRecord = factories.medicalRecord({
    tenant_id: tenantId,
    pet_id: createdPet.id,
    owner_id: ownerUser.id,
    veterinarian_id: 'test-vet-id',
    appointment_id: createdAppointment.id,
  })
  const { data: createdRecord, error: recordError } = await db
    .from('medical_records')
    .insert(medicalRecord)
    .select()
    .single()

  if (recordError || !createdRecord) {
    throw new Error(`Failed to create test medical record: ${recordError?.message}`)
  }

  return {
    pet: createdPet,
    appointment: createdAppointment,
    medicalRecord: createdRecord,
    service: createdService,
  }
}

/**
 * Create test users with different roles for the same tenant
 */
export async function createTestUsersByRole(tenantId: string): Promise<{
  owner: UserFixture
  vet: UserFixture
  admin: UserFixture
}> {
  const db = getTestDb()

  const roles = [
    { role: 'owner', email: 'test-owner@test.local' },
    { role: 'vet', email: 'test-vet@test.local' },
    { role: 'admin', email: 'test-admin@test.local' },
  ]

  const users = {} as any

  for (const { role, email } of roles) {
    const { data: user, error } = await db.auth.admin.createUser({
      email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        role,
        tenant_id: tenantId,
        phone: '+595981234567',
        client_code: `TEST-${role.toUpperCase().slice(0, 3)}-001`,
      },
    })

    if (error || !user) {
      throw new Error(`Failed to create test ${role}: ${error?.message}`)
    }

    users[role] = {
      id: user.id,
      email,
      password: 'TestPassword123!',
      fullName: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      phone: '+595981234567',
      role,
      tenantId,
      clientCode: `TEST-${role.toUpperCase().slice(0, 3)}-001`,
    }
  }

  return users
}

/**
 * Create large dataset for performance testing
 */
export async function createLargeTestDataset(
  factory: keyof typeof factories,
  count: number,
  overrides: Partial<any> = {}
): Promise<any[]> {
  const db = getTestDb()
  const factoryFunc = factories[factory]
  const items = []

  for (let i = 0; i < count; i++) {
    const item = factoryFunc({
      ...overrides,
      name: `Test ${factory} ${i + 1}`,
      description: `Test data item ${i + 1} for performance testing`,
    })

    const { data, error } = await db
      .from(`${factory}s`)
      .insert(item)
      .select()
      .single()

    if (error) {
      console.warn(`Failed to create ${factory} ${i + 1}:`, error)
    } else if (data) {
      items.push(data)
    }
  }

  return items
}

/**
 * Helper for testing concurrent operations
 */
export async function testConcurrentOperations<T>(
  operations: (() => Promise<T>)[],
  maxConcurrency: number = 10
): Promise<{ results: T[]; errors: Error[] }> {
  const semaphore = new Array(maxConcurrency).fill(null)
  const results: T[] = []
  const errors: Error[] = []

  const executeWithSemaphore = async (operation: () => Promise<T>, index: number): Promise<T> => {
    // Wait for available slot
    while (semaphore[index] !== null) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    semaphore[index] = true

    try {
      const result = await operation()
      results.push(result)
      return result
    } catch (error) {
      errors.push(error)
      throw error
    } finally {
      semaphore[index] = null
    }
  }

  const promises = operations.map((operation, index) =>
    executeWithSemaphore(operation, index)
  )

  await Promise.allSettled(promises)

  return { results, errors }
}

/**
 * Helper for testing rate limiting
 */
export async function testRateLimiting(
  endpoint: string,
  requestFunction: () => Promise<any>,
  requestCount: number = 10,
  intervalMs: number = 100
): Promise<{
    responses: any[]
    rateLimitedResponses: number
    averageResponseTime: number
  }> {
  const responses = []
  let rateLimitedResponses = 0
  const responseTimes = []

  for (let i = 0; i < requestCount; i++) {
    const startTime = Date.now()
    
    try {
      const response = await requestFunction()
      const endTime = Date.now()
      const responseTime = endTime - startTime

      responses.push(response)
      responseTimes.push(responseTime)

      if (response.status === 429) {
        rateLimitedResponses++
      }
    } catch (error) {
      const endTime = Date.now()
      const responseTime = endTime - startTime

      responses.push({ error: error.message })
      responseTimes.push(responseTime)

      if (error.status === 429) {
        rateLimitedResponses++
      }
    }

    // Wait between requests
    if (i < requestCount - 1) {
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }

  const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length

  return {
    responses,
    rateLimitedResponses,
    averageResponseTime,
  }
}

/**
 * Helper for testing file operations
 */
export async function createTestFile(
  filename: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<File> {
  return new File([content], filename, { type: mimeType })
}

/**
 * Helper for testing image uploads
 */
export async function createTestImage(
  filename: string = 'test-image.jpg',
  width: number = 800,
  height: number = 600
): Promise<File> {
  // Create a simple canvas-based image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // Draw a simple test image
    ctx.fillStyle = '#4A90E2'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '48px Arial'
    ctx.fillText('TEST', width / 2 - 50, height / 2)
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], filename, { type: 'image/jpeg' }))
      } else {
        resolve(new File([], filename, { type: 'image/jpeg' }))
      }
    }, 'image/jpeg')
  })
}

/**
 * Helper for testing date/time operations
 */
export class TestTimeTravel {
  private originalNow: typeof Date.now
  private currentTime: Date

  constructor(targetDate: Date) {
    this.originalNow = Date.now
    this.currentTime = targetDate
    this.setup()
  }

  private setup() {
    // Override Date.now for tests
    Date.now = () => this.currentTime.getTime()
    
    // Override new Date() for tests
    const RealDate = Date
    // @ts-expect-error - Overriding global Date constructor for testing
    global.Date = function(...args) {
      if (args.length === 0) {
        return this.currentTime
      }
      return new RealDate(...args)
    }
  }

  restore() {
    Date.now = this.originalNow
    // @ts-expect-error - Restoring original global Date constructor
    global.Date = Date
  }

  advanceDays(days: number) {
    this.currentTime = new Date(this.currentTime.getTime() + days * 24 * 60 * 60 * 1000)
  }

  advanceHours(hours: number) {
    this.currentTime = new Date(this.currentTime.getTime() + hours * 60 * 60 * 1000)
  }

  getCurrentTime(): Date {
    return this.currentTime
  }

  getCurrentTimeString(): string {
    return this.currentTime.toISOString()
  }
}

/**
 * Helper for testing notifications
 */
export const testNotificationCapture = {
  capturedNotifications: [] as any[],

  capture() {
    // Mock notification system
    // @ts-expect-error - Mocking global Notification API for testing
    global.Notification = class MockNotification {
      static permission = 'granted'
      
      constructor(title: string, options: any) {
        testNotificationCapture.capturedNotifications.push({
          title,
          body: options?.body,
          icon: options?.icon,
          tag: options?.tag,
          timestamp: new Date().toISOString(),
        })
      }

      static requestPermission(callback: (permission: NotificationPermission) => void) {
        callback('granted')
      }
    }
  },

  reset() {
    testNotificationCapture.capturedNotifications = []
    // @ts-expect-error - Checking if global Notification is our mock
    if (global.Notification?.prototype?.constructor?.name === 'MockNotification') {
      return
    }
    // @ts-expect-error - Deleting mocked global Notification
    delete global.Notification
  },

  getCaptured() {
    return testNotificationCapture.capturedNotifications
  },
}

/**
 * Helper for testing local storage
 */
export const testLocalStorage = {
  clear() {
    localStorage.clear()
    sessionStorage.clear()
  },

  getItem(key: string): string | null {
    return localStorage.getItem(key) || sessionStorage.getItem(key)
  },

  setItem(key: string, value: string) {
    localStorage.setItem(key, value)
    sessionStorage.setItem(key, value)
  },

  removeItem(key: string) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },

  getAll(): Record<string, string> {
    const storage: Record<string, string> = {}
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        storage[key] = localStorage.getItem(key) || ''
      }
    }
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key) {
        storage[`${key}_session`] = sessionStorage.getItem(key) || ''
      }
    }

    return storage
  },
}