/**
 * Safety Service
 *
 * Business logic for lost pets, sightings, matches, and disease surveillance.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { SafetyRepository } from './repository'
import type {
  LostPet,
  LostPetFilters,
  ReportLostPetInput,
  UpdateLostPetInput,
  PetSighting,
  ReportSightingInput,
  PetMatchSuggestion,
  ReviewMatchInput,
  DiseaseReport,
  DiseaseReportFilters,
  CreateDiseaseReportInput,
  DiseaseAlert,
  ZoneStats,
} from './types'
import { logger } from '@/lib/logger'

export class SafetyService {
  private repository: SafetyRepository

  constructor(private supabase: SupabaseClient) {
    this.repository = new SafetyRepository(supabase)
  }

  // ===========================================================================
  // LOST PETS
  // ===========================================================================

  async listLostPets(tenantId: string, filters: LostPetFilters = {}): Promise<LostPet[]> {
    let results = await this.repository.findLostPets(tenantId, filters)

    // Filter by location if coordinates provided
    if (filters.near_lat && filters.near_lng && filters.radius_km) {
      // Non-null assertions safe: if condition ensures all filter values exist
      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      results = results.filter((report) => {
        if (!report.last_seen_lat || !report.last_seen_lng) return false
        const distance = this.calculateDistanceKm(
          filters.near_lat!,
          filters.near_lng!,
          report.last_seen_lat,
          report.last_seen_lng
        )
        return distance <= filters.radius_km!
      })
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
    }

    return results
  }

  async listPublicLostPets(tenantId: string, filters: LostPetFilters = {}): Promise<LostPet[]> {
    return this.listLostPets(tenantId, {
      ...filters,
      status: 'lost',
      is_public: true,
    })
  }

  async getLostPet(reportId: string): Promise<LostPet | null> {
    return this.repository.findLostPetById(reportId)
  }

  async getLostPetByPetId(petId: string): Promise<LostPet | null> {
    return this.repository.findLostPetByPetId(petId)
  }

  async reportLostPet(
    tenantId: string,
    input: ReportLostPetInput,
    reportedBy: string
  ): Promise<LostPet> {
    // Check if there's already an active lost report for this pet
    const existingReport = await this.repository.checkExistingLostReport(input.pet_id)
    if (existingReport) {
      throw new Error('Ya existe un reporte activo para esta mascota')
    }

    const report = await this.repository.createLostPetReport(tenantId, input, reportedBy)

    logger.info('[SafetyService] Lost pet reported', {
      reportId: report.id,
      petId: input.pet_id,
    })

    return report
  }

  async updateLostPet(reportId: string, updates: UpdateLostPetInput): Promise<LostPet> {
    return this.repository.updateLostPet(reportId, updates)
  }

  async markPetFound(
    reportId: string,
    foundLocation: string | null,
    foundBy: string
  ): Promise<LostPet> {
    const report = await this.repository.markPetFound(reportId, foundLocation, foundBy)

    logger.info('[SafetyService] Pet marked as found', { reportId })

    return report
  }

  async markPetReunited(reportId: string): Promise<LostPet> {
    const report = await this.repository.markPetReunited(reportId)

    logger.info('[SafetyService] Pet marked as reunited', { reportId })

    return report
  }

  // ===========================================================================
  // SIGHTINGS
  // ===========================================================================

  async listSightings(lostPetId: string): Promise<PetSighting[]> {
    return this.repository.findSightings(lostPetId)
  }

  async reportSighting(input: ReportSightingInput): Promise<PetSighting> {
    const sighting = await this.repository.createSighting(input)

    logger.info('[SafetyService] Sighting reported', {
      sightingId: sighting.id,
      lostPetId: input.lost_pet_id,
    })

    return sighting
  }

  async verifySighting(sightingId: string, verifiedBy: string): Promise<PetSighting> {
    return this.repository.verifySighting(sightingId, verifiedBy)
  }

  async deleteSighting(sightingId: string): Promise<void> {
    await this.repository.deleteSighting(sightingId)
  }

  // ===========================================================================
  // MATCH SUGGESTIONS
  // ===========================================================================

  async listMatchSuggestions(lostPetId: string): Promise<PetMatchSuggestion[]> {
    return this.repository.findMatchSuggestions(lostPetId)
  }

  async getPendingMatches(tenantId: string): Promise<PetMatchSuggestion[]> {
    return this.repository.findPendingMatches(tenantId)
  }

  async reviewMatch(
    matchId: string,
    input: ReviewMatchInput,
    reviewedBy: string
  ): Promise<PetMatchSuggestion> {
    const match = await this.repository.reviewMatch(
      matchId,
      input.status,
      input.review_notes || null,
      reviewedBy
    )

    // If confirmed, update both reports to reunited
    if (input.status === 'confirmed') {
      if (match.lost_report_id) {
        await this.repository.updateLostReportStatusReunited(match.lost_report_id)
      }
      if (match.found_report_id) {
        await this.repository.updateLostReportStatusReunited(match.found_report_id)
      }
    }

    logger.info('[SafetyService] Match reviewed', {
      matchId,
      status: input.status,
    })

    return match
  }

  // ===========================================================================
  // DISEASE REPORTS
  // ===========================================================================

  async listDiseaseReports(
    tenantId: string,
    filters: DiseaseReportFilters = {}
  ): Promise<DiseaseReport[]> {
    return this.repository.findDiseaseReports(tenantId, filters)
  }

  async getDiseaseReport(reportId: string): Promise<DiseaseReport | null> {
    return this.repository.findDiseaseReportById(reportId)
  }

  async createDiseaseReport(
    tenantId: string,
    input: CreateDiseaseReportInput,
    reportedBy: string
  ): Promise<DiseaseReport> {
    const report = await this.repository.createDiseaseReport(tenantId, input, reportedBy)

    logger.info('[SafetyService] Disease report created', {
      reportId: report.id,
      diagnosis: input.diagnosis_name,
    })

    return report
  }

  async markDiseaseNotified(reportId: string): Promise<DiseaseReport> {
    return this.repository.markDiseaseNotified(reportId)
  }

  async getDiseaseAlerts(
    tenantId: string,
    days: number = 7,
    threshold: number = 3
  ): Promise<DiseaseAlert[]> {
    return this.repository.getDiseaseAlerts(tenantId, days, threshold)
  }

  async getDiseaseStatsByZone(
    tenantId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<ZoneStats[]> {
    const data = await this.repository.getDiseaseReportsForZoneStats(tenantId, fromDate, toDate)

    // Aggregate by zone
    const zoneStats: Record<
      string,
      {
        location_zone: string
        total_cases: number
        diagnoses: Set<string>
        species_breakdown: Record<string, number>
      }
    > = {}

    for (const report of data) {
      const zone = report.location_zone || 'Sin zona'

      if (!zoneStats[zone]) {
        zoneStats[zone] = {
          location_zone: zone,
          total_cases: 0,
          diagnoses: new Set(),
          species_breakdown: {},
        }
      }

      zoneStats[zone].total_cases += report.case_count
      zoneStats[zone].diagnoses.add(report.diagnosis_name)
      zoneStats[zone].species_breakdown[report.species] =
        (zoneStats[zone].species_breakdown[report.species] || 0) + report.case_count
    }

    return Object.values(zoneStats).map((stat) => ({
      location_zone: stat.location_zone,
      total_cases: stat.total_cases,
      unique_diagnoses: stat.diagnoses.size,
      species_breakdown: stat.species_breakdown,
    }))
  }

  async getPendingNotifications(tenantId: string): Promise<DiseaseReport[]> {
    return this.repository.getPendingNotifications(tenantId)
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Calculate distance between two coordinates in kilometers (Haversine formula)
   */
  private calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}
