-- =============================================================================
-- DEMO PET DATA - MAX THE CHIHUAHUA
-- =============================================================================
-- Comprehensive seed data for a demo pet to showcase the pet portal functionality.
-- Creates: Pet, Vaccines, Medical Records, Appointments, Weight History
--
-- This script is IDEMPOTENT - safe to run multiple times without duplicating data.
--
-- DEPENDENCIES: 00-core (tenants, demo-accounts), 02-global (profiles)
-- =============================================================================

-- =============================================================================
-- CONFIGURATION VARIABLES
-- =============================================================================
-- Using DO blocks for PostgreSQL variables

DO $$
DECLARE
    -- Demo Pet: Max the Chihuahua
    v_pet_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    v_pet_name TEXT := 'Max';
    
    -- Owner: Using existing demo owner from Adris (Juan Perez / owner@adris.demo)
    -- Note: In production, link to actual authenticated user
    v_owner_id UUID := '550e8400-e29b-41d4-a716-446655440001';  -- Ana María González (existing owner)
    
    -- Tenant
    v_tenant_id TEXT := 'adris';
    
    -- Vet IDs from existing seed data
    v_vet_id_1 UUID := '550e8400-e29b-41d4-a716-446655440004';  -- Dra. Silvia Sánchez
    v_vet_id_2 UUID := '550e8400-e29b-41d4-a716-446655440005';  -- Dr. Roberto Díaz
    
    -- Date calculations (relative to current date)
    v_birth_date DATE;
    v_now TIMESTAMPTZ := NOW();
    
