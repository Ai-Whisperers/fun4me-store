'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Check, Search, MapPin, PawPrint } from 'lucide-react'

interface LostPet {
  id: string
  pet_id: string
  status: string
  last_seen_location: string
  last_seen_date: string
  finder_contact?: string
  pets: {
    name: string
    photo_url: string
    species: string
    breed: string
    profiles: {
      full_name: string
      phone: string
    }
  }
}

export function LostFoundWidget() {
  const [lostPets, setLostPets] = useState<LostPet[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchLostPets = async () => {
      try {
        // Get current user's clinic ID
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (!profile) return

        // Fetch lost pets in this clinic (tenant) with full joins
        const { data, error } = await supabase
          .from('lost_pets')
          .select(
            `
                        *,
                        pets!inner (
                            name,
                            photo_url,
                            species,
                            breed,
                            tenant_id,
                            profiles!owner_id (
                                full_name,
                                phone
                            )
                        )
                    `
          )
          .eq('pets.tenant_id', profile.tenant_id)
          .neq('status', 'reunited')
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) throw error
        setLostPets((data as LostPet[]) || [])
      } catch (_error: unknown) {
        // Error fetching lost pets - silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchLostPets()
  }, [])

  if (loading) return <div className="h-48 animate-pulse rounded-3xl bg-[var(--bg-subtle)]" />

  if (lostPets.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-[var(--border-light,#f3f4f6)] bg-[var(--bg-paper)] p-6 text-center shadow-sm">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--status-success-bg,#dcfce7)]">
          <Check className="h-6 w-6 text-[var(--status-success,#22c55e)]" />
        </div>
        <h3 className="font-bold text-[var(--text-primary)]">Sin Reportes</h3>
        <p className="text-sm text-[var(--text-secondary)]">No hay mascotas perdidas activas.</p>
      </div>
    )
  }

  return (
    <div className="h-full rounded-3xl border border-[var(--border-light,#f3f4f6)] bg-[var(--bg-paper)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-black text-[var(--text-primary)]">
          <Search className="h-5 w-5 text-[var(--status-error,#ef4444)]" />
          Mascotas Perdidas
        </h3>
        <span className="rounded-full bg-[var(--status-error-bg,#fef2f2)] px-2 py-1 text-xs font-bold text-[var(--status-error,#ef4444)]">
          {lostPets.length} Activos
        </span>
      </div>

      <div className="space-y-4">
        {lostPets.map((report) => (
          <div
            key={report.id}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--status-error-bg,#fef2f2)] bg-[var(--status-error-bg,#fef2f2)]/50 p-3 transition-colors hover:bg-[var(--status-error-bg,#fef2f2)]"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-subtle)]">
              {report.pets.photo_url ? (
                <img src={report.pets.photo_url} alt={`Foto de ${report.pets.name}, mascota perdida`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--bg-paper)]">
                  <PawPrint className="h-6 w-6 text-[var(--text-muted)]" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <h4 className="truncate font-bold text-[var(--text-primary)]">{report.pets.name}</h4>
                {report.status === 'found' && (
                  <span className="rounded bg-[var(--status-success-bg,#dcfce7)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--status-success,#22c55e)]">
                    Encontrado
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                Props: {report.pets.profiles.full_name}
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--status-error,#ef4444)]">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{report.last_seen_location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
