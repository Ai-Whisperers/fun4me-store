/**
 * Tests for User Preferences API
 * TICKET-SEC-001: Verify authentication and tenant isolation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('GET /api/user/preferences', () => {
  let testUser: any
  let supabase: any

  beforeEach(async () => {
    // Create test user with authentication
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: authData } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'test-password-123',
    })

    testUser = authData.user

    // Create profile for user
    await supabase.from('profiles').insert({
      id: testUser.id,
      tenant_id: 'test-tenant',
      role: 'owner',
      full_name: 'Test User',
      email: testUser.email,
    })
  })

  afterEach(async () => {
    // Cleanup
    if (testUser) {
      await supabase.from('profiles').delete().eq('id', testUser.id)
      await supabase.auth.admin.deleteUser(testUser.id)
    }
  })

  it('returns 401 when not authenticated', async () => {
    const response = await fetch('http://localhost:3000/api/user/preferences')
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it('returns default preferences for authenticated user', async () => {
    const { data: session } = await supabase.auth.getSession()

    const response = await fetch('http://localhost:3000/api/user/preferences', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({
      defaultPetId: null,
      reminderType: 'email',
      reminderTimeBefore: '24h',
    })
  })

  it('returns stored preferences if they exist', async () => {
    // Set preferences in database
    await supabase
      .from('profiles')
      .update({
        user_preferences: {
          defaultPetId: 'test-pet-id',
          reminderType: 'sms',
          reminderTimeBefore: '1h',
        },
      })
      .eq('id', testUser.id)

    const { data: session } = await supabase.auth.getSession()

    const response = await fetch('http://localhost:3000/api/user/preferences', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({
      defaultPetId: 'test-pet-id',
      reminderType: 'sms',
      reminderTimeBefore: '1h',
    })
  })
})

describe('POST /api/user/preferences', () => {
  let testUser: any
  let supabase: any

  beforeEach(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: authData } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'test-password-123',
    })

    testUser = authData.user

    await supabase.from('profiles').insert({
      id: testUser.id,
      tenant_id: 'test-tenant',
      role: 'owner',
      full_name: 'Test User',
      email: testUser.email,
    })
  })

  afterEach(async () => {
    if (testUser) {
      await supabase.from('profiles').delete().eq('id', testUser.id)
      await supabase.auth.admin.deleteUser(testUser.id)
    }
  })

  it('returns 401 when not authenticated', async () => {
    const response = await fetch('http://localhost:3000/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderType: 'sms' }),
    })

    expect(response.status).toBe(401)
  })

  it('updates preferences for authenticated user', async () => {
    const { data: session } = await supabase.auth.getSession()

    const response = await fetch('http://localhost:3000/api/user/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reminderType: 'sms',
        reminderTimeBefore: '1h',
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.preferences).toEqual({
      defaultPetId: null,
      reminderType: 'sms',
      reminderTimeBefore: '1h',
    })

    // Verify in database
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_preferences')
      .eq('id', testUser.id)
      .single()

    expect(profile.user_preferences).toEqual({
      defaultPetId: null,
      reminderType: 'sms',
      reminderTimeBefore: '1h',
    })
  })

  it('validates input and returns 400 for invalid data', async () => {
    const { data: session } = await supabase.auth.getSession()

    const response = await fetch('http://localhost:3000/api/user/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reminderType: 'invalid-type', // Invalid enum value
      }),
    })

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.field_errors).toBeDefined()
  })

  it('merges new preferences with existing ones', async () => {
    // Set initial preferences
    await supabase
      .from('profiles')
      .update({
        user_preferences: {
          defaultPetId: 'pet-123',
          reminderType: 'email',
          reminderTimeBefore: '24h',
        },
      })
      .eq('id', testUser.id)

    const { data: session } = await supabase.auth.getSession()

    // Update only reminderType
    const response = await fetch('http://localhost:3000/api/user/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reminderType: 'sms',
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.preferences).toEqual({
      defaultPetId: 'pet-123', // Preserved
      reminderType: 'sms', // Updated
      reminderTimeBefore: '24h', // Preserved
    })
  })

  it('isolates preferences by user (no cross-user access)', async () => {
    // Create second user
    const { data: authData2 } = await supabase.auth.signUp({
      email: `test2-${Date.now()}@example.com`,
      password: 'test-password-123',
    })

    const testUser2 = authData2.user

    await supabase.from('profiles').insert({
      id: testUser2.id,
      tenant_id: 'test-tenant',
      role: 'owner',
      full_name: 'Test User 2',
      email: testUser2.email,
    })

    // Set preferences for user 1
    await supabase
      .from('profiles')
      .update({
        user_preferences: {
          defaultPetId: 'user1-pet',
          reminderType: 'email',
        },
      })
      .eq('id', testUser.id)

    // User 2 gets their own preferences (not user 1's)
    const { data: session2 } = await supabase.auth.getSession()

    const response = await fetch('http://localhost:3000/api/user/preferences', {
      headers: {
        Authorization: `Bearer ${session2.session.access_token}`,
      },
    })

    const data = await response.json()

    // Should get defaults, not user1's preferences
    expect(data.defaultPetId).toBeNull()
    expect(data).not.toEqual({
      defaultPetId: 'user1-pet',
      reminderType: 'email',
    })

    // Cleanup
    await supabase.from('profiles').delete().eq('id', testUser2.id)
    await supabase.auth.admin.deleteUser(testUser2.id)
  })
})
