/**
 * SafetyService Tests
 *
 * Comprehensive tests for safety and public health features:
 * - Lost pet reporting and tracking
 * - Sighting reports
 * - Match suggestions
 * - Disease surveillance and epidemiology
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SafetyService,
  type LostPet,
  type PetSighting,
  type PetMatchSuggestion,
  type DiseaseReport,
  type LostPetStatus,
  type MatchStatus,
  type DiseaseSeverity,
} from '@/lib/services/safety-service';
import {
  createMockSupabaseClient,
  type MockSupabaseClient,
} from './__mocks__/supabase-mock';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// =============================================================================
// CHAINABLE MOCK HELPER
// =============================================================================

function createChainableMock<T>(response: {
  data: T | null;
  error: { message: string; code?: string } | null;
}) {
  const mockObj: Record<string, unknown> = {};

  const chainMethods = [
    'select',
    'eq',
    'is',
    'in',
    'not',
    'or',
    'ilike',
    'order',
    'limit',
    'range',
    'gte',
    'lte',
    'gt',
    'lt',
    'neq',
    'insert',
    'update',
    'delete',
    'upsert',
  ];
  chainMethods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });

  mockObj.single = vi.fn().mockResolvedValue(response);
  mockObj.maybeSingle = vi.fn().mockResolvedValue(response);

  mockObj.then = vi
    .fn()
    .mockImplementation((resolve: (value: typeof response) => void) => {
      return Promise.resolve(response).then(resolve);
    });

  return mockObj;
}

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createMockLostPet(overrides: Partial<LostPet> = {}): LostPet {
  return {
    id: 'lost-123',
    pet_id: 'pet-456',
    tenant_id: 'tenant-abc',
    status: 'lost' as LostPetStatus,
    last_seen_location: 'Av. España 1234, Asunción',
    last_seen_lat: -25.2867,
    last_seen_lng: -57.647,
    last_seen_at: '2026-01-10T14:00:00Z',
    reported_by: 'user-789',
    contact_phone: '+595981234567',
    contact_email: 'owner@example.com',
    found_at: null,
    found_location: null,
    found_by: null,
    notes: 'Lleva collar rojo',
    description: 'Perro mediano, muy amigable',
    distinctive_features: 'Mancha blanca en el pecho',
    wearing: 'Collar rojo con placa',
    reward_offered: true,
    reward_amount: 500000,
    is_public: true,
    share_url: null,
    photos: ['https://storage.example.com/photo1.jpg'],
    created_at: '2026-01-10T14:30:00Z',
    updated_at: '2026-01-10T14:30:00Z',
    pet: {
      id: 'pet-456',
      name: 'Max',
      species: 'dog',
      breed: 'Golden Retriever',
      color: 'dorado',
      photo_url: 'https://storage.example.com/max.jpg',
      microchip_number: '985112001234567',
      owner_id: 'user-789',
    },
    ...overrides,
  };
}

function createMockSighting(overrides: Partial<PetSighting> = {}): PetSighting {
  return {
    id: 'sight-123',
    lost_pet_id: 'lost-123',
    reporter_name: 'María García',
    reporter_email: 'maria@example.com',
    reporter_phone: '+595987654321',
    sighting_date: '2026-01-12T10:00:00Z',
    sighting_location: 'Plaza de los Héroes',
    sighting_lat: -25.282,
    sighting_lng: -57.635,
    description: 'Vi un perro parecido cerca de la fuente',
    photo_url: null,
    is_verified: false,
    verified_by: null,
    verified_at: null,
    created_at: '2026-01-12T10:30:00Z',
    updated_at: '2026-01-12T10:30:00Z',
    ...overrides,
  };
}

function createMockMatch(
  overrides: Partial<PetMatchSuggestion> = {}
): PetMatchSuggestion {
  return {
    id: 'match-123',
    lost_report_id: 'lost-123',
    found_report_id: 'found-456',
    found_pet_id: null,
    confidence_score: 85.5,
    match_reasons: [
      { type: 'breed', score: 90, description: 'Same breed: Golden Retriever' },
      { type: 'color', score: 80, description: 'Similar color' },
      { type: 'location', score: 85, description: 'Within 5km of last seen' },
    ],
    status: 'pending' as MatchStatus,
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

function createMockDiseaseReport(
  overrides: Partial<DiseaseReport> = {}
): DiseaseReport {
  return {
    id: 'disease-123',
    tenant_id: 'tenant-abc',
    diagnosis_code: 'A06',
    diagnosis_name: 'Parvovirus',
    species: 'dog',
    location_zone: 'Asunción Centro',
    latitude: -25.2867,
    longitude: -57.647,
    case_date: '2026-01-15',
    case_count: 1,
    outcome: 'recovered',
    severity: 'moderate' as DiseaseSeverity,
    pet_age_months: 6,
    pet_breed: 'Labrador',
    pet_sex: 'male',
    reported_by: 'vet-123',
    lab_confirmed: true,
    lab_order_id: 'lab-456',
    is_notifiable: true,
    notified_authority: false,
    notified_at: null,
    notes: 'Caso tratado exitosamente',
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('SafetyService', () => {
  let service: SafetyService;
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new SafetyService(mockClient as never);
  });

  // ===========================================================================
  // LOST PET TESTS
  // ===========================================================================

  describe('listLostPets', () => {
    it('returns lost pet reports for tenant', async () => {
      const lostPets = [
        createMockLostPet({ id: 'lost-1' }),
        createMockLostPet({ id: 'lost-2' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: lostPets, error: null })
      );

      const result = await service.listLostPets('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockClient.from).toHaveBeenCalledWith('lost_pets');
    });

    it('filters by status', async () => {
      const lostPets = [createMockLostPet({ status: 'lost' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: lostPets, error: null })
      );

      const result = await service.listLostPets('tenant-abc', { status: 'lost' });

      expect(result.success).toBe(true);
    });

    it('filters by date range', async () => {
      const lostPets = [createMockLostPet()];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: lostPets, error: null })
      );

      const result = await service.listLostPets('tenant-abc', {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(result.success).toBe(true);
    });

    it('filters by location radius', async () => {
      const lostPets = [
        createMockLostPet({ last_seen_lat: -25.2867, last_seen_lng: -57.647 }),
        createMockLostPet({ last_seen_lat: -26.0, last_seen_lng: -58.0 }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: lostPets, error: null })
      );

      const result = await service.listLostPets('tenant-abc', {
        near_lat: -25.2867,
        near_lng: -57.647,
        radius_km: 10,
      });

      expect(result.success).toBe(true);
      // Only the first one should match the radius filter
      expect(result.data).toHaveLength(1);
    });

    it('handles database errors', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: 'Database error', code: 'PGRST116' },
        })
      );

      const result = await service.listLostPets('tenant-abc');

      expect(result.success).toBe(false);
    });
  });

  describe('listPublicLostPets', () => {
    it('returns only public lost pets with lost status', async () => {
      const lostPets = [createMockLostPet({ is_public: true, status: 'lost' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: lostPets, error: null })
      );

      const result = await service.listPublicLostPets('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data?.[0].is_public).toBe(true);
      expect(result.data?.[0].status).toBe('lost');
    });
  });

  describe('getLostPet', () => {
    it('returns a single lost pet report by ID', async () => {
      const lostPet = createMockLostPet();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: lostPet, error: null })
      );

      const result = await service.getLostPet('lost-123');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('lost-123');
    });
  });

  describe('getLostPetByPetId', () => {
    it('returns active lost report for a pet', async () => {
      const lostPet = createMockLostPet();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: lostPet, error: null })
      );

      const result = await service.getLostPetByPetId('pet-456');

      expect(result.success).toBe(true);
      expect(result.data?.pet_id).toBe('pet-456');
    });

    it('returns null if no active report', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await service.getLostPetByPetId('pet-456');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('reportLostPet', () => {
    it('creates a new lost pet report', async () => {
      const lostPet = createMockLostPet();

      mockClient.from
        .mockReturnValueOnce(createChainableMock({ data: null, error: null }))
        .mockReturnValueOnce(createChainableMock({ data: lostPet, error: null }));

      const result = await service.reportLostPet(
        'tenant-abc',
        {
          pet_id: 'pet-456',
          last_seen_location: 'Av. España 1234',
          contact_phone: '+595981234567',
          reward_offered: true,
          reward_amount: 500000,
        },
        'user-789'
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('lost');
    });

    it('prevents duplicate active reports for same pet', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: { id: 'existing-123' }, error: null })
      );

      const result = await service.reportLostPet(
        'tenant-abc',
        { pet_id: 'pet-456' },
        'user-789'
      );

      expect(result.success).toBe(false);
      // The specific error message is wrapped by handleError
      expect(result.error).toBeDefined();
    });
  });

  describe('updateLostPet', () => {
    it('updates lost pet report details', async () => {
      const updatedReport = createMockLostPet({
        description: 'Updated description',
        reward_amount: 1000000,
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: updatedReport, error: null })
      );

      const result = await service.updateLostPet('lost-123', {
        description: 'Updated description',
        reward_amount: 1000000,
      });

      expect(result.success).toBe(true);
      expect(result.data?.description).toBe('Updated description');
    });
  });

  describe('markPetFound', () => {
    it('marks a lost pet as found', async () => {
      const foundPet = createMockLostPet({
        status: 'found',
        found_at: '2026-01-20T10:00:00Z',
        found_location: 'Parque Ñu Guasu',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: foundPet, error: null })
      );

      const result = await service.markPetFound(
        'lost-123',
        'Parque Ñu Guasu',
        'finder-user'
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('found');
      expect(result.data?.found_location).toBe('Parque Ñu Guasu');
    });
  });

  describe('markPetReunited', () => {
    it('marks a lost pet as reunited', async () => {
      const reunitedPet = createMockLostPet({ status: 'reunited' });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reunitedPet, error: null })
      );

      const result = await service.markPetReunited('lost-123');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('reunited');
    });
  });

  // ===========================================================================
  // SIGHTING TESTS
  // ===========================================================================

  describe('listSightings', () => {
    it('returns sightings for a lost pet', async () => {
      const sightings = [
        createMockSighting({ id: 'sight-1' }),
        createMockSighting({ id: 'sight-2' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: sightings, error: null })
      );

      const result = await service.listSightings('lost-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('reportSighting', () => {
    it('creates a new sighting report', async () => {
      const sighting = createMockSighting();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: sighting, error: null })
      );

      const result = await service.reportSighting({
        lost_pet_id: 'lost-123',
        reporter_name: 'María García',
        reporter_email: 'maria@example.com',
        sighting_location: 'Plaza de los Héroes',
        description: 'Vi un perro parecido',
      });

      expect(result.success).toBe(true);
      expect(result.data?.is_verified).toBe(false);
    });

    it('handles anonymous sighting reports', async () => {
      const sighting = createMockSighting({
        reporter_name: null,
        reporter_email: null,
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: sighting, error: null })
      );

      const result = await service.reportSighting({
        lost_pet_id: 'lost-123',
        sighting_location: 'Costanera',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('verifySighting', () => {
    it('verifies a sighting report', async () => {
      const verifiedSighting = createMockSighting({
        is_verified: true,
        verified_by: 'vet-123',
        verified_at: '2026-01-13T10:00:00Z',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: verifiedSighting, error: null })
      );

      const result = await service.verifySighting('sight-123', 'vet-123');

      expect(result.success).toBe(true);
      expect(result.data?.is_verified).toBe(true);
    });
  });

  describe('deleteSighting', () => {
    it('deletes a sighting report', async () => {
      mockClient.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await service.deleteSighting('sight-123');

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // MATCH SUGGESTION TESTS
  // ===========================================================================

  describe('listMatchSuggestions', () => {
    it('returns match suggestions for a lost pet', async () => {
      const matches = [
        createMockMatch({ id: 'match-1', confidence_score: 90 }),
        createMockMatch({ id: 'match-2', confidence_score: 75 }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: matches, error: null })
      );

      const result = await service.listMatchSuggestions('lost-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('getPendingMatches', () => {
    it('returns pending matches for a tenant', async () => {
      const matches = [createMockMatch({ status: 'pending' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: matches, error: null })
      );

      const result = await service.getPendingMatches('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data?.[0].status).toBe('pending');
    });
  });

  describe('reviewMatch', () => {
    it('confirms a match suggestion', async () => {
      const confirmedMatch = createMockMatch({
        status: 'confirmed',
        reviewed_by: 'vet-123',
        reviewed_at: '2026-01-20T10:00:00Z',
        review_notes: 'Confirmed by microchip match',
      });

      mockClient.from
        .mockReturnValueOnce(createChainableMock({ data: confirmedMatch, error: null }))
        .mockReturnValueOnce(createChainableMock({ data: null, error: null }))
        .mockReturnValueOnce(createChainableMock({ data: null, error: null }));

      const result = await service.reviewMatch(
        'match-123',
        { status: 'confirmed', review_notes: 'Confirmed by microchip match' },
        'vet-123'
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('confirmed');
    });

    it('rejects a match suggestion', async () => {
      const rejectedMatch = createMockMatch({
        status: 'rejected',
        review_notes: 'Different markings',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: rejectedMatch, error: null })
      );

      const result = await service.reviewMatch(
        'match-123',
        { status: 'rejected', review_notes: 'Different markings' },
        'vet-123'
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('rejected');
    });
  });

  // ===========================================================================
  // DISEASE REPORT TESTS
  // ===========================================================================

  describe('listDiseaseReports', () => {
    it('returns disease reports for tenant', async () => {
      const reports = [
        createMockDiseaseReport({ id: 'disease-1' }),
        createMockDiseaseReport({ id: 'disease-2' }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reports, error: null })
      );

      const result = await service.listDiseaseReports('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('filters by diagnosis code', async () => {
      const reports = [createMockDiseaseReport({ diagnosis_code: 'A06' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reports, error: null })
      );

      const result = await service.listDiseaseReports('tenant-abc', {
        diagnosis_code: 'A06',
      });

      expect(result.success).toBe(true);
    });

    it('filters by species', async () => {
      const reports = [createMockDiseaseReport({ species: 'dog' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reports, error: null })
      );

      const result = await service.listDiseaseReports('tenant-abc', {
        species: 'dog',
      });

      expect(result.success).toBe(true);
    });

    it('filters by severity', async () => {
      const reports = [createMockDiseaseReport({ severity: 'severe' })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reports, error: null })
      );

      const result = await service.listDiseaseReports('tenant-abc', {
        severity: 'severe',
      });

      expect(result.success).toBe(true);
    });

    it('filters by date range', async () => {
      const reports = [createMockDiseaseReport()];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reports, error: null })
      );

      const result = await service.listDiseaseReports('tenant-abc', {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(result.success).toBe(true);
    });

    it('filters by notifiable flag', async () => {
      const reports = [createMockDiseaseReport({ is_notifiable: true })];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reports, error: null })
      );

      const result = await service.listDiseaseReports('tenant-abc', {
        is_notifiable: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getDiseaseReport', () => {
    it('returns a single disease report by ID', async () => {
      const report = createMockDiseaseReport();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: report, error: null })
      );

      const result = await service.getDiseaseReport('disease-123');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('disease-123');
    });
  });

  describe('createDiseaseReport', () => {
    it('creates a new disease report', async () => {
      const report = createMockDiseaseReport();

      mockClient.from.mockReturnValue(
        createChainableMock({ data: report, error: null })
      );

      const result = await service.createDiseaseReport(
        'tenant-abc',
        {
          diagnosis_name: 'Parvovirus',
          species: 'dog',
          severity: 'moderate',
          is_notifiable: true,
        },
        'vet-123'
      );

      expect(result.success).toBe(true);
      expect(result.data?.diagnosis_name).toBe('Parvovirus');
    });

    it('defaults case_count to 1', async () => {
      const report = createMockDiseaseReport({ case_count: 1 });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: report, error: null })
      );

      const result = await service.createDiseaseReport(
        'tenant-abc',
        { diagnosis_name: 'Rabies', species: 'dog' },
        'vet-123'
      );

      expect(result.success).toBe(true);
      expect(result.data?.case_count).toBe(1);
    });
  });

  describe('markDiseaseNotified', () => {
    it('marks a disease report as notified to authorities', async () => {
      const notifiedReport = createMockDiseaseReport({
        notified_authority: true,
        notified_at: '2026-01-20T10:00:00Z',
      });

      mockClient.from.mockReturnValue(
        createChainableMock({ data: notifiedReport, error: null })
      );

      const result = await service.markDiseaseNotified('disease-123');

      expect(result.success).toBe(true);
      expect(result.data?.notified_authority).toBe(true);
      expect(result.data?.notified_at).toBeDefined();
    });
  });

  describe('getDiseaseAlerts', () => {
    it('returns disease outbreak alerts', async () => {
      const alerts = [
        {
          diagnosis_code: 'A06',
          diagnosis_name: 'Parvovirus',
          species: 'dog',
          case_count: 5,
          first_case: '2026-01-10',
          last_case: '2026-01-15',
          location_zone: 'Asunción Centro',
        },
      ];

      mockClient.rpc.mockResolvedValue({ data: alerts, error: null });

      const result = await service.getDiseaseAlerts('tenant-abc', 7, 3);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockClient.rpc).toHaveBeenCalledWith('get_disease_alerts', {
        p_tenant_id: 'tenant-abc',
        p_days: 7,
        p_threshold: 3,
      });
    });

    it('uses default values for days and threshold', async () => {
      mockClient.rpc.mockResolvedValue({ data: [], error: null });

      await service.getDiseaseAlerts('tenant-abc');

      expect(mockClient.rpc).toHaveBeenCalledWith('get_disease_alerts', {
        p_tenant_id: 'tenant-abc',
        p_days: 7,
        p_threshold: 3,
      });
    });
  });

  describe('getDiseaseStatsByZone', () => {
    it('returns disease statistics by zone', async () => {
      const reports = [
        {
          location_zone: 'Centro',
          diagnosis_name: 'Parvovirus',
          species: 'dog',
          case_count: 3,
        },
        {
          location_zone: 'Centro',
          diagnosis_name: 'Distemper',
          species: 'dog',
          case_count: 2,
        },
        {
          location_zone: 'Norte',
          diagnosis_name: 'Parvovirus',
          species: 'cat',
          case_count: 1,
        },
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reports, error: null })
      );

      const result = await service.getDiseaseStatsByZone('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Two zones

      const centroStats = result.data?.find((z) => z.location_zone === 'Centro');
      expect(centroStats?.total_cases).toBe(5);
      expect(centroStats?.unique_diagnoses).toBe(2);
      expect(centroStats?.species_breakdown.dog).toBe(5);
    });

    it('handles reports without location zone', async () => {
      const reports = [
        {
          location_zone: null,
          diagnosis_name: 'Unknown',
          species: 'dog',
          case_count: 1,
        },
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reports, error: null })
      );

      const result = await service.getDiseaseStatsByZone('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data?.[0].location_zone).toBe('Sin zona');
    });
  });

  describe('getPendingNotifications', () => {
    it('returns notifiable diseases not yet reported to authorities', async () => {
      const reports = [
        createMockDiseaseReport({
          is_notifiable: true,
          notified_authority: false,
        }),
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: reports, error: null })
      );

      const result = await service.getPendingNotifications('tenant-abc');

      expect(result.success).toBe(true);
      expect(result.data?.[0].is_notifiable).toBe(true);
      expect(result.data?.[0].notified_authority).toBe(false);
    });
  });

  // ===========================================================================
  // UTILITY TESTS
  // ===========================================================================

  describe('distance calculation', () => {
    it('correctly calculates distance between two points', async () => {
      // Test with two lost pets at known distances
      const lostPets = [
        createMockLostPet({
          id: 'close',
          last_seen_lat: -25.2867,
          last_seen_lng: -57.647,
        }), // Same location
        createMockLostPet({
          id: 'far',
          last_seen_lat: -25.3167,
          last_seen_lng: -57.647,
        }), // ~3.3km away
      ];

      mockClient.from.mockReturnValue(
        createChainableMock({ data: lostPets, error: null })
      );

      const result = await service.listLostPets('tenant-abc', {
        near_lat: -25.2867,
        near_lng: -57.647,
        radius_km: 2,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe('close');
    });
  });
});
