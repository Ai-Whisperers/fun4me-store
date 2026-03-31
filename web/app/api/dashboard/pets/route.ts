import { NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

// GET /api/dashboard/pets - Get recent pets for the clinic dashboard
export const GET = withApiAuth(
  async ({ profile, supabase, request }) => {
    try {
      const { searchParams } = new URL(request.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

      const { data, error } = await supabase
        .from('pets')
        .select(
          `
        id,
        name,
        species,
        breed,
        photo_url,
        created_at,
        owner:profiles!pets_owner_id_fkey (
          id,
          full_name,
          phone
        )
      `
        )
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
          details: { message: error.message },
        })
      }

      // Format response to match expected structure
      const pets = (data || []).map((pet) => {
        const owner = Array.isArray(pet.owner) ? pet.owner[0] : pet.owner
        return {
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          photo_url: pet.photo_url,
          created_at: pet.created_at,
          owner_name: owner?.full_name || 'Sin dueño',
          owner_phone: owner?.phone,
        }
      })

      return NextResponse.json({ data: pets, pets })
    } catch (error) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
        details: { message: error instanceof Error ? error.message : 'Unknown error' },
      })
    }
  },
  { roles: ['vet', 'admin'] }
)
