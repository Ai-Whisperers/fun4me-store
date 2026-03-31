-- =============================================================================
-- 037_VACCINE_PROTOCOLS_RLS_SEED.SQL
-- =============================================================================
-- Add RLS policies and seed data for vaccine_protocols table
-- =============================================================================

-- Enable RLS
ALTER TABLE public.vaccine_protocols ENABLE ROW LEVEL SECURITY;

-- Public read for vaccine protocols (reference data)
DROP POLICY IF EXISTS "Public read vaccine protocols" ON public.vaccine_protocols;
CREATE POLICY "Public read vaccine protocols" ON public.vaccine_protocols
    FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manage vaccine protocols" ON public.vaccine_protocols;
CREATE POLICY "Service role manage vaccine protocols" ON public.vaccine_protocols
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- SEED DATA: Standard Vaccine Protocols for Dogs and Cats
-- =============================================================================

-- DOG CORE VACCINES
INSERT INTO public.vaccine_protocols (vaccine_name, vaccine_code, species, protocol_type, diseases_prevented, first_dose_weeks, booster_weeks, revaccination_months, notes)
VALUES
    ('Rabia', 'RABIES', 'dog', 'core', ARRAY['Rabia'], 12, ARRAY[16], 12, 'Vacuna obligatoria por ley. Primera dosis a las 12 semanas, refuerzo anual.'),
    ('Parvovirus', 'PARVO', 'dog', 'core', ARRAY['Parvovirus canino'], 6, ARRAY[8, 12, 16], 12, 'Enfermedad altamente contagiosa y mortal. Serie de 3-4 dosis.'),
    ('Moquillo', 'DISTEMPER', 'dog', 'core', ARRAY['Distemper canino'], 6, ARRAY[8, 12, 16], 12, 'Virus altamente contagioso que afecta múltiples sistemas.'),
    ('Hepatitis Infecciosa', 'ADENO', 'dog', 'core', ARRAY['Hepatitis infecciosa canina', 'Adenovirus tipo 1 y 2'], 6, ARRAY[8, 12, 16], 12, 'Protege contra hepatitis y tos de las perreras.'),
    ('Leptospirosis', 'LEPTO', 'dog', 'core', ARRAY['Leptospirosis'], 8, ARRAY[12], 12, 'Enfermedad zoonótica transmitida por agua contaminada.')
ON CONFLICT (vaccine_code) DO NOTHING;

-- DOG NON-CORE (RECOMMENDED) VACCINES
INSERT INTO public.vaccine_protocols (vaccine_name, vaccine_code, species, protocol_type, diseases_prevented, first_dose_weeks, booster_weeks, revaccination_months, notes)
VALUES
    ('Bordetella (Tos de las Perreras)', 'BORD', 'dog', 'non-core', ARRAY['Bordetella bronchiseptica', 'Tos de las perreras'], 8, ARRAY[12], 12, 'Recomendada para perros en guarderías, peluquerías o parques.'),
    ('Parainfluenza', 'CPIV', 'dog', 'non-core', ARRAY['Parainfluenza canina'], 6, ARRAY[8, 12], 12, 'Componente de tos de las perreras. Generalmente incluida en vacuna múltiple.'),
    ('Coronavirus Canino', 'CCV', 'dog', 'non-core', ARRAY['Coronavirus canino'], 6, ARRAY[9, 12], 12, 'Causa gastroenteritis leve. No relacionado con COVID-19.')
ON CONFLICT (vaccine_code) DO NOTHING;

-- DOG LIFESTYLE VACCINES
INSERT INTO public.vaccine_protocols (vaccine_name, vaccine_code, species, protocol_type, diseases_prevented, first_dose_weeks, revaccination_months, notes)
VALUES
    ('Lyme (Borreliosis)', 'LYME', 'dog', 'lifestyle', ARRAY['Enfermedad de Lyme'], 12, 12, 'Solo en áreas endémicas de garrapatas.'),
    ('Influenza Canina', 'CIV', 'dog', 'lifestyle', ARRAY['Influenza canina H3N8', 'Influenza canina H3N2'], 8, 12, 'Para perros en áreas con brotes confirmados.')
ON CONFLICT (vaccine_code) DO NOTHING;

-- CAT CORE VACCINES
INSERT INTO public.vaccine_protocols (vaccine_name, vaccine_code, species, protocol_type, diseases_prevented, first_dose_weeks, booster_weeks, revaccination_months, notes)
VALUES
    ('Rabia Felina', 'RABIES_CAT', 'cat', 'core', ARRAY['Rabia'], 12, ARRAY[16], 12, 'Vacuna obligatoria por ley. Primera dosis a las 12 semanas.'),
    ('Panleucopenia Felina', 'FPV', 'cat', 'core', ARRAY['Panleucopenia felina', 'Parvovirus felino'], 6, ARRAY[9, 12], 36, 'Enfermedad viral altamente contagiosa y mortal.'),
    ('Rinotraqueítis (Herpesvirus)', 'FHV', 'cat', 'core', ARRAY['Herpesvirus felino tipo 1', 'Rinotraqueítis'], 6, ARRAY[9, 12], 12, 'Causa infecciones respiratorias y oculares crónicas.'),
    ('Calicivirus Felino', 'FCV', 'cat', 'core', ARRAY['Calicivirus felino'], 6, ARRAY[9, 12], 12, 'Causa infecciones respiratorias y úlceras bucales.')
ON CONFLICT (vaccine_code) DO NOTHING;

-- CAT NON-CORE (RECOMMENDED) VACCINES
INSERT INTO public.vaccine_protocols (vaccine_name, vaccine_code, species, protocol_type, diseases_prevented, first_dose_weeks, booster_weeks, revaccination_months, notes)
VALUES
    ('Leucemia Felina (FeLV)', 'FELV', 'cat', 'non-core', ARRAY['Virus de leucemia felina'], 8, ARRAY[12], 12, 'Recomendada para gatos con acceso al exterior. Requiere prueba negativa previa.'),
    ('Clamidia Felina', 'CHLAM', 'cat', 'non-core', ARRAY['Chlamydophila felis'], 9, ARRAY[12], 12, 'Para gatos en hogares con múltiples gatos o criaderos.'),
    ('Bordetella Felina', 'BORD_CAT', 'cat', 'non-core', ARRAY['Bordetella bronchiseptica'], 8, NULL, 12, 'Para gatos en refugios o colonias.')
ON CONFLICT (vaccine_code) DO NOTHING;

-- CAT LIFESTYLE VACCINES
INSERT INTO public.vaccine_protocols (vaccine_name, vaccine_code, species, protocol_type, diseases_prevented, first_dose_weeks, revaccination_months, notes)
VALUES
    ('Inmunodeficiencia Felina (FIV)', 'FIV', 'cat', 'lifestyle', ARRAY['Virus de inmunodeficiencia felina'], 8, 12, 'Solo para gatos de alto riesgo con acceso al exterior.')
ON CONFLICT (vaccine_code) DO NOTHING;

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_vaccine_protocols_species ON public.vaccine_protocols(species);
CREATE INDEX IF NOT EXISTS idx_vaccine_protocols_type ON public.vaccine_protocols(protocol_type);
CREATE INDEX IF NOT EXISTS idx_vaccine_protocols_active ON public.vaccine_protocols(id) WHERE deleted_at IS NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================
DROP TRIGGER IF EXISTS handle_updated_at ON public.vaccine_protocols;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.vaccine_protocols
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
