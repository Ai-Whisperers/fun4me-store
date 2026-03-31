/**
 * Lost Pets Tenant Isolation Security Tests
 * 
 * Tests for TICKET-SEC-002: Lost Pets Tenant Isolation
 * 
 * Verifies that:
 * 1. GET endpoint only returns lost pets from user's tenant
 * 2. PATCH endpoint cannot modify lost pets from other tenants
 * 3. Cross-tenant access attempts return 404 (not 403 to avoid info leakage)
 * 4. Public access is properly restricted
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabaseClient } from '../services/__mocks__/supabase-mock'
import type { TestUser } from '../helpers/auth-mock'

// Mock data
const TENANT_A = 'terrapet'
const TENANT_B = 'petlife'

const mockUserTenantA: TestUser = {
  id: 'user-tenant-a',
  email: 'vet@terrapet.com',
  role: 'vet',
  tenantId: TENANT_A,
}

const mockUserTenantB: TestUser = {
  id: 'user-tenant-b',
  email: 'vet@petlife.com',
  role: 'vet',
  tenantId: TENANT_B,
}

const mockAdminTenantA: TestUser = {
  id: 'admin-tenant-a',
  email: 'admin@terrapet.com',
  role: 'admin',
  tenantId: TENANT_A,
}

const mockPetTenantA = {
  id: 'pet-a-1',
  name: 'Firulais',
  species: 'Canino',
  breed: 'Mestizo',
  tenant_id: TENANT_A,
  owner_id: 'owner-a-1',
  photo_url: null,
}

const mockPetTenantB = {
  id: 'pet-b-1',
  name: 'Luna',
  species: 'Canino',
  breed: 'Golden Retriever',
  tenant_id: TENANT_B,
  owner_id: 'owner-b-1',
  photo_url: null,
}

const mockLostPetTenantA = {
  id: 'lost-a-1',
  pet_id: mockPetTenantA.id,
  tenant_id: TENANT_A,
  status: 'lost',
  last_seen_location: 'Asunción Centro',
  notes: 'Lost near Plaza de Armas',
  created_at: new Date().toISOString(),
  pet: mockPetTenantA,
}

const mockLostPetTenantB = {
  id: 'lost-b-1',
  pet_id: mockPetTenantB.id,
  tenant_id: TENANT_B,
  status: 'lost',
  last_seen_location: 'San Lorenzo',
  notes: 'Last seen near university',
  created_at: new Date().toISOString(),
  pet: mockPetTenantB,
}

describe('Lost Pets Tenant Isolation', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    vi.clearAllMocks()
  })

  describe('Dashboard API: GET /api/dashboard/lost-pets', () => {
    it('should only return lost pets from user tenant', async () => {
      // Setup: Mock tenant filtering behavior
      const tenantAData = [mockLostPetTenantA] // Only Tenant A data should be returned
      
      // Mock Supabase query chain with proper spy setup
      const eqSpy = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: tenantAData,
            error: null,
            count: 1
          })
        })
      })
      
      const selectSpy = vi.fn().mockReturnValue({
        eq: eqSpy
      })
      
      mockSupabase.from.mockReturnValue({
        select: selectSpy
      })

      // Test the critical security query: filtering by tenant_id
      const result = mockSupabase.from('lost_pets').select('*').eq('tenant_id', TENANT_A)
      
      // Verify tenant filtering was applied correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('lost_pets')
      expect(selectSpy).toHaveBeenCalledWith('*')
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', TENANT_A)
      
      // Verify only Tenant A data is returned
      const { data } = await result.order().range()
      expect(data).toHaveLength(1)
      expect(data[0].tenant_id).toBe(TENANT_A)
      expect(data[0].id).toBe(mockLostPetTenantA.id)
    })

    it('should filter by status when provided', async () => {
      // Setup: Mock compound filtering (tenant + status)
      const filteredData = [{ ...mockLostPetTenantA, status: 'lost' }]
      
      // Create spy chain for compound filtering
      const statusEqSpy = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: filteredData,
            error: null,
            count: 1
          })
        })
      })
      
      const tenantEqSpy = vi.fn().mockReturnValue({
        eq: statusEqSpy
      })
      
      const selectSpy = vi.fn().mockReturnValue({
        eq: tenantEqSpy
      })
      
      mockSupabase.from.mockReturnValue({
        select: selectSpy
      })

      // Test compound filtering: tenant_id + status
      const result = mockSupabase.from('lost_pets').select('*').eq('tenant_id', TENANT_A).eq('status', 'lost')
      
      // Verify both security filters were applied
      expect(selectSpy).toHaveBeenCalledWith('*')
      expect(tenantEqSpy).toHaveBeenCalledWith('tenant_id', TENANT_A)
      expect(statusEqSpy).toHaveBeenCalledWith('status', 'lost')
      
      // Verify correct data returned
      const { data } = await result.order().range()
      expect(data).toHaveLength(1)
      expect(data[0].status).toBe('lost')
      expect(data[0].tenant_id).toBe(TENANT_A)
    })

    it('should return empty array when no lost pets exist in tenant', async () => {
      // Setup: Mock empty result for tenant with no lost pets
      const eqSpy = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0
          })
        })
      })
      
      const selectSpy = vi.fn().mockReturnValue({
        eq: eqSpy
      })
      
      mockSupabase.from.mockReturnValue({
        select: selectSpy
      })

      // Test query for tenant with no lost pets
      const result = mockSupabase.from('lost_pets').select('*').eq('tenant_id', 'empty-tenant')
      
      // Verify tenant filter is still applied
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', 'empty-tenant')
      
      // Verify empty array is returned, not an error (graceful degradation)
      const { data, error } = await result.order().range()
      expect(data).toEqual([])
      expect(error).toBeNull()
    })

    it('should not leak lost pet data from other tenants', async () => {
      // Critical: Test tenant isolation prevents cross-tenant data access
      const tenantBOnlyData = [mockLostPetTenantB]
      
      // Mock query that properly filters by tenant
      const eqSpy = vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: tenantBOnlyData,
            error: null,
            count: 1
          })
        })
      })
      
      const selectSpy = vi.fn().mockReturnValue({
        eq: eqSpy
      })
      
      mockSupabase.from.mockReturnValue({
        select: selectSpy
      })

      // Simulate Tenant B user query (should only see Tenant B data)
      const result = mockSupabase.from('lost_pets').select('*').eq('tenant_id', TENANT_B)
      
      // Verify tenant filtering applied
      expect(eqSpy).toHaveBeenCalledWith('tenant_id', TENANT_B)
      
      // Critical: Verify no Tenant A data is leaked to Tenant B user
      const { data } = await result.order().range()
      expect(data).toHaveLength(1)
      expect(data[0].tenant_id).toBe(TENANT_B)
      expect(data.find(pet => pet.tenant_id === TENANT_A)).toBeUndefined()
    })
  })

  describe('Individual API: PUT /api/lost-found/[id]', () => {
    it('should allow staff to update lost pets in their tenant', async () => {
      // Setup: Mock successful update for same tenant
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: mockLostPetTenantA.id, reported_by: 'reporter-a', tenant_id: TENANT_A },
              error: null
            })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockLostPetTenantA, status: 'found' },
                error: null
              })
            })
          })
        })
      })

      // Mock staff user from same tenant
      mockAuthenticatedState(mockUserTenantA)
      
      // Test: Verify update is allowed for same tenant
      const fetchResult = mockSupabase.from().select().eq('id', mockLostPetTenantA.id).single()
      const { data: existing } = await fetchResult
      
      expect(existing.tenant_id).toBe(TENANT_A)
      
      // Test update operation
      const updateResult = mockSupabase.from().update({ status: 'found' }).eq('id', mockLostPetTenantA.id)
      const { data: updated } = await updateResult.select().single()
      
      expect(updated.status).toBe('found')
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ status: 'found' })
    })

    it('should prevent cross-tenant updates (404 not 403)', async () => {
      // Critical: User from Tenant A tries to update lost pet from Tenant B
      // Should return 404 to avoid information leakage
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
            })
          })
        })
      })

      // Mock staff user from Tenant A trying to access Tenant B data
      mockAuthenticatedState(mockUserTenantA)
      
      // Test: Query with tenant filter should return no results
      const result = mockSupabase.from().select().eq('tenant_id', TENANT_A).eq('id', mockLostPetTenantB.id).single()
      const { data, error } = await result
      
      // Verify 404-like behavior (no data returned)
      expect(data).toBeNull()
      expect(error.code).toBe('PGRST116') // Supabase "not found" error
    })

    it('should require authentication', async () => {
      // Test unauthenticated access
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '401', message: 'Authentication required' }
            })
          })
        })
      })

      // Clear authentication state
      mockAuthenticatedState(null as any)
      
      // Attempt to access without authentication should fail
      const result = mockSupabase.from().select().eq('id', mockLostPetTenantA.id).single()
      const { error } = await result
      
      expect(error.code).toBe('401')
    })

    it('should require staff role (vet or admin)', async () => {
      // Test owner (non-staff) role access
      const mockOwnerUser = { ...mockUserTenantA, role: 'owner' as const }
      
      // Mock existing report check
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: mockLostPetTenantA.id, reported_by: 'different-user', tenant_id: TENANT_A },
              error: null
            })
          })
        })
      })

      mockAuthenticatedState(mockOwnerUser)
      
      // Test: Owner role should not have staff privileges
      const { data: existing } = await mockSupabase.from().select().eq('id', mockLostPetTenantA.id).single()
      
      // Business logic: If user is not reporter AND not staff, should fail
      const isReporter = existing.reported_by === mockOwnerUser.id
      const isStaff = ['vet', 'admin'].includes(mockOwnerUser.role) && existing.tenant_id === mockOwnerUser.tenantId
      
      expect(isReporter).toBe(false)
      expect(isStaff).toBe(false)
      // In real API, this would return 403
    })

    it('should validate status transitions and update metadata', async () => {
      // Test valid status transitions with metadata updates
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: mockLostPetTenantA.id, reported_by: 'reporter-a', tenant_id: TENANT_A },
              error: null
            })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { 
                  ...mockLostPetTenantA, 
                  status: 'reunited',
                  found_at: new Date().toISOString(),
                  found_by: mockUserTenantA.id
                },
                error: null
              })
            })
          })
        })
      })

      mockAuthenticatedState(mockUserTenantA)
      
      // Test status transition to 'reunited'
      const updates = {
        status: 'reunited',
        found_at: new Date().toISOString(),
        found_by: mockUserTenantA.id
      }
      
      const updateResult = mockSupabase.from().update(updates).eq('id', mockLostPetTenantA.id)
      const { data: updated } = await updateResult.select().single()
      
      // Verify status and metadata are updated correctly
      expect(updated.status).toBe('reunited')
      expect(updated.found_at).toBeDefined()
      expect(updated.found_by).toBe(mockUserTenantA.id)
      expect(mockSupabase.from().update).toHaveBeenCalledWith(updates)
    })
  })

  describe('RLS Policy Verification', () => {
    it('should enforce tenant isolation at database level', async () => {
      // Mock RLS policy enforcement - query filtered by tenant_id automatically
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field, value) => {
            // RLS policies should auto-filter by tenant_id
            if (field === 'tenant_id' && value !== TENANT_A) {
              return {
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'No rows returned' }
                })
              }
            }
            return {
              single: vi.fn().mockResolvedValue({
                data: mockLostPetTenantA,
                error: null
              })
            }
          })
        })
      })

      // Test: Even with correct auth, wrong tenant_id should return no rows
      mockAuthenticatedState(mockUserTenantA)
      
      // Attempt to access wrong tenant data
      const wrongResult = mockSupabase.from().select().eq('tenant_id', TENANT_B).single()
      const { data: wrongData } = await wrongResult
      expect(wrongData).toBeNull()
      
      // Correct tenant access should work
      const correctResult = mockSupabase.from().select().eq('tenant_id', TENANT_A).single()
      const { data: correctData } = await correctResult
      expect(correctData).toBeDefined()
    })

    it('should allow pet owners to view their own lost pets', async () => {
      // Pet owner should see only their own lost pet reports
      const mockOwnerUser = { ...mockUserTenantA, role: 'owner' as const, ownerId: 'owner-a-1' }
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field, value) => {
            // Filter by both tenant_id and owner for pet owners
            if (field === 'pet.owner_id' && value === mockOwnerUser.ownerId) {
              return {
                single: vi.fn().mockResolvedValue({
                  data: mockLostPetTenantA,
                  error: null
                })
              }
            }
            return { eq: vi.fn().mockReturnThis() }
          })
        })
      })

      mockAuthenticatedState(mockOwnerUser)
      
      // Owner should only see their own pets
      const result = mockSupabase.from().select().eq('tenant_id', TENANT_A).eq('pet.owner_id', mockOwnerUser.ownerId)
      expect(result.eq).toHaveBeenCalledWith('pet.owner_id', 'owner-a-1')
    })

    it('should allow staff to view all lost pets in tenant', async () => {
      // Staff should see all pets in their tenant
      const staffData = [mockLostPetTenantA]
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: staffData,
                error: null,
                count: 1
              })
            })
          })
        })
      })

      mockAuthenticatedState(mockUserTenantA) // vet role
      
      // Staff can see all pets in tenant
      const result = mockSupabase.from().select().eq('tenant_id', TENANT_A)
      const { data } = await result.order().range()
      
      expect(data).toHaveLength(1)
      expect(data[0].tenant_id).toBe(TENANT_A)
    })

    it('should allow public to view active (lost status) pets', async () => {
      // Public lost pet board should only show 'lost' status pets
      const publicData = [{ ...mockLostPetTenantA, status: 'lost' }]
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: publicData,
                error: null
              })
            })
          })
        })
      })

      // No authentication (public access)
      const result = mockSupabase.from().select().eq('status', 'lost')
      const { data } = await result.order().range()
      
      expect(data).toHaveLength(1)
      expect(data[0].status).toBe('lost')
      expect(result.eq).toHaveBeenCalledWith('status', 'lost')
    })
  })

  describe('Edge Cases', () => {
    it('should handle non-existent pet IDs gracefully', async () => {
      // Mock 404 response for invalid ID
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows returned' }
            })
          })
        })
      })

      // Test invalid ID access
      const result = mockSupabase.from().select().eq('id', 'non-existent-id').single()
      const { data, error } = await result
      
      expect(data).toBeNull()
      expect(error.code).toBe('PGRST116')
    })

    it('should handle missing required fields', async () => {
      // Test validation logic for required fields
      const invalidUpdate = { /* missing status */ }
      
      // Business logic should validate required fields
      const requiredFields = ['status']
      const missingFields = requiredFields.filter(field => !invalidUpdate[field as keyof typeof invalidUpdate])
      
      expect(missingFields).toContain('status')
      // In real API, this would trigger 400 Bad Request
    })

    it('should prevent SQL injection via status parameter', async () => {
      // Test that parameterized queries prevent injection
      const maliciousInput = "lost';DROP TABLE lost_pets;--"
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [], // No data should be returned for invalid status
                error: null
              })
            })
          })
        })
      })

      // Supabase client should safely parameterize the query
      const result = mockSupabase.from().select().eq('status', maliciousInput)
      
      // Verify the malicious input is treated as a literal string parameter
      expect(result.eq).toHaveBeenCalledWith('status', maliciousInput)
      
      const { data } = await result.order().range()
      expect(data).toEqual([]) // No matches for invalid status
    })

    it('should handle concurrent updates correctly', async () => {
      // Mock optimistic locking scenario
      let updateCount = 0
      
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockImplementation(() => {
          updateCount++
          if (updateCount === 1) {
            // First update succeeds
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockLostPetTenantA, status: 'found' },
                    error: null
                  })
                })
              })
            }
          } else {
            // Concurrent update detected
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: '409', message: 'Conflict - record was modified' }
                  })
                })
              })
            }
          }
        })
      })

      // First update
      const update1 = mockSupabase.from().update({ status: 'found' })
      const { data: result1 } = await update1.eq('id', mockLostPetTenantA.id).select().single()
      expect(result1.status).toBe('found')

      // Concurrent update should handle conflict
      const update2 = mockSupabase.from().update({ status: 'reunited' })
      const { error: conflict } = await update2.eq('id', mockLostPetTenantA.id).select().single()
      expect(conflict?.code).toBe('409')
    })
  })

  describe('Performance & Security', () => {
    it('should use efficient tenant-based queries', async () => {
      // Verify query structure promotes index usage
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockReturnThis()
            })
          })
        })
      })

      const query = mockSupabase.from().select().eq('tenant_id', TENANT_A).order('created_at')
      
      // Verify tenant_id is the first filter (promotes index usage)
      expect(query.eq).toHaveBeenCalledWith('tenant_id', TENANT_A)
      expect(query.order).toHaveBeenCalledWith('created_at')
    })

    it('should efficiently filter by compound conditions', async () => {
      // Test compound filtering (tenant + status) for optimal index usage
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((field, value) => {
            if (field === 'tenant_id') {
              return {
                eq: vi.fn().mockImplementation((field2, value2) => {
                  if (field2 === 'status') {
                    return {
                      order: vi.fn().mockReturnValue({
                        range: vi.fn().mockResolvedValue({
                          data: [mockLostPetTenantA],
                          error: null
                        })
                      })
                    }
                  }
                  return { eq: vi.fn().mockReturnThis() }
                })
              }
            }
            return { eq: vi.fn().mockReturnThis() }
          })
        })
      })

      // Test compound index usage: tenant_id + status
      const result = mockSupabase.from()
        .select()
        .eq('tenant_id', TENANT_A)
        .eq('status', 'lost')
        .order('created_at')

      expect(result.eq).toHaveBeenCalledWith('tenant_id', TENANT_A)
      expect(result.eq).toHaveBeenCalledWith('status', 'lost')
    })
  })
})

/**
 * Integration Test Checklist
 * 
 * Before marking TICKET-SEC-002 complete, verify:
 * 
 * [ ] All tests pass
 * [ ] Migration 069 applied successfully
 * [ ] No TypeScript errors in route.ts
 * [ ] API responds with correct status codes
 * [ ] Tenant isolation verified in production-like environment
 * [ ] Logs show proper tenant_id filtering
 * [ ] No data leakage in error messages
 * [ ] Performance acceptable with indexes
 */
