/**
 * Safety Repository
 *
 * Data access layer for lost pets, sightings, matches, and disease reports.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  LostPet,
  LostPetFilters,
  ReportLostPetInput,
  UpdateLostPetInput,
  PetSighting,
  ReportSightingInput,
  PetMatchSuggestion,
  MatchStatus,
  DiseaseReport,
  DiseaseReportFilters,
  CreateDiseaseReportInput,
  DiseaseAlert,
} from './types'

export class SafetyRepository {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================================================
  // LOST PETS
  // ===========================================================================

  async findLostPets(tenantId: string, filters: LostPetFilters = {}): Promise<LostPet[]> {
    let query = this.supabase
      .from('lost_pets')
      .select(
        `
        *,
        pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
      `
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.is_public !== undefined) {
      query = query.eq('is_public', filters.is_public)
    }

    if (filters.from_date) {
      query = query.gte('created_at', filters.from_date)
    }

    if (filters.to_date) {
      query = query.lte('created_at', filters.to_date)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar mascotas perdidas: ${error.message}`)
    return (data || []) as LostPet[]
  }

  async findLostPetById(reportId: string): Promise<LostPet | null> {
    const { data, error } = await this.supabase
      .from('lost_pets')
      .select(
        `
        *,
        pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
      `
      )
      .eq('id', reportId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al cargar reporte: ${error.message}`)
    }

    return data as LostPet
  }

  async findLostPetByPetId(petId: string): Promise<LostPet | null> {
    const { data, error } = await this.supabase
      .from('lost_pets')
      .select(
        `
        *,
        pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
      `
      )
      .eq('pet_id', petId)
      .eq('status', 'lost')
      .maybeSingle()

    if (error) throw new Error(`Error al cargar reporte: ${error.message}`)
    return data as LostPet | null
  }

  async checkExistingLostReport(petId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('lost_pets')
      .select('id')
      .eq('pet_id', petId)
      .eq('status', 'lost')
      .maybeSingle()

    return !!data
  }

  async createLostPetReport(
    tenantId: string,
    input: ReportLostPetInput,
    reportedBy: string
  ): Promise<LostPet> {
    const { data, error } = await this.supabase
      .from('lost_pets')
      .insert({
        tenant_id: tenantId,
        pet_id: input.pet_id,
        status: 'lost',
        last_seen_location: input.last_seen_location,
        last_seen_lat: input.last_seen_lat,
        last_seen_lng: input.last_seen_lng,
        last_seen_at: input.last_seen_at ?? new Date().toISOString(),
        contact_phone: input.contact_phone,
        contact_email: input.contact_email,
        notes: input.notes,
        description: input.description,
        distinctive_features: input.distinctive_features,
        wearing: input.wearing,
        reward_offered: input.reward_offered ?? false,
        reward_amount: input.reward_amount,
        is_public: input.is_public ?? true,
        photos: input.photos ?? [],
        reported_by: reportedBy,
      })
      .select(
        `
        *,
        pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
      `
      )
      .single()

    if (error) throw new Error(`Error al reportar mascota: ${error.message}`)
    return data as LostPet
  }

  async updateLostPet(reportId: string, updates: UpdateLostPetInput): Promise<LostPet> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.last_seen_location !== undefined)
      updateData.last_seen_location = updates.last_seen_location
    if (updates.last_seen_lat !== undefined) updateData.last_seen_lat = updates.last_seen_lat
    if (updates.last_seen_lng !== undefined) updateData.last_seen_lng = updates.last_seen_lng
    if (updates.last_seen_at !== undefined) updateData.last_seen_at = updates.last_seen_at
    if (updates.contact_phone !== undefined) updateData.contact_phone = updates.contact_phone
    if (updates.contact_email !== undefined) updateData.contact_email = updates.contact_email
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.distinctive_features !== undefined)
      updateData.distinctive_features = updates.distinctive_features
    if (updates.wearing !== undefined) updateData.wearing = updates.wearing
    if (updates.reward_offered !== undefined) updateData.reward_offered = updates.reward_offered
    if (updates.reward_amount !== undefined) updateData.reward_amount = updates.reward_amount
    if (updates.is_public !== undefined) updateData.is_public = updates.is_public
    if (updates.photos !== undefined) updateData.photos = updates.photos
    if (updates.found_location !== undefined) updateData.found_location = updates.found_location

    const { data, error } = await this.supabase
      .from('lost_pets')
      .update(updateData)
      .eq('id', reportId)
      .select(
        `
        *,
        pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
      `
      )
      .single()

    if (error) throw new Error(`Error al actualizar reporte: ${error.message}`)
    return data as LostPet
  }

  async markPetFound(reportId: string, foundLocation: string | null, foundBy: string): Promise<LostPet> {
    const { data, error } = await this.supabase
      .from('lost_pets')
      .update({
        status: 'found',
        found_at: new Date().toISOString(),
        found_location: foundLocation,
        found_by: foundBy,
      })
      .eq('id', reportId)
      .select(
        `
        *,
        pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
      `
      )
      .single()

    if (error) throw new Error(`Error al marcar como encontrada: ${error.message}`)
    return data as LostPet
  }

  async markPetReunited(reportId: string): Promise<LostPet> {
    const { data, error } = await this.supabase
      .from('lost_pets')
      .update({ status: 'reunited' })
      .eq('id', reportId)
      .select(
        `
        *,
        pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
      `
      )
      .single()

    if (error) throw new Error(`Error al marcar como reunida: ${error.message}`)
    return data as LostPet
  }

  // ===========================================================================
  // SIGHTINGS
  // ===========================================================================

  async findSightings(lostPetId: string): Promise<PetSighting[]> {
    const { data, error } = await this.supabase
      .from('pet_sightings')
      .select('*')
      .eq('lost_pet_id', lostPetId)
      .order('sighting_date', { ascending: false })

    if (error) throw new Error(`Error al cargar avistamientos: ${error.message}`)
    return (data || []) as PetSighting[]
  }

  async createSighting(input: ReportSightingInput): Promise<PetSighting> {
    const { data, error } = await this.supabase
      .from('pet_sightings')
      .insert({
        lost_pet_id: input.lost_pet_id,
        reporter_name: input.reporter_name,
        reporter_email: input.reporter_email,
        reporter_phone: input.reporter_phone,
        sighting_date: input.sighting_date ?? new Date().toISOString(),
        sighting_location: input.sighting_location,
        sighting_lat: input.sighting_lat,
        sighting_lng: input.sighting_lng,
        description: input.description,
        photo_url: input.photo_url,
        is_verified: false,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al reportar avistamiento: ${error.message}`)
    return data as PetSighting
  }

  async verifySighting(sightingId: string, verifiedBy: string): Promise<PetSighting> {
    const { data, error } = await this.supabase
      .from('pet_sightings')
      .update({
        is_verified: true,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .eq('id', sightingId)
      .select()
      .single()

    if (error) throw new Error(`Error al verificar avistamiento: ${error.message}`)
    return data as PetSighting
  }

  async deleteSighting(sightingId: string): Promise<void> {
    const { error } = await this.supabase.from('pet_sightings').delete().eq('id', sightingId)

    if (error) throw new Error(`Error al eliminar avistamiento: ${error.message}`)
  }

  // ===========================================================================
  // MATCH SUGGESTIONS
  // ===========================================================================

  async findMatchSuggestions(lostPetId: string): Promise<PetMatchSuggestion[]> {
    const { data, error } = await this.supabase
      .from('pet_match_suggestions')
      .select(
        `
        *,
        lost_report:lost_pets!lost_report_id(*),
        found_report:lost_pets!found_report_id(*)
      `
      )
      .eq('lost_report_id', lostPetId)
      .order('confidence_score', { ascending: false })

    if (error) throw new Error(`Error al cargar coincidencias: ${error.message}`)
    return (data || []) as PetMatchSuggestion[]
  }

  async findPendingMatches(tenantId: string): Promise<PetMatchSuggestion[]> {
    const { data, error } = await this.supabase
      .from('pet_match_suggestions')
      .select(
        `
        *,
        lost_report:lost_pets!lost_report_id(*, pet:pets(*)),
        found_report:lost_pets!found_report_id(*, pet:pets(*))
      `
      )
      .eq('status', 'pending')
      .eq('lost_report.tenant_id', tenantId)
      .order('confidence_score', { ascending: false })

    if (error) throw new Error(`Error al obtener coincidencias pendientes: ${error.message}`)
    return (data || []) as PetMatchSuggestion[]
  }

  async reviewMatch(
    matchId: string,
    status: MatchStatus,
    reviewNotes: string | null,
    reviewedBy: string
  ): Promise<PetMatchSuggestion> {
    const { data, error } = await this.supabase
      .from('pet_match_suggestions')
      .update({
        status,
        review_notes: reviewNotes,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .select()
      .single()

    if (error) throw new Error(`Error al revisar coincidencia: ${error.message}`)
    return data as PetMatchSuggestion
  }

  async updateLostReportStatusReunited(reportId: string): Promise<void> {
    const { error } = await this.supabase
      .from('lost_pets')
      .update({ status: 'reunited' })
      .eq('id', reportId)

    if (error) throw new Error(`Error al actualizar estado: ${error.message}`)
  }

  // ===========================================================================
  // DISEASE REPORTS
  // ===========================================================================

  async findDiseaseReports(
    tenantId: string,
    filters: DiseaseReportFilters = {}
  ): Promise<DiseaseReport[]> {
    let query = this.supabase
      .from('disease_reports')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('case_date', { ascending: false })

    if (filters.diagnosis_code) {
      query = query.eq('diagnosis_code', filters.diagnosis_code)
    }

    if (filters.species) {
      query = query.eq('species', filters.species)
    }

    if (filters.location_zone) {
      query = query.eq('location_zone', filters.location_zone)
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }

    if (filters.outcome) {
      query = query.eq('outcome', filters.outcome)
    }

    if (filters.is_notifiable !== undefined) {
      query = query.eq('is_notifiable', filters.is_notifiable)
    }

    if (filters.lab_confirmed !== undefined) {
      query = query.eq('lab_confirmed', filters.lab_confirmed)
    }

    if (filters.from_date) {
      query = query.gte('case_date', filters.from_date)
    }

    if (filters.to_date) {
      query = query.lte('case_date', filters.to_date)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar reportes de enfermedad: ${error.message}`)
    return (data || []) as DiseaseReport[]
  }

  async findDiseaseReportById(reportId: string): Promise<DiseaseReport | null> {
    const { data, error } = await this.supabase
      .from('disease_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al cargar reporte: ${error.message}`)
    }

    return data as DiseaseReport
  }

  async createDiseaseReport(
    tenantId: string,
    input: CreateDiseaseReportInput,
    reportedBy: string
  ): Promise<DiseaseReport> {
    const { data, error } = await this.supabase
      .from('disease_reports')
      .insert({
        tenant_id: tenantId,
        diagnosis_code: input.diagnosis_code,
        diagnosis_name: input.diagnosis_name,
        species: input.species,
        location_zone: input.location_zone,
        latitude: input.latitude,
        longitude: input.longitude,
        case_date: input.case_date ?? new Date().toISOString().split('T')[0],
        case_count: input.case_count ?? 1,
        outcome: input.outcome,
        severity: input.severity,
        pet_age_months: input.pet_age_months,
        pet_breed: input.pet_breed,
        pet_sex: input.pet_sex,
        lab_confirmed: input.lab_confirmed ?? false,
        lab_order_id: input.lab_order_id,
        is_notifiable: input.is_notifiable ?? false,
        notes: input.notes,
        reported_by: reportedBy,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al crear reporte: ${error.message}`)
    return data as DiseaseReport
  }

  async markDiseaseNotified(reportId: string): Promise<DiseaseReport> {
    const { data, error } = await this.supabase
      .from('disease_reports')
      .update({
        notified_authority: true,
        notified_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single()

    if (error) throw new Error(`Error al marcar notificación: ${error.message}`)
    return data as DiseaseReport
  }

  async getDiseaseAlerts(
    tenantId: string,
    days: number,
    threshold: number
  ): Promise<DiseaseAlert[]> {
    const { data, error } = await this.supabase.rpc('get_disease_alerts', {
      p_tenant_id: tenantId,
      p_days: days,
      p_threshold: threshold,
    })

    if (error) throw new Error(`Error al obtener alertas: ${error.message}`)
    return (data || []) as DiseaseAlert[]
  }

  async getDiseaseReportsForZoneStats(
    tenantId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<
    Array<{ location_zone: string | null; diagnosis_name: string; species: string; case_count: number }>
  > {
    let query = this.supabase
      .from('disease_reports')
      .select('location_zone, diagnosis_name, species, case_count')
      .eq('tenant_id', tenantId)

    if (fromDate) {
      query = query.gte('case_date', fromDate)
    }

    if (toDate) {
      query = query.lte('case_date', toDate)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al obtener datos: ${error.message}`)
    return data || []
  }

  async getPendingNotifications(tenantId: string): Promise<DiseaseReport[]> {
    const { data, error } = await this.supabase
      .from('disease_reports')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_notifiable', true)
      .eq('notified_authority', false)
      .order('case_date', { ascending: false })

    if (error) throw new Error(`Error al obtener notificaciones pendientes: ${error.message}`)
    return (data || []) as DiseaseReport[]
  }
}
