/**
 * Safety & Public Health Service
 *
 * Handles lost pet tracking, sighting reports, match suggestions,
 * and disease surveillance/epidemiology reporting.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseService, ServiceResult } from './base-service';

// =============================================================================
// TYPES
// =============================================================================

// Lost pet status
export type LostPetStatus = 'lost' | 'found' | 'reunited';

// Match suggestion status
export type MatchStatus = 'pending' | 'reviewing' | 'confirmed' | 'rejected';

// Disease outcome
export type DiseaseOutcome = 'recovered' | 'deceased' | 'ongoing' | 'unknown';

// Disease severity
export type DiseaseSeverity = 'mild' | 'moderate' | 'severe' | 'critical';

// Lost pet report
export interface LostPet {
  id: string;
  pet_id: string;
  tenant_id: string;
  status: LostPetStatus;
  last_seen_location: string | null;
  last_seen_lat: number | null;
  last_seen_lng: number | null;
  last_seen_at: string | null;
  reported_by: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  found_at: string | null;
  found_location: string | null;
  found_by: string | null;
  notes: string | null;
  // Extended fields
  description: string | null;
  distinctive_features: string | null;
  wearing: string | null;
  reward_offered: boolean;
  reward_amount: number | null;
  is_public: boolean;
  share_url: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  pet?: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    color: string | null;
    photo_url: string | null;
    microchip_number: string | null;
    owner_id: string;
  };
}

// Pet sighting report
export interface PetSighting {
  id: string;
  lost_pet_id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  sighting_date: string;
  sighting_location: string;
  sighting_lat: number | null;
  sighting_lng: number | null;
  description: string | null;
  photo_url: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

// Match suggestion between lost and found pets
export interface PetMatchSuggestion {
  id: string;
  lost_report_id: string;
  found_report_id: string | null;
  found_pet_id: string | null;
  confidence_score: number;
  match_reasons: MatchReason[];
  status: MatchStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  lost_report?: LostPet;
  found_report?: LostPet;
}

export interface MatchReason {
  type: 'breed' | 'color' | 'location' | 'microchip' | 'features' | 'species';
  score: number;
  description: string;
}

// Disease report for epidemiology
export interface DiseaseReport {
  id: string;
  tenant_id: string;
  diagnosis_code: string | null;
  diagnosis_name: string;
  species: string;
  location_zone: string | null;
  latitude: number | null;
  longitude: number | null;
  case_date: string;
  case_count: number;
  outcome: DiseaseOutcome | null;
  severity: DiseaseSeverity | null;
  pet_age_months: number | null;
  pet_breed: string | null;
  pet_sex: string | null;
  reported_by: string | null;
  lab_confirmed: boolean;
  lab_order_id: string | null;
  is_notifiable: boolean;
  notified_authority: boolean;
  notified_at: string | null;
  notes: string | null;
  created_at: string;
}

// Disease alert (aggregated)
export interface DiseaseAlert {
  diagnosis_code: string;
  diagnosis_name: string;
  species: string;
  case_count: number;
  first_case: string;
  last_case: string;
  location_zone: string | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface ReportLostPetData {
  pet_id: string;
  last_seen_location?: string;
  last_seen_lat?: number;
  last_seen_lng?: number;
  last_seen_at?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  description?: string;
  distinctive_features?: string;
  wearing?: string;
  reward_offered?: boolean;
  reward_amount?: number;
  is_public?: boolean;
  photos?: string[];
}

export interface UpdateLostPetData {
  status?: LostPetStatus;
  last_seen_location?: string;
  last_seen_lat?: number;
  last_seen_lng?: number;
  last_seen_at?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  description?: string;
  distinctive_features?: string;
  wearing?: string;
  reward_offered?: boolean;
  reward_amount?: number;
  is_public?: boolean;
  photos?: string[];
  found_location?: string;
}

export interface ReportSightingData {
  lost_pet_id: string;
  reporter_name?: string;
  reporter_email?: string;
  reporter_phone?: string;
  sighting_date?: string;
  sighting_location: string;
  sighting_lat?: number;
  sighting_lng?: number;
  description?: string;
  photo_url?: string;
}

export interface ReviewMatchData {
  status: MatchStatus;
  review_notes?: string;
}

export interface CreateDiseaseReportData {
  diagnosis_code?: string;
  diagnosis_name: string;
  species: string;
  location_zone?: string;
  latitude?: number;
  longitude?: number;
  case_date?: string;
  case_count?: number;
  outcome?: DiseaseOutcome;
  severity?: DiseaseSeverity;
  pet_age_months?: number;
  pet_breed?: string;
  pet_sex?: string;
  lab_confirmed?: boolean;
  lab_order_id?: string;
  is_notifiable?: boolean;
  notes?: string;
}

export interface LostPetFilters {
  status?: LostPetStatus;
  species?: string;
  is_public?: boolean;
  near_lat?: number;
  near_lng?: number;
  radius_km?: number;
  from_date?: string;
  to_date?: string;
}

export interface DiseaseReportFilters {
  diagnosis_code?: string;
  species?: string;
  location_zone?: string;
  severity?: DiseaseSeverity;
  outcome?: DiseaseOutcome;
  from_date?: string;
  to_date?: string;
  is_notifiable?: boolean;
  lab_confirmed?: boolean;
}

// =============================================================================
// SERVICE
// =============================================================================

export class SafetyService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  // ===========================================================================
  // LOST PET METHODS
  // ===========================================================================

  /**
   * List lost pet reports for a tenant
   */
  async listLostPets(
    tenantId: string,
    filters: LostPetFilters = {}
  ): Promise<ServiceResult<LostPet[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('lost_pets')
        .select(
          `
          *,
          pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
        `
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.species) {
        query = query.eq('pet.species', filters.species);
      }

      if (filters.is_public !== undefined) {
        query = query.eq('is_public', filters.is_public);
      }

      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }

      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data as LostPet[];

      // Filter by location if coordinates provided
      if (filters.near_lat && filters.near_lng && filters.radius_km) {
        // Non-null assertions safe: if condition ensures all filter values exist
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        results = results.filter((report) => {
          if (!report.last_seen_lat || !report.last_seen_lng) return false;
          const distance = this.calculateDistanceKm(
            filters.near_lat!,
            filters.near_lng!,
            report.last_seen_lat,
            report.last_seen_lng
          );
          return distance <= filters.radius_km!;
        });
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
      }

      return results;
    }, 'Error al listar mascotas perdidas');
  }

  /**
   * List public lost pet reports (for public page)
   */
  async listPublicLostPets(
    tenantId: string,
    filters: LostPetFilters = {}
  ): Promise<ServiceResult<LostPet[]>> {
    return this.listLostPets(tenantId, {
      ...filters,
      status: 'lost',
      is_public: true,
    });
  }

  /**
   * Get a single lost pet report
   */
  async getLostPet(reportId: string): Promise<ServiceResult<LostPet>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('lost_pets')
        .select(
          `
          *,
          pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
        `
        )
        .eq('id', reportId)
        .single();

      if (error) throw error;
      return data as LostPet;
    }, 'Error al obtener reporte de mascota perdida');
  }

  /**
   * Get lost pet report for a specific pet
   */
  async getLostPetByPetId(petId: string): Promise<ServiceResult<LostPet | null>> {
    return this.handleError(async () => {
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
        .maybeSingle();

      if (error) throw error;
      return data as LostPet | null;
    }, 'Error al obtener reporte de mascota');
  }

  /**
   * Report a pet as lost
   */
  async reportLostPet(
    tenantId: string,
    data: ReportLostPetData,
    reportedBy: string
  ): Promise<ServiceResult<LostPet>> {
    return this.handleError(async () => {
      // Check if there's already an active lost report for this pet
      const { data: existing } = await this.supabase
        .from('lost_pets')
        .select('id')
        .eq('pet_id', data.pet_id)
        .eq('status', 'lost')
        .maybeSingle();

      if (existing) {
        throw new Error('Ya existe un reporte activo para esta mascota');
      }

      const { data: report, error } = await this.supabase
        .from('lost_pets')
        .insert({
          tenant_id: tenantId,
          pet_id: data.pet_id,
          status: 'lost',
          last_seen_location: data.last_seen_location,
          last_seen_lat: data.last_seen_lat,
          last_seen_lng: data.last_seen_lng,
          last_seen_at: data.last_seen_at ?? new Date().toISOString(),
          contact_phone: data.contact_phone,
          contact_email: data.contact_email,
          notes: data.notes,
          description: data.description,
          distinctive_features: data.distinctive_features,
          wearing: data.wearing,
          reward_offered: data.reward_offered ?? false,
          reward_amount: data.reward_amount,
          is_public: data.is_public ?? true,
          photos: data.photos ?? [],
          reported_by: reportedBy,
        })
        .select(
          `
          *,
          pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
        `
        )
        .single();

      if (error) throw error;
      return report as LostPet;
    }, 'Error al reportar mascota perdida');
  }

  /**
   * Update a lost pet report
   */
  async updateLostPet(
    reportId: string,
    data: UpdateLostPetData
  ): Promise<ServiceResult<LostPet>> {
    return this.handleError(async () => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (data.status !== undefined) updateData.status = data.status;
      if (data.last_seen_location !== undefined) {
        updateData.last_seen_location = data.last_seen_location;
      }
      if (data.last_seen_lat !== undefined) updateData.last_seen_lat = data.last_seen_lat;
      if (data.last_seen_lng !== undefined) updateData.last_seen_lng = data.last_seen_lng;
      if (data.last_seen_at !== undefined) updateData.last_seen_at = data.last_seen_at;
      if (data.contact_phone !== undefined) updateData.contact_phone = data.contact_phone;
      if (data.contact_email !== undefined) updateData.contact_email = data.contact_email;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.distinctive_features !== undefined) {
        updateData.distinctive_features = data.distinctive_features;
      }
      if (data.wearing !== undefined) updateData.wearing = data.wearing;
      if (data.reward_offered !== undefined) updateData.reward_offered = data.reward_offered;
      if (data.reward_amount !== undefined) updateData.reward_amount = data.reward_amount;
      if (data.is_public !== undefined) updateData.is_public = data.is_public;
      if (data.photos !== undefined) updateData.photos = data.photos;
      if (data.found_location !== undefined) updateData.found_location = data.found_location;

      const { data: report, error } = await this.supabase
        .from('lost_pets')
        .update(updateData)
        .eq('id', reportId)
        .select(
          `
          *,
          pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
        `
        )
        .single();

      if (error) throw error;
      return report as LostPet;
    }, 'Error al actualizar reporte de mascota perdida');
  }

  /**
   * Mark a lost pet as found
   */
  async markPetFound(
    reportId: string,
    foundLocation: string | null,
    foundBy: string
  ): Promise<ServiceResult<LostPet>> {
    return this.handleError(async () => {
      const { data: report, error } = await this.supabase
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
        .single();

      if (error) throw error;
      return report as LostPet;
    }, 'Error al marcar mascota como encontrada');
  }

  /**
   * Mark a lost pet as reunited with owner
   */
  async markPetReunited(reportId: string): Promise<ServiceResult<LostPet>> {
    return this.handleError(async () => {
      const { data: report, error } = await this.supabase
        .from('lost_pets')
        .update({
          status: 'reunited',
        })
        .eq('id', reportId)
        .select(
          `
          *,
          pet:pets(id, name, species, breed, color, photo_url, microchip_number, owner_id)
        `
        )
        .single();

      if (error) throw error;
      return report as LostPet;
    }, 'Error al marcar mascota como reunida');
  }

  // ===========================================================================
  // SIGHTING METHODS
  // ===========================================================================

  /**
   * List sightings for a lost pet
   */
  async listSightings(lostPetId: string): Promise<ServiceResult<PetSighting[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('pet_sightings')
        .select('*')
        .eq('lost_pet_id', lostPetId)
        .order('sighting_date', { ascending: false });

      if (error) throw error;
      return data as PetSighting[];
    }, 'Error al listar avistamientos');
  }

  /**
   * Report a sighting of a lost pet (public endpoint)
   */
  async reportSighting(data: ReportSightingData): Promise<ServiceResult<PetSighting>> {
    return this.handleError(async () => {
      const { data: sighting, error } = await this.supabase
        .from('pet_sightings')
        .insert({
          lost_pet_id: data.lost_pet_id,
          reporter_name: data.reporter_name,
          reporter_email: data.reporter_email,
          reporter_phone: data.reporter_phone,
          sighting_date: data.sighting_date ?? new Date().toISOString(),
          sighting_location: data.sighting_location,
          sighting_lat: data.sighting_lat,
          sighting_lng: data.sighting_lng,
          description: data.description,
          photo_url: data.photo_url,
          is_verified: false,
        })
        .select()
        .single();

      if (error) throw error;
      return sighting as PetSighting;
    }, 'Error al reportar avistamiento');
  }

  /**
   * Verify a sighting report
   */
  async verifySighting(
    sightingId: string,
    verifiedBy: string
  ): Promise<ServiceResult<PetSighting>> {
    return this.handleError(async () => {
      const { data: sighting, error } = await this.supabase
        .from('pet_sightings')
        .update({
          is_verified: true,
          verified_by: verifiedBy,
          verified_at: new Date().toISOString(),
        })
        .eq('id', sightingId)
        .select()
        .single();

      if (error) throw error;
      return sighting as PetSighting;
    }, 'Error al verificar avistamiento');
  }

  /**
   * Delete a sighting report
   */
  async deleteSighting(sightingId: string): Promise<ServiceResult<void>> {
    return this.handleError(async () => {
      const { error } = await this.supabase
        .from('pet_sightings')
        .delete()
        .eq('id', sightingId);

      if (error) throw error;
    }, 'Error al eliminar avistamiento');
  }

  // ===========================================================================
  // MATCH SUGGESTION METHODS
  // ===========================================================================

  /**
   * List match suggestions for a lost pet
   */
  async listMatchSuggestions(
    lostPetId: string
  ): Promise<ServiceResult<PetMatchSuggestion[]>> {
    return this.handleError(async () => {
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
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      return data as PetMatchSuggestion[];
    }, 'Error al listar coincidencias sugeridas');
  }

  /**
   * Get pending match suggestions for a tenant
   */
  async getPendingMatches(
    tenantId: string
  ): Promise<ServiceResult<PetMatchSuggestion[]>> {
    return this.handleError(async () => {
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
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      return data as PetMatchSuggestion[];
    }, 'Error al obtener coincidencias pendientes');
  }

  /**
   * Review a match suggestion
   */
  async reviewMatch(
    matchId: string,
    data: ReviewMatchData,
    reviewedBy: string
  ): Promise<ServiceResult<PetMatchSuggestion>> {
    return this.handleError(async () => {
      const { data: match, error } = await this.supabase
        .from('pet_match_suggestions')
        .update({
          status: data.status,
          review_notes: data.review_notes,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;

      // If confirmed, update both reports
      if (data.status === 'confirmed') {
        const suggestion = match as PetMatchSuggestion;
        if (suggestion.lost_report_id) {
          await this.supabase
            .from('lost_pets')
            .update({ status: 'reunited' })
            .eq('id', suggestion.lost_report_id);
        }
        if (suggestion.found_report_id) {
          await this.supabase
            .from('lost_pets')
            .update({ status: 'reunited' })
            .eq('id', suggestion.found_report_id);
        }
      }

      return match as PetMatchSuggestion;
    }, 'Error al revisar coincidencia');
  }

  // ===========================================================================
  // DISEASE REPORT METHODS
  // ===========================================================================

  /**
   * List disease reports for a tenant
   */
  async listDiseaseReports(
    tenantId: string,
    filters: DiseaseReportFilters = {}
  ): Promise<ServiceResult<DiseaseReport[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('disease_reports')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('case_date', { ascending: false });

      if (filters.diagnosis_code) {
        query = query.eq('diagnosis_code', filters.diagnosis_code);
      }

      if (filters.species) {
        query = query.eq('species', filters.species);
      }

      if (filters.location_zone) {
        query = query.eq('location_zone', filters.location_zone);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.outcome) {
        query = query.eq('outcome', filters.outcome);
      }

      if (filters.is_notifiable !== undefined) {
        query = query.eq('is_notifiable', filters.is_notifiable);
      }

      if (filters.lab_confirmed !== undefined) {
        query = query.eq('lab_confirmed', filters.lab_confirmed);
      }

      if (filters.from_date) {
        query = query.gte('case_date', filters.from_date);
      }

      if (filters.to_date) {
        query = query.lte('case_date', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DiseaseReport[];
    }, 'Error al listar reportes de enfermedad');
  }

  /**
   * Get a single disease report
   */
  async getDiseaseReport(reportId: string): Promise<ServiceResult<DiseaseReport>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('disease_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      return data as DiseaseReport;
    }, 'Error al obtener reporte de enfermedad');
  }

  /**
   * Create a disease report
   */
  async createDiseaseReport(
    tenantId: string,
    data: CreateDiseaseReportData,
    reportedBy: string
  ): Promise<ServiceResult<DiseaseReport>> {
    return this.handleError(async () => {
      const { data: report, error } = await this.supabase
        .from('disease_reports')
        .insert({
          tenant_id: tenantId,
          diagnosis_code: data.diagnosis_code,
          diagnosis_name: data.diagnosis_name,
          species: data.species,
          location_zone: data.location_zone,
          latitude: data.latitude,
          longitude: data.longitude,
          case_date: data.case_date ?? new Date().toISOString().split('T')[0],
          case_count: data.case_count ?? 1,
          outcome: data.outcome,
          severity: data.severity,
          pet_age_months: data.pet_age_months,
          pet_breed: data.pet_breed,
          pet_sex: data.pet_sex,
          lab_confirmed: data.lab_confirmed ?? false,
          lab_order_id: data.lab_order_id,
          is_notifiable: data.is_notifiable ?? false,
          notes: data.notes,
          reported_by: reportedBy,
        })
        .select()
        .single();

      if (error) throw error;
      return report as DiseaseReport;
    }, 'Error al crear reporte de enfermedad');
  }

  /**
   * Mark a disease report as notified to authorities
   */
  async markDiseaseNotified(reportId: string): Promise<ServiceResult<DiseaseReport>> {
    return this.handleError(async () => {
      const { data: report, error } = await this.supabase
        .from('disease_reports')
        .update({
          notified_authority: true,
          notified_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      return report as DiseaseReport;
    }, 'Error al marcar notificación a autoridades');
  }

  /**
   * Get disease outbreak alerts
   */
  async getDiseaseAlerts(
    tenantId: string,
    days: number = 7,
    threshold: number = 3
  ): Promise<ServiceResult<DiseaseAlert[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase.rpc('get_disease_alerts', {
        p_tenant_id: tenantId,
        p_days: days,
        p_threshold: threshold,
      });

      if (error) throw error;
      return data as DiseaseAlert[];
    }, 'Error al obtener alertas de enfermedad');
  }

  /**
   * Get disease statistics by zone
   */
  async getDiseaseStatsByZone(
    tenantId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<
    ServiceResult<
      Array<{
        location_zone: string;
        total_cases: number;
        unique_diagnoses: number;
        species_breakdown: Record<string, number>;
      }>
    >
  > {
    return this.handleError(async () => {
      let query = this.supabase
        .from('disease_reports')
        .select('location_zone, diagnosis_name, species, case_count')
        .eq('tenant_id', tenantId);

      if (fromDate) {
        query = query.gte('case_date', fromDate);
      }

      if (toDate) {
        query = query.lte('case_date', toDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by zone
      const zoneStats: Record<
        string,
        {
          location_zone: string;
          total_cases: number;
          diagnoses: Set<string>;
          species_breakdown: Record<string, number>;
        }
      > = {};

      for (const report of data) {
        const zone = report.location_zone || 'Sin zona';

        if (!zoneStats[zone]) {
          zoneStats[zone] = {
            location_zone: zone,
            total_cases: 0,
            diagnoses: new Set(),
            species_breakdown: {},
          };
        }

        zoneStats[zone].total_cases += report.case_count;
        zoneStats[zone].diagnoses.add(report.diagnosis_name);
        zoneStats[zone].species_breakdown[report.species] =
          (zoneStats[zone].species_breakdown[report.species] || 0) + report.case_count;
      }

      return Object.values(zoneStats).map((stat) => ({
        location_zone: stat.location_zone,
        total_cases: stat.total_cases,
        unique_diagnoses: stat.diagnoses.size,
        species_breakdown: stat.species_breakdown,
      }));
    }, 'Error al obtener estadísticas por zona');
  }

  /**
   * Get notifiable disease reports that haven't been reported to authorities
   */
  async getPendingNotifications(
    tenantId: string
  ): Promise<ServiceResult<DiseaseReport[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('disease_reports')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_notifiable', true)
        .eq('notified_authority', false)
        .order('case_date', { ascending: false });

      if (error) throw error;
      return data as DiseaseReport[];
    }, 'Error al obtener notificaciones pendientes');
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Calculate distance between two coordinates in kilometers
   * Using Haversine formula
   */
  private calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