BEGIN
    -- Calculate birth date (~1 year ago)
    v_birth_date := CURRENT_DATE - INTERVAL '52 weeks';

    -- =========================================================================
    -- 1. CREATE/UPDATE DEMO PET: Max the Chihuahua
    -- =========================================================================
    -- Using INSERT...ON CONFLICT for idempotency
    
    INSERT INTO public.pets (
        id,
        owner_id,
        tenant_id,
        name,
        species,
        breed,
        color,
        sex,
        birth_date,
        birth_date_estimated,
        is_neutered,
        neutered_date,
        weight_kg,
        weight_updated_at,
        microchip_number,
        microchip_date,
        photo_url,
        is_deceased,
        is_active,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_pet_id,
        v_owner_id,
        v_tenant_id,
        v_pet_name,
        'dog',
        'Chihuahua',
        'Marrón claro con blanco',
        'male',
        v_birth_date,
        false,  -- Exact birth date known
        true,   -- Neutered
        v_birth_date + INTERVAL '6 months',  -- Neutered at 6 months
        2.3,    -- Current weight
        v_now - INTERVAL '1 week',  -- Weight updated recently
        'PY-CHI-MAX-001',
        v_birth_date + INTERVAL '8 weeks',  -- Microchipped at 8 weeks
        '/placeholder-product.svg',
        false,
        true,
        'Mascota demo para pruebas del portal. Chihuahua amigable y juguetón.',
        v_now - INTERVAL '10 months',  -- First registered 10 months ago
        v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        weight_kg = EXCLUDED.weight_kg,
        weight_updated_at = EXCLUDED.weight_updated_at,
        updated_at = v_now;

    RAISE NOTICE 'Pet Max created/updated with ID: %', v_pet_id;

    -- =========================================================================
    -- 2. LINK PET TO CLINIC (clinic_pets junction table)
    -- =========================================================================
    
    INSERT INTO public.clinic_pets (
        id,
        pet_id,
        tenant_id,
        first_visit_date,
        last_visit_date,
        visit_count,
        is_active,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'b2c3d4e5-f6a7-8901-bcde-f23456789012',
        v_pet_id,
        v_tenant_id,
        v_now - INTERVAL '10 months',  -- First visit when registered
        v_now - INTERVAL '1 week',     -- Last visit recently
        8,                              -- Total visits
        true,
        'Paciente demo - historial completo de vacunas y consultas',
        v_now - INTERVAL '10 months',
        v_now
    )
    ON CONFLICT (pet_id, tenant_id) DO UPDATE SET
        last_visit_date = EXCLUDED.last_visit_date,
        visit_count = EXCLUDED.visit_count,
        updated_at = v_now;

    RAISE NOTICE 'Clinic-pet relationship created/updated';

END $$;

-- =============================================================================
-- 3. VACCINES - Puppy Series + Annual Boosters
-- =============================================================================

DO $$
DECLARE
    v_pet_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    v_tenant_id TEXT := 'adris';
    v_vet_id_1 UUID := '550e8400-e29b-41d4-a716-446655440004';
    v_vet_id_2 UUID := '550e8400-e29b-41d4-a716-446655440005';
    v_birth_date DATE := CURRENT_DATE - INTERVAL '52 weeks';
    v_now TIMESTAMPTZ := NOW();
BEGIN

    -- -------------------------------------------------------------------------
    -- Vaccine 1: Séxtuple at 6 weeks (first dose)
    -- -------------------------------------------------------------------------
    INSERT INTO public.vaccines (
        id,
        pet_id,
        administered_by_clinic,
        administered_by,
        name,
        batch_number,
        manufacturer,
        route,
        dosage,
        administered_date,
        next_due_date,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'c3d4e5f6-a7b8-9012-cdef-345678901234',
        v_pet_id,
        v_tenant_id,
        v_vet_id_1,
        'Séxtuple Canina (DHLPP) - 1ra Dosis',
        'DHLPP-2024-001',
        'Zoetis',
        'SC',
        '1 ml',
        v_birth_date + INTERVAL '6 weeks',
        v_birth_date + INTERVAL '9 weeks',  -- Next dose in 3 weeks
        'completed',
        'Primera dosis del protocolo de vacunación para cachorros. Protección contra Moquillo, Hepatitis, Leptospirosis, Parvovirus y Parainfluenza.',
        v_birth_date + INTERVAL '6 weeks',
        v_birth_date + INTERVAL '6 weeks'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Vaccine 2: Séxtuple at 9 weeks (second dose)
    -- -------------------------------------------------------------------------
    INSERT INTO public.vaccines (
        id,
        pet_id,
        administered_by_clinic,
        administered_by,
        name,
        batch_number,
        manufacturer,
        route,
        dosage,
        administered_date,
        next_due_date,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'd4e5f6a7-b8c9-0123-def0-456789012345',
        v_pet_id,
        v_tenant_id,
        v_vet_id_1,
        'Séxtuple Canina (DHLPP) - 2da Dosis',
        'DHLPP-2024-002',
        'Zoetis',
        'SC',
        '1 ml',
        v_birth_date + INTERVAL '9 weeks',
        v_birth_date + INTERVAL '12 weeks',  -- Next dose in 3 weeks
        'completed',
        'Segunda dosis del protocolo. Buena tolerancia, sin reacciones adversas.',
        v_birth_date + INTERVAL '9 weeks',
        v_birth_date + INTERVAL '9 weeks'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Vaccine 3: Séxtuple at 12 weeks (third dose)
    -- -------------------------------------------------------------------------
    INSERT INTO public.vaccines (
        id,
        pet_id,
        administered_by_clinic,
        administered_by,
        name,
        batch_number,
        manufacturer,
        route,
        dosage,
        administered_date,
        next_due_date,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'e5f6a7b8-c9d0-1234-ef01-567890123456',
        v_pet_id,
        v_tenant_id,
        v_vet_id_2,
        'Séxtuple Canina (DHLPP) - 3ra Dosis',
        'DHLPP-2024-003',
        'Zoetis',
        'SC',
        '1 ml',
        v_birth_date + INTERVAL '12 weeks',
        v_birth_date + INTERVAL '16 weeks',  -- Next dose in 4 weeks
        'completed',
        'Tercera dosis del protocolo. Vacunación de refuerzo.',
        v_birth_date + INTERVAL '12 weeks',
        v_birth_date + INTERVAL '12 weeks'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Vaccine 4: Antirrábica at 16 weeks + Séxtuple Final
    -- -------------------------------------------------------------------------
    INSERT INTO public.vaccines (
        id,
        pet_id,
        administered_by_clinic,
        administered_by,
        name,
        batch_number,
        manufacturer,
        route,
        dosage,
        administered_date,
        next_due_date,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'f6a7b8c9-d0e1-2345-f012-678901234567',
        v_pet_id,
        v_tenant_id,
        v_vet_id_1,
        'Antirrábica',
        'RAB-2024-001',
        'Merial',
        'SC',
        '1 ml',
        v_birth_date + INTERVAL '16 weeks',
        v_birth_date + INTERVAL '16 weeks' + INTERVAL '1 year',  -- Annual booster
        'completed',
        'Vacuna antirrábica obligatoria. Primera dosis a los 4 meses de edad. Certificado emitido.',
        v_birth_date + INTERVAL '16 weeks',
        v_birth_date + INTERVAL '16 weeks'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Vaccine 5: Annual Booster (Antirrábica) - 3 months ago
    -- -------------------------------------------------------------------------
    INSERT INTO public.vaccines (
        id,
        pet_id,
        administered_by_clinic,
        administered_by,
        name,
        batch_number,
        manufacturer,
        route,
        dosage,
        administered_date,
        next_due_date,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'a7b8c9d0-e1f2-3456-0123-789012345678',
        v_pet_id,
        v_tenant_id,
        v_vet_id_2,
        'Antirrábica - Refuerzo Anual',
        'RAB-2024-045',
        'Merial',
        'SC',
        '1 ml',
        CURRENT_DATE - INTERVAL '3 months',
        CURRENT_DATE - INTERVAL '3 months' + INTERVAL '1 year',  -- Due next year
        'completed',
        'Refuerzo anual de vacuna antirrábica. Paciente en buen estado, sin reacciones.',
        CURRENT_DATE - INTERVAL '3 months',
        CURRENT_DATE - INTERVAL '3 months'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Vaccine 6: Upcoming Scheduled Vaccine (Séxtuple Annual Booster)
    -- -------------------------------------------------------------------------
    INSERT INTO public.vaccines (
        id,
        pet_id,
        administered_by_clinic,
        administered_by,
        name,
        batch_number,
        manufacturer,
        route,
        dosage,
        administered_date,
        next_due_date,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'b8c9d0e1-f2a3-4567-1234-890123456789',
        v_pet_id,
        v_tenant_id,
        v_vet_id_1,
        'Séxtuple Canina - Refuerzo Anual',
        NULL,  -- No batch yet (scheduled)
        'Zoetis',
        'SC',
        '1 ml',
        CURRENT_DATE + INTERVAL '2 weeks',  -- Scheduled for 2 weeks from now
        CURRENT_DATE + INTERVAL '2 weeks' + INTERVAL '1 year',
        'scheduled',
        'Refuerzo anual programado. Cita agendada para las 10:00 AM.',
        v_now,
        v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        administered_date = EXCLUDED.administered_date,
        updated_at = v_now;

    RAISE NOTICE 'Vaccines created/updated for Max';

END $$;

-- =============================================================================
-- 4. MEDICAL RECORDS - Full History
-- =============================================================================

DO $$
DECLARE
    v_pet_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    v_tenant_id TEXT := 'adris';
    v_vet_id_1 UUID := '550e8400-e29b-41d4-a716-446655440004';
    v_vet_id_2 UUID := '550e8400-e29b-41d4-a716-446655440005';
    v_birth_date DATE := CURRENT_DATE - INTERVAL '52 weeks';
    v_now TIMESTAMPTZ := NOW();
BEGIN

    -- -------------------------------------------------------------------------
    -- Record 1: Initial Wellness Exam (at 6 weeks)
    -- -------------------------------------------------------------------------
    INSERT INTO public.medical_records (
        id,
        pet_id,
        tenant_id,
        vet_id,
        record_type,
        visit_date,
        chief_complaint,
        history,
        physical_exam,
        weight_kg,
        temperature_celsius,
        heart_rate_bpm,
        respiratory_rate_rpm,
        body_condition_score,
        diagnosis_text,
        assessment,
        treatment_plan,
        is_emergency,
        requires_followup,
        followup_date,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'c9d0e1f2-a3b4-5678-2345-901234567890',
        v_pet_id,
        v_tenant_id,
        v_vet_id_1,
        'checkup',
        v_birth_date + INTERVAL '6 weeks',
        'Primera consulta - cachorro nuevo',
        'Cachorro Chihuahua macho de 6 semanas. Adquirido de criador local. Sin antecedentes médicos previos.',
        'Cachorro alerta y activo. Mucosas rosadas, hidratación normal. Ganglios linfáticos normales. Abdomen blando, no doloroso. Fontanela abierta (normal para la raza). Peso adecuado para la edad.',
        0.5,
        38.5,
        160,
        28,
        5,
        'Cachorro sano - Control de bienestar',
        'Cachorro Chihuahua en excelente estado de salud. Desarrollo apropiado para la edad. Fontanela abierta normal para la raza.',
        'Iniciar protocolo de vacunación. Desparasitación interna (pyrantel). Control en 3 semanas para segunda vacuna.',
        false,
        true,
        v_birth_date + INTERVAL '9 weeks',
        'Propietario instruido sobre cuidados del cachorro, alimentación y signos de alerta.',
        v_birth_date + INTERVAL '6 weeks',
        v_birth_date + INTERVAL '6 weeks'
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Record 2: Vaccination Visit (at 12 weeks)
    -- -------------------------------------------------------------------------
    INSERT INTO public.medical_records (
        id,
        pet_id,
        tenant_id,
        vet_id,
        record_type,
        visit_date,
        chief_complaint,
        history,
        physical_exam,
        weight_kg,
        temperature_celsius,
        heart_rate_bpm,
        respiratory_rate_rpm,
        body_condition_score,
        diagnosis_text,
        assessment,
        treatment_plan,
        is_emergency,
        requires_followup,
        followup_date,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'd0e1f2a3-b4c5-6789-3456-012345678901',
        v_pet_id,
        v_tenant_id,
        v_vet_id_2,
        'vaccination',
        v_birth_date + INTERVAL '12 weeks',
        'Control y tercera vacuna',
        'Continúa protocolo de vacunación. Vacunas previas sin reacciones. Come y bebe normalmente.',
        'Cachorro activo, buen estado general. Ganando peso apropiadamente. Mucosas rosadas. Ausculatación cardiopulmonar normal.',
        1.1,
        38.3,
        145,
        26,
        5,
        'Control de vacunación - Cachorro sano',
        'Desarrollo normal. Crecimiento adecuado. Listo para tercera dosis de vacuna.',
        'Aplicar tercera dosis de Séxtuple. Próxima vacuna (Antirrábica) a las 16 semanas.',
        false,
        true,
        v_birth_date + INTERVAL '16 weeks',
        'Vacuna administrada sin complicaciones. Observar 24 horas por posibles reacciones.',
        v_birth_date + INTERVAL '12 weeks',
        v_birth_date + INTERVAL '12 weeks'
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Record 3: Ear Infection Treatment (5 months ago)
    -- -------------------------------------------------------------------------
    INSERT INTO public.medical_records (
        id,
        pet_id,
        tenant_id,
        vet_id,
        record_type,
        visit_date,
        chief_complaint,
        history,
        physical_exam,
        weight_kg,
        temperature_celsius,
        heart_rate_bpm,
        respiratory_rate_rpm,
        body_condition_score,
        diagnosis_text,
        assessment,
        treatment_plan,
        is_emergency,
        requires_followup,
        followup_date,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'e1f2a3b4-c5d6-7890-4567-123456789012',
        v_pet_id,
        v_tenant_id,
        v_vet_id_1,
        'consultation',
        CURRENT_DATE - INTERVAL '5 months',
        'Rascado excesivo de orejas, sacude la cabeza',
        'El propietario nota que el paciente se rasca las orejas frecuentemente desde hace 3 días. Sacude la cabeza repetidamente.',
        'Paciente alerta pero incómodo. Canal auditivo externo izquierdo eritematoso con secreción ceruminosa oscura. Olor desagradable. Oído derecho normal. Resto del examen físico sin alteraciones.',
        2.0,
        38.7,
        130,
        24,
        5,
        'Otitis externa bacteriana/micótica',
        'Otitis externa unilateral (oído izquierdo) con probable componente bacteriano y/o fúngico. Requiere tratamiento tópico.',
        'Limpieza ótica profesional realizada. Gotas óticas (antibiótico + antifúngico + corticoide) cada 12 horas por 10 días. Control en 10 días.',
        false,
        true,
        CURRENT_DATE - INTERVAL '5 months' + INTERVAL '10 days',
        'Se realizó citología del exudado que muestra cocos y levaduras. Propietario instruido sobre aplicación correcta de gotas.',
        CURRENT_DATE - INTERVAL '5 months',
        CURRENT_DATE - INTERVAL '5 months'
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Record 4: Recent Annual Checkup (1 week ago)
    -- -------------------------------------------------------------------------
    INSERT INTO public.medical_records (
        id,
        pet_id,
        tenant_id,
        vet_id,
        record_type,
        visit_date,
        chief_complaint,
        history,
        physical_exam,
        weight_kg,
        temperature_celsius,
        heart_rate_bpm,
        respiratory_rate_rpm,
        body_condition_score,
        diagnosis_text,
        assessment,
        treatment_plan,
        is_emergency,
        requires_followup,
        followup_date,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'f2a3b4c5-d6e7-8901-5678-234567890123',
        v_pet_id,
        v_tenant_id,
        v_vet_id_2,
        'checkup',
        CURRENT_DATE - INTERVAL '1 week',
        'Control anual de rutina',
        'Paciente de 1 año de edad. Sin problemas de salud reportados. Come y bebe normalmente. Actividad normal. Vacunas al día.',
        'Paciente en excelente condición corporal. Pelaje brillante. Mucosas rosadas. Hidratación normal. Auscultación cardiopulmonar normal. Abdomen blando, no doloroso. Dentadura limpia sin sarro.',
        2.3,
        38.4,
        125,
        22,
        5,
        'Paciente sano - Control anual',
        'Chihuahua adulto joven en perfecto estado de salud. Peso ideal para la raza y tamaño.',
        'Mantener alimentación actual. Continuar prevención antiparasitaria mensual. Programar refuerzo de vacuna Séxtuple en 2 semanas.',
        false,
        true,
        CURRENT_DATE + INTERVAL '2 weeks',
        'Propietario muy comprometido con el cuidado del paciente. Excelente estado de salud general.',
        CURRENT_DATE - INTERVAL '1 week',
        CURRENT_DATE - INTERVAL '1 week'
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = v_now;

    RAISE NOTICE 'Medical records created/updated for Max';

END $$;

-- =============================================================================
-- 5. APPOINTMENTS
-- =============================================================================

DO $$
DECLARE
    v_pet_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    v_tenant_id TEXT := 'adris';
    v_vet_id_1 UUID := '550e8400-e29b-41d4-a716-446655440004';
    v_vet_id_2 UUID := '550e8400-e29b-41d4-a716-446655440005';
    v_owner_id UUID := '550e8400-e29b-41d4-a716-446655440001';
    v_now TIMESTAMPTZ := NOW();
    
    -- Get a service ID (first consultation service from the tenant)
    v_service_id UUID;
BEGIN

    -- Try to get an existing consultation service
    SELECT id INTO v_service_id 
    FROM public.services 
    WHERE tenant_id = v_tenant_id 
    AND category = 'consultation' 
    AND is_active = true 
    AND deleted_at IS NULL 
    LIMIT 1;

    -- If no service exists, we'll use NULL
    
    -- -------------------------------------------------------------------------
    -- Appointment 1: Completed Wellness Exam (1 week ago)
    -- -------------------------------------------------------------------------
    INSERT INTO public.appointments (
        id,
        tenant_id,
        pet_id,
        service_id,
        vet_id,
        created_by,
        start_time,
        end_time,
        duration_minutes,
        reason,
        notes,
        internal_notes,
        status,
        confirmed_at,
        checked_in_at,
        started_at,
        completed_at,
        reminder_sent,
        reminder_sent_at,
        created_at,
        updated_at
    ) VALUES (
        'a3b4c5d6-e7f8-9012-6789-345678901234',
        v_tenant_id,
        v_pet_id,
        v_service_id,
        v_vet_id_2,
        v_owner_id,
        (CURRENT_DATE - INTERVAL '1 week') + TIME '10:00:00',
        (CURRENT_DATE - INTERVAL '1 week') + TIME '10:30:00',
        30,
        'Control anual de rutina',
        'Cita anual para revisión general y actualización de vacunas.',
        'Paciente puntual. Propietario muy atento.',
        'completed',
        (CURRENT_DATE - INTERVAL '1 week' - INTERVAL '2 days'),
        (CURRENT_DATE - INTERVAL '1 week') + TIME '09:55:00',
        (CURRENT_DATE - INTERVAL '1 week') + TIME '10:02:00',
        (CURRENT_DATE - INTERVAL '1 week') + TIME '10:28:00',
        true,
        (CURRENT_DATE - INTERVAL '1 week' - INTERVAL '1 day'),
        v_now - INTERVAL '2 weeks',
        CURRENT_DATE - INTERVAL '1 week'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Appointment 2: Completed Vaccination (3 months ago)
    -- -------------------------------------------------------------------------
    INSERT INTO public.appointments (
        id,
        tenant_id,
        pet_id,
        service_id,
        vet_id,
        created_by,
        start_time,
        end_time,
        duration_minutes,
        reason,
        notes,
        internal_notes,
        status,
        confirmed_at,
        checked_in_at,
        started_at,
        completed_at,
        reminder_sent,
        reminder_sent_at,
        created_at,
        updated_at
    ) VALUES (
        'b4c5d6e7-f8a9-0123-7890-456789012345',
        v_tenant_id,
        v_pet_id,
        v_service_id,
        v_vet_id_2,
        v_owner_id,
        (CURRENT_DATE - INTERVAL '3 months') + TIME '14:30:00',
        (CURRENT_DATE - INTERVAL '3 months') + TIME '15:00:00',
        30,
        'Vacunación antirrábica anual',
        'Refuerzo anual de vacuna antirrábica.',
        'Sin reacciones adversas post-vacunación.',
        'completed',
        (CURRENT_DATE - INTERVAL '3 months' - INTERVAL '3 days'),
        (CURRENT_DATE - INTERVAL '3 months') + TIME '14:25:00',
        (CURRENT_DATE - INTERVAL '3 months') + TIME '14:32:00',
        (CURRENT_DATE - INTERVAL '3 months') + TIME '14:50:00',
        true,
        (CURRENT_DATE - INTERVAL '3 months' - INTERVAL '1 day'),
        CURRENT_DATE - INTERVAL '3 months' - INTERVAL '1 week',
        CURRENT_DATE - INTERVAL '3 months'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Appointment 3: Upcoming Scheduled Appointment (2 weeks from now)
    -- -------------------------------------------------------------------------
    INSERT INTO public.appointments (
        id,
        tenant_id,
        pet_id,
        service_id,
        vet_id,
        created_by,
        start_time,
        end_time,
        duration_minutes,
        reason,
        notes,
        internal_notes,
        status,
        confirmed_at,
        reminder_sent,
        created_at,
        updated_at
    ) VALUES (
        'c5d6e7f8-a9b0-1234-8901-567890123456',
        v_tenant_id,
        v_pet_id,
        v_service_id,
        v_vet_id_1,
        v_owner_id,
        (CURRENT_DATE + INTERVAL '2 weeks') + TIME '10:00:00',
        (CURRENT_DATE + INTERVAL '2 weeks') + TIME '10:30:00',
        30,
        'Refuerzo vacuna Séxtuple anual',
        'Cita programada para refuerzo anual de vacuna Séxtuple. Por favor llegar 5 minutos antes.',
        'Recordar verificar stock de vacuna antes de la cita.',
        'scheduled',
        v_now,
        false,
        v_now,
        v_now
    )
    ON CONFLICT (id) DO UPDATE SET
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        status = EXCLUDED.status,
        updated_at = v_now;

    RAISE NOTICE 'Appointments created/updated for Max';

END $$;

-- =============================================================================
-- 6. WEIGHT HISTORY (via Medical Records with weight_kg)
-- =============================================================================
-- Note: Weight is tracked in medical_records.weight_kg and pets.weight_kg
-- We already included weight in the medical records above.
-- Here we add additional weight-only entries to show growth curve.

DO $$
DECLARE
    v_pet_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    v_tenant_id TEXT := 'adris';
    v_vet_id_1 UUID := '550e8400-e29b-41d4-a716-446655440004';
    v_birth_date DATE := CURRENT_DATE - INTERVAL '52 weeks';
    v_now TIMESTAMPTZ := NOW();
BEGIN

    -- -------------------------------------------------------------------------
    -- Weight Record at 8 weeks: 0.5kg (already in initial exam)
    -- Weight Record at 12 weeks: 1.1kg (already in vaccination visit)
    -- -------------------------------------------------------------------------

    -- -------------------------------------------------------------------------
    -- Weight Record at 16 weeks: 1.4kg
    -- -------------------------------------------------------------------------
    INSERT INTO public.medical_records (
        id,
        pet_id,
        tenant_id,
        vet_id,
        record_type,
        visit_date,
        chief_complaint,
        physical_exam,
        weight_kg,
        temperature_celsius,
        heart_rate_bpm,
        respiratory_rate_rpm,
        body_condition_score,
        diagnosis_text,
        assessment,
        treatment_plan,
        is_emergency,
        requires_followup,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'a4b5c6d7-e8f9-0123-9012-678901234567',
        v_pet_id,
        v_tenant_id,
        v_vet_id_1,
        'vaccination',
        v_birth_date + INTERVAL '16 weeks',
        'Vacunación antirrábica',
        'Cachorro en buen estado. Crecimiento normal. Desarrollo apropiado.',
        1.4,
        38.4,
        140,
        25,
        5,
        'Control de vacunación',
        'Desarrollo normal. Peso apropiado para edad y raza.',
        'Aplicar vacuna antirrábica. Siguiente control en 3 meses.',
        false,
        true,
        'Primera vacuna antirrábica administrada sin complicaciones.',
        v_birth_date + INTERVAL '16 weeks',
        v_birth_date + INTERVAL '16 weeks'
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Weight Record at 24 weeks: 1.8kg
    -- -------------------------------------------------------------------------
    INSERT INTO public.medical_records (
        id,
        pet_id,
        tenant_id,
        vet_id,
        record_type,
        visit_date,
        chief_complaint,
        physical_exam,
        weight_kg,
        temperature_celsius,
        heart_rate_bpm,
        respiratory_rate_rpm,
        body_condition_score,
        diagnosis_text,
        assessment,
        treatment_plan,
        is_emergency,
        requires_followup,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'b5c6d7e8-f9a0-1234-0123-789012345678',
        v_pet_id,
        v_tenant_id,
        v_vet_id_1,
        'checkup',
        v_birth_date + INTERVAL '24 weeks',
        'Control de desarrollo',
        'Paciente activo, buen estado general. Crecimiento continuo y saludable.',
        1.8,
        38.3,
        135,
        24,
        5,
        'Control de crecimiento - Normal',
        'Desarrollo apropiado para Chihuahua de 6 meses. Peso saludable.',
        'Continuar alimentación actual. Próximo control en 3 meses.',
        false,
        false,
        'Crecimiento excelente. Propietario muy comprometido con los cuidados.',
        v_birth_date + INTERVAL '24 weeks',
        v_birth_date + INTERVAL '24 weeks'
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = v_now;

    -- -------------------------------------------------------------------------
    -- Weight Record at 36 weeks: 2.1kg
    -- -------------------------------------------------------------------------
    INSERT INTO public.medical_records (
        id,
        pet_id,
        tenant_id,
        vet_id,
        record_type,
        visit_date,
        chief_complaint,
        physical_exam,
        weight_kg,
        temperature_celsius,
        heart_rate_bpm,
        respiratory_rate_rpm,
        body_condition_score,
        diagnosis_text,
        assessment,
        treatment_plan,
        is_emergency,
        requires_followup,
        notes,
        created_at,
        updated_at
    ) VALUES (
        'c6d7e8f9-a0b1-2345-1234-890123456789',
        v_pet_id,
        v_tenant_id,
        v_vet_id_1,
        'checkup',
        v_birth_date + INTERVAL '36 weeks',
        'Control rutinario',
        'Paciente adulto joven en excelente condición. Desarrollo completo.',
        2.1,
        38.2,
        128,
        22,
        5,
        'Control rutinario - Paciente sano',
        'Alcanzando peso adulto. Condición corporal ideal.',
        'Mantener rutina actual. Considerar cambio a alimento para adultos.',
        false,
        false,
        'Transición a alimento adulto recomendada.',
        v_birth_date + INTERVAL '36 weeks',
        v_birth_date + INTERVAL '36 weeks'
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = v_now;

    RAISE NOTICE 'Weight history records created/updated for Max';

END $$;

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- This seed file creates the following data for Max the Chihuahua:
--
-- PET:
--   - Max, male Chihuahua, ~1 year old, 2.3kg
--   - Owned by Ana María González (existing demo owner)
--   - Registered at Veterinaria Adris
--
-- VACCINES (6 records):
--   1. Séxtuple 1ra Dosis (6 weeks) - completed
--   2. Séxtuple 2da Dosis (9 weeks) - completed
--   3. Séxtuple 3ra Dosis (12 weeks) - completed
--   4. Antirrábica (16 weeks) - completed
--   5. Antirrábica Refuerzo (3 months ago) - completed
--   6. Séxtuple Refuerzo (scheduled for 2 weeks from now)
--
-- MEDICAL RECORDS (7 records):
--   1. Initial Wellness Exam (6 weeks) - weight: 0.5kg
--   2. Vaccination Visit (12 weeks) - weight: 1.1kg
--   3. Weight check (16 weeks) - weight: 1.4kg
--   4. Weight check (24 weeks) - weight: 1.8kg
--   5. Weight check (36 weeks) - weight: 2.1kg
--   6. Ear Infection (5 months ago) - weight: 2.0kg
--   7. Annual Checkup (1 week ago) - weight: 2.3kg
--
-- APPOINTMENTS (3 records):
--   1. Annual Wellness Exam (1 week ago) - completed
--   2. Vaccination (3 months ago) - completed
--   3. Upcoming Vaccine Booster (2 weeks from now) - scheduled
--
-- WEIGHT PROGRESSION:
--   8 weeks:  0.5kg
--   12 weeks: 1.1kg
--   16 weeks: 1.4kg
--   24 weeks: 1.8kg
--   36 weeks: 2.1kg
--   52 weeks: 2.3kg (current)
-- =============================================================================

-- Verification query (optional - run separately if needed)
-- SELECT 'Pets' as entity, COUNT(*) as count FROM pets WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- UNION ALL
-- SELECT 'Vaccines', COUNT(*) FROM vaccines WHERE pet_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- UNION ALL
-- SELECT 'Medical Records', COUNT(*) FROM medical_records WHERE pet_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- UNION ALL
-- SELECT 'Appointments', COUNT(*) FROM appointments WHERE pet_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
