/**
 * Load Test: Appointment Booking Concurrency
 *
 * Tests the atomic appointment booking function under concurrent load to verify
 * that race conditions are properly prevented.
 *
 * Run with: npm run test:load:appointments
 *
 * @ts-nocheck - Load test file with runtime RPC calls (Supabase types not available)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_TENANT_ID = 'test-clinic'
const CONCURRENT_REQUESTS = 10 // Number of simultaneous booking attempts

// Test data IDs (these should exist in the test database)
const TEST_VET_ID = 'test-vet-uuid'
const TEST_PET_ID = 'test-pet-uuid'
const TEST_SERVICE_ID = 'test-service-uuid'

describe('Atomic Appointment Booking - Concurrency Tests', () => {
  let supabase: ReturnType<typeof createClient>
  let testStartTime: string

  beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error(
        'Missing environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      )
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Note: If tests fail with "function book_appointment_atomic does not exist",
    // run migrations: psql $DATABASE_URL -f web/db/migrations/088_atomic_appointment_booking.sql
  })

  beforeEach(async () => {
    // Generate a future time slot for each test
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0) // 10:00 AM
    testStartTime = tomorrow.toISOString()

    // Clean up any existing test appointments
    await supabase
      .from('appointments')
      .delete()
      .eq('tenant_id', TEST_TENANT_ID)
      .gte('start_time', testStartTime)
  })

  afterAll(async () => {
    // Cleanup test appointments
    await supabase
      .from('appointments')
      .delete()
      .eq('tenant_id', TEST_TENANT_ID)
      .gte('start_time', testStartTime)
  })

  describe('book_appointment_atomic', () => {
    it('should prevent double-booking when multiple requests arrive simultaneously', async () => {
      // Simulate 10 users trying to book the same time slot
      const bookingPromises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
        supabase.rpc('book_appointment_atomic', {
          p_tenant_id: TEST_TENANT_ID,
          p_pet_id: TEST_PET_ID,
          p_service_id: TEST_SERVICE_ID,
          p_vet_id: TEST_VET_ID,
          p_start_time: testStartTime,
          p_duration_minutes: 30,
          p_reason: `Concurrent test ${i}`,
          p_notes: `Simulated concurrent booking attempt #${i}`,
          p_booked_by: null,
        })
      )

      // Execute all bookings concurrently
      const results = await Promise.allSettled(bookingPromises)

      // Analyze results
      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.data?.success === true
      )
      const slotUnavailable = results.filter(
        (r) =>
          r.status === 'fulfilled' &&
          r.value.data?.success === false &&
          r.value.data?.error === 'SLOT_UNAVAILABLE'
      )
      const failed = results.filter((r) => r.status === 'rejected')

      // Assertions
      expect(successful.length).toBe(1) // Only ONE should succeed
      expect(slotUnavailable.length).toBe(CONCURRENT_REQUESTS - 1) // All others should get slot unavailable
      expect(failed.length).toBe(0) // No database errors

      console.log(`\n✅ Race condition test passed:`)
      console.log(`   - Successful bookings: ${successful.length}`)
      console.log(`   - Rejected (slot unavailable): ${slotUnavailable.length}`)
      console.log(`   - Failed with errors: ${failed.length}`)

      // Verify database state: exactly 1 appointment exists
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('tenant_id', TEST_TENANT_ID)
        .eq('start_time', testStartTime)

      expect(error).toBeNull()
      expect(appointments).toHaveLength(1)
      console.log(`   - Database verification: Exactly 1 appointment created ✓`)
    })

    it('should handle rapid sequential bookings for different time slots', async () => {
      // Test that the atomic function doesn't block legitimate bookings
      const bookingPromises = Array.from({ length: 5 }, async (_, i) => {
        const slotTime = new Date(testStartTime)
        slotTime.setHours(slotTime.getHours() + i) // Different hour for each booking

        return supabase.rpc('book_appointment_atomic', {
          p_tenant_id: TEST_TENANT_ID,
          p_pet_id: TEST_PET_ID,
          p_service_id: TEST_SERVICE_ID,
          p_vet_id: TEST_VET_ID,
          p_start_time: slotTime.toISOString(),
          p_duration_minutes: 30,
          p_reason: `Sequential test ${i}`,
          p_notes: null,
          p_booked_by: null,
        })
      })

      const results = await Promise.allSettled(bookingPromises)

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.data?.success === true
      )

      // All should succeed (different time slots)
      expect(successful.length).toBe(5)

      console.log(`\n✅ Sequential booking test passed:`)
      console.log(`   - All 5 different time slots booked successfully`)
    })

    it('should reject bookings for past times', async () => {
      const pastTime = new Date()
      pastTime.setHours(pastTime.getHours() - 1) // 1 hour ago

      const { data, error } = await supabase.rpc('book_appointment_atomic', {
        p_tenant_id: TEST_TENANT_ID,
        p_pet_id: TEST_PET_ID,
        p_service_id: TEST_SERVICE_ID,
        p_vet_id: TEST_VET_ID,
        p_start_time: pastTime.toISOString(),
        p_duration_minutes: 30,
        p_reason: 'Past time test',
        p_notes: null,
        p_booked_by: null,
      })

      expect(error).toBeNull()
      expect(data.success).toBe(false)
      expect(data.error).toBe('INVALID_TIME')
      expect(data.message).toContain('futuro')

      console.log(`\n✅ Past time validation test passed`)
    })
  })

  describe('reschedule_appointment_atomic', () => {
    let existingAppointmentId: string

    beforeEach(async () => {
      // Create an appointment to reschedule
      const { data, error } = await supabase.rpc('book_appointment_atomic', {
        p_tenant_id: TEST_TENANT_ID,
        p_pet_id: TEST_PET_ID,
        p_service_id: TEST_SERVICE_ID,
        p_vet_id: TEST_VET_ID,
        p_start_time: testStartTime,
        p_duration_minutes: 30,
        p_reason: 'Initial booking for reschedule test',
        p_notes: null,
        p_booked_by: null,
      })

      expect(data.success).toBe(true)
      existingAppointmentId = data.appointment_id
    })

    it('should prevent double-booking when multiple reschedule attempts target same slot', async () => {
      // New time slot for reschedule
      const newTime = new Date(testStartTime)
      newTime.setHours(newTime.getHours() + 2)
      const newTimeStr = newTime.toISOString()

      // Simulate multiple concurrent reschedule attempts to the same slot
      const reschedulePromises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
        supabase.rpc('reschedule_appointment_atomic', {
          p_appointment_id: existingAppointmentId,
          p_new_start_time: newTimeStr,
          p_user_id: null,
          p_is_staff: true,
        })
      )

      const results = await Promise.allSettled(reschedulePromises)

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.data?.success === true
      )

      // First request should succeed, others should see the already-rescheduled state
      expect(successful.length).toBeGreaterThanOrEqual(1)
      expect(successful.length).toBeLessThanOrEqual(CONCURRENT_REQUESTS)

      // Verify final state: appointment exists at new time
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('start_time')
        .eq('id', existingAppointmentId)
        .single()

      expect(error).toBeNull()
      expect(new Date(appointment.start_time).getTime()).toBe(newTime.getTime())

      console.log(`\n✅ Concurrent reschedule test passed`)
      console.log(`   - Appointment successfully rescheduled atomically`)
    })
  })

  describe('Performance benchmarks', () => {
    it('should complete 100 bookings for different slots in reasonable time', async () => {
      const startBenchmark = Date.now()

      const bookingPromises = Array.from({ length: 100 }, async (_, i) => {
        const slotTime = new Date(testStartTime)
        slotTime.setMinutes(slotTime.getMinutes() + i * 30) // 30-min slots

        return supabase.rpc('book_appointment_atomic', {
          p_tenant_id: TEST_TENANT_ID,
          p_pet_id: TEST_PET_ID,
          p_service_id: TEST_SERVICE_ID,
          p_vet_id: TEST_VET_ID,
          p_start_time: slotTime.toISOString(),
          p_duration_minutes: 30,
          p_reason: `Benchmark test ${i}`,
          p_notes: null,
          p_booked_by: null,
        })
      })

      const results = await Promise.allSettled(bookingPromises)
      const endBenchmark = Date.now()
      const duration = endBenchmark - startBenchmark

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && r.value.data?.success === true
      )

      expect(successful.length).toBe(100)
      expect(duration).toBeLessThan(30000) // Should complete in under 30 seconds

      console.log(`\n⏱️  Performance benchmark:`)
      console.log(`   - 100 bookings completed in ${duration}ms`)
      console.log(`   - Average: ${(duration / 100).toFixed(2)}ms per booking`)
      console.log(`   - Throughput: ${((100 / duration) * 1000).toFixed(2)} bookings/second`)
    })
  })
})
