import { test, expect, beforeAll, afterAll } from 'vitest'
import { getTestClient, TestContext } from '../__helpers__/db'
import { createProfile } from '../__helpers__/factories'
import { TENANT_IDS } from '@/lib/constants/tenants';

const ctx = new TestContext()
let testOwnerId: string

beforeAll(async () => {
  // Create test owner for the pet test
  const profile = await createProfile({
    tenantId: TENANT_IDS.ADRIS,
    role: 'owner',
  })
  testOwnerId = profile.id
  ctx.track('profiles', testOwnerId)
})

afterAll(async () => {
  await ctx.cleanup()
})

test('creates a pet via Supabase client', async () => {
  const supabase = getTestClient({ serviceRole: true })
  
  const { data, error } = await supabase
    .from('pets')
    .insert({
      owner_id: testOwnerId,
      tenant_id: TENANT_IDS.ADRIS,
      name: 'TestDog',
      species: 'dog',
      weight_kg: 10,
    })
    .select()
  expect(error).toBeNull()
  expect(data).toBeDefined()
  // Cleanup
  if (data && data[0]) {
    ctx.track('pets', data[0].id)
  }
})
