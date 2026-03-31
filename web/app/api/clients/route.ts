import { NextResponse } from 'next/server'
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth'
import { parsePagination, paginatedResponse } from '@/lib/api/pagination'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

interface Client {
  id: string
  full_name: string
  email: string
  phone: string | null
  created_at: string
  pet_count: number
  last_appointment: string | null
}

export const GET = withApiAuth(
  async ({ request, user, profile, supabase }: ApiHandlerContext) => {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const { page, limit, offset } = parsePagination(searchParams)
    const sortField = searchParams.get('sort') || 'created_at'
    const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc'
    const useRealtime = searchParams.get('realtime') === 'true'

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['full_name', 'email', 'created_at', 'pet_count', 'last_appointment']
    const validSortField = allowedSortFields.includes(sortField) ? sortField : 'created_at'

    try {
      // Option 1: Use materialized view (fast, but may be slightly stale)
      // Option 2: Use real-time aggregated query (slower, but always current)

      if (!useRealtime) {
        // ====================================================================
        // OPTIMIZED PATH: Use materialized view (single query)
        // ====================================================================

        // Map API field names to materialized view column names
        const sortFieldMap: Record<string, string> = {
          last_appointment: 'last_appointment_date',
          pet_count: 'pet_count',
          created_at: 'created_at',
          full_name: 'full_name',
          email: 'email',
        }

        const mvSortField = sortFieldMap[validSortField] || 'created_at'

        // Build query on materialized view
        let mvQuery = supabase
          .from('mv_client_summary')
          .select(
            'client_id, full_name, email, phone, created_at, pet_count, last_appointment_date',
            { count: 'exact' }
          )
          .eq('tenant_id', profile.tenant_id)

        // Apply search filter
        if (search.trim()) {
          mvQuery = mvQuery.or(
            `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
          )
        }

        // Get count first
        const { count: totalCount } = await mvQuery

        // Apply sorting and pagination
        mvQuery = mvQuery
          .order(mvSortField, { ascending: sortOrder === 'asc' })
          .range(offset, offset + limit - 1)

        const { data: mvClients, error: mvError } = await mvQuery

        if (mvError) {
          logger.error('Error fetching from materialized view', {
            tenantId: profile.tenant_id,
            userId: user.id,
            error: mvError.message,
          })
          // Fall through to real-time query below
        } else if (mvClients) {
          // Success! Map to expected format
          const clients: Client[] = mvClients.map((c) => ({
            id: c.client_id,
            full_name: c.full_name || '',
            email: c.email || '',
            phone: c.phone || null,
            created_at: c.created_at,
            pet_count: c.pet_count || 0,
            last_appointment: c.last_appointment_date || null,
          }))

          return NextResponse.json({
            clients,
            ...paginatedResponse(clients, totalCount || 0, { page, limit, offset }),
          })
        }
      }

      // ====================================================================
      // REAL-TIME PATH: Use aggregated query with JOINs
      // ====================================================================

      // This is a fallback or when realtime=true is specified
      // Uses a single aggregated query with proper JOINs

      // First get total count
      const { count: totalCount, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
        .eq('role', 'owner')
        .or(
          search.trim()
            ? `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
            : ''
        )

      if (countError) {
        logger.error('Error counting clients', {
          tenantId: profile.tenant_id,
          userId: user.id,
          error: countError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Use RPC function for aggregated data (if available) or fallback to manual aggregation
      // For now, we'll use a manual aggregation approach with a single query per client batch

      let baseQuery = supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .eq('tenant_id', profile.tenant_id)
        .eq('role', 'owner')

      if (search.trim()) {
        baseQuery = baseQuery.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        )
      }

      // For real-time, we can only sort by direct profile fields initially
      if (!['pet_count', 'last_appointment'].includes(validSortField)) {
        baseQuery = baseQuery.order(validSortField, { ascending: sortOrder === 'asc' })
      } else {
        baseQuery = baseQuery.order('created_at', { ascending: false })
      }

      baseQuery = baseQuery.range(offset, offset + limit - 1)

      const { data: clients, error: clientsError } = await baseQuery

      if (clientsError) {
        logger.error('Error fetching clients', {
          tenantId: profile.tenant_id,
          userId: user.id,
          error: clientsError.message,
        })
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      if (!clients || clients.length === 0) {
        return NextResponse.json({
          clients: [],
          ...paginatedResponse([], totalCount || 0, { page, limit, offset }),
        })
      }

      // Get aggregated data in a single optimized query
      const clientIds = clients.map((c) => c.id)

      // Single query to get pet counts using aggregation
      let petAggregates: { owner_id: string; pet_count: number }[] | null = null
      try {
        const { data } = await supabase.rpc('get_client_pet_counts', {
          client_ids: clientIds,
          p_tenant_id: profile.tenant_id,
        })
        petAggregates = data
      } catch (_error: unknown) {
        // RPC function may not exist, fall back to batch query
      }

      // Single query to get last appointments using aggregation
      let apptAggregates: { owner_id: string; last_appointment: string }[] | null = null
      try {
        const { data } = await supabase.rpc('get_client_last_appointments', {
          client_ids: clientIds,
          p_tenant_id: profile.tenant_id,
        })
        apptAggregates = data
      } catch (_error: unknown) {
        // RPC function may not exist, fall back to batch query
      }

      // If RPC functions don't exist, fall back to batch queries
      const petCountMap = new Map<string, number>()
      const lastAppointmentMap = new Map<string, string>()

      if (petAggregates) {
        petAggregates.forEach((row) => {
          petCountMap.set(row.owner_id, row.pet_count)
        })
      } else {
        // Fallback: batch query
        const { data: petCounts } = await supabase
          .from('pets')
          .select('owner_id')
          .in('owner_id', clientIds)
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)

        if (petCounts) {
          petCounts.forEach((pet) => {
            const count = petCountMap.get(pet.owner_id) || 0
            petCountMap.set(pet.owner_id, count + 1)
          })
        }
      }

      if (apptAggregates) {
        apptAggregates.forEach((row) => {
          lastAppointmentMap.set(row.owner_id, row.last_appointment)
        })
      } else {
        // Fallback: get appointments via pets
        const { data: lastAppts } = await supabase
          .from('appointments')
          .select('pet_id, start_time, pets!inner(owner_id)')
          .in('pets.owner_id', clientIds)
          .eq('tenant_id', profile.tenant_id)
          .is('deleted_at', null)
          .order('start_time', { ascending: false })

        if (lastAppts) {
          const processedOwners = new Set<string>()
          lastAppts.forEach((appt) => {
            // pets is an array when using !inner join
            const pets = appt.pets as { owner_id: string }[] | null
            const ownerId = pets?.[0]?.owner_id
            if (ownerId && !processedOwners.has(ownerId)) {
              lastAppointmentMap.set(ownerId, appt.start_time)
              processedOwners.add(ownerId)
            }
          })
        }
      }

      // Combine data
      const enrichedClients: Client[] = clients.map((client) => ({
        id: client.id,
        full_name: client.full_name || '',
        email: client.email || '',
        phone: client.phone || null,
        created_at: client.created_at,
        pet_count: petCountMap.get(client.id) || 0,
        last_appointment: lastAppointmentMap.get(client.id) || null,
      }))

      // Apply sorting for aggregated fields
      if (validSortField === 'pet_count') {
        enrichedClients.sort((a, b) => {
          const diff = a.pet_count - b.pet_count
          return sortOrder === 'asc' ? diff : -diff
        })
      } else if (validSortField === 'last_appointment') {
        enrichedClients.sort((a, b) => {
          if (!a.last_appointment && !b.last_appointment) return 0
          if (!a.last_appointment) return sortOrder === 'asc' ? 1 : -1
          if (!b.last_appointment) return sortOrder === 'asc' ? -1 : 1
          const diff =
            new Date(a.last_appointment).getTime() - new Date(b.last_appointment).getTime()
          return sortOrder === 'asc' ? diff : -diff
        })
      }

      return NextResponse.json({
        clients: enrichedClients,
        ...paginatedResponse(enrichedClients, totalCount || 0, { page, limit, offset }),
      })
    } catch (error: unknown) {
      logger.error('Unexpected error in clients API', {
        tenantId: profile.tenant_id,
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return apiError('SERVER_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  },
  { roles: ['vet', 'admin'], rateLimit: 'search' }
)
