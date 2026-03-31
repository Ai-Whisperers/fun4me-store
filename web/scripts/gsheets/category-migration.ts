/**
 * Category Code Migration Script
 * Converts verbose slugs to hierarchical short codes
 *
 * Format:
 * - Level 1: 3 letters (e.g., ALP = Alimento Perros)
 * - Level 2: PARENT-SUB (e.g., ALP-SEC = Alimento Seco Perros)
 */

// Level 1 category codes (25 categories)
export const LEVEL1_CODES: Record<string, string> = {
  'alimento-perros': 'ALP',
  'alimento-gatos': 'ALG',
  antiparasitarios: 'ANT',
  higiene: 'HIG',
  'arena-sanitaria': 'ARE',
  juguetes: 'JUG',
  'snacks-premios': 'SNK',
  accesorios: 'ACC',
  'camas-casas': 'CAM',
  suplementos: 'SUP',
  farmacia: 'FAR',
  aves: 'AVE',
  peces: 'PEC',
  roedores: 'ROE',
  'equipos-veterinarios': 'EQV',
  'instrumental-quirurgico': 'INQ',
  'consumibles-medicos': 'CON',
  'vacunas-biologicos': 'VAC',
  'anestesia-sedacion': 'ANE',
  'laboratorio-veterinario': 'LAB',
  'odontologia-veterinaria': 'ODO',
  fluidoterapia: 'FLU',
  'mobiliario-clinico': 'MOB',
  esterilizacion: 'EST',
  'uniformes-epp': 'UNI',
}

// Level 2 category codes (old slug → new code)
export const LEVEL2_CODES: Record<string, { code: string; parent: string }> = {
  // === ALP (Alimento Perros) ===
  'alimento-seco-perros': { code: 'ALP-SEC', parent: 'ALP' },
  'alimento-humedo-perros': { code: 'ALP-HUM', parent: 'ALP' },
  'alimento-medicado-perros': { code: 'ALP-MED', parent: 'ALP' },
  'alimento-cachorros': { code: 'ALP-CAC', parent: 'ALP' },
  'alimento-senior-perros': { code: 'ALP-SEN', parent: 'ALP' },

  // === ALG (Alimento Gatos) ===
  'alimento-gatos-adultos': { code: 'ALG-ADU', parent: 'ALG' },
  'alimento-humedo-gatos': { code: 'ALG-HUM', parent: 'ALG' },
  'alimento-medicado-gatos': { code: 'ALG-MED', parent: 'ALG' },
  'alimento-gatitos': { code: 'ALG-GAT', parent: 'ALG' },
  'alimento-castrados': { code: 'ALG-CAS', parent: 'ALG' },

  // === ANT (Antiparasitarios) ===
  'antiparasitarios-perros': { code: 'ANT-PER', parent: 'ANT' },
  'antiparasitarios-gatos': { code: 'ANT-GAT', parent: 'ANT' },
  'collares-antiparasitarios': { code: 'ANT-COL', parent: 'ANT' },
  'desparasitantes-internos': { code: 'ANT-INT', parent: 'ANT' },

  // === HIG (Higiene) ===
  'higiene-mascotas': { code: 'HIG-GEN', parent: 'HIG' },
  shampoos: { code: 'HIG-SHA', parent: 'HIG' },
  'cuidado-dental': { code: 'HIG-DEN', parent: 'HIG' },
  'cuidado-oidos-ojos': { code: 'HIG-OJO', parent: 'HIG' },
  'cepillos-peines': { code: 'HIG-CEP', parent: 'HIG' },

  // === ARE (Arena Sanitaria) ===
  'arena-aglomerante': { code: 'ARE-AGL', parent: 'ARE' },
  'arena-absorbente': { code: 'ARE-ABS', parent: 'ARE' },
  'arena-silica': { code: 'ARE-SIL', parent: 'ARE' },
  'areneros-gatos': { code: 'ARE-BAN', parent: 'ARE' },

  // === JUG (Juguetes) ===
  'juguetes-perros': { code: 'JUG-PER', parent: 'JUG' },
  'juguetes-gatos': { code: 'JUG-GAT', parent: 'JUG' },
  'juguetes-rellenables': { code: 'JUG-REL', parent: 'JUG' },
  pelotas: { code: 'JUG-PEL', parent: 'JUG' },

  // === SNK (Snacks y Premios) ===
  'snacks-perros': { code: 'SNK-PER', parent: 'SNK' },
  'snacks-gatos': { code: 'SNK-GAT', parent: 'SNK' },
  'huesos-naturales': { code: 'SNK-HUE', parent: 'SNK' },
  'snacks-dentales': { code: 'SNK-DEN', parent: 'SNK' },

  // === ACC (Accesorios) ===
  'collares-correas': { code: 'ACC-COL', parent: 'ACC' },
  'comederos-bebederos': { code: 'ACC-COM', parent: 'ACC' },
  transportadoras: { code: 'ACC-TRA', parent: 'ACC' },
  'ropa-mascotas': { code: 'ACC-ROP', parent: 'ACC' },
  'accesorios-gatos': { code: 'ACC-GAT', parent: 'ACC' },
  'accesorios-perros': { code: 'ACC-PER', parent: 'ACC' },
  'comederos-gatos': { code: 'ACC-CGT', parent: 'ACC' },
  'comederos-perros': { code: 'ACC-CPR', parent: 'ACC' },

  // === CAM (Camas y Casas) ===
  'camas-perros': { code: 'CAM-PER', parent: 'CAM' },
  'camas-gatos': { code: 'CAM-GAT', parent: 'CAM' },
  rascadores: { code: 'CAM-RAS', parent: 'CAM' },
  'rascadores-gatos': { code: 'CAM-RGT', parent: 'CAM' },
  'cuchas-exterior': { code: 'CAM-EXT', parent: 'CAM' },

  // === SUP (Suplementos) ===
  vitaminas: { code: 'SUP-VIT', parent: 'SUP' },
  'omega-piel': { code: 'SUP-OME', parent: 'SUP' },
  articulaciones: { code: 'SUP-ART', parent: 'SUP' },
  probioticos: { code: 'SUP-PRO', parent: 'SUP' },

  // === FAR (Farmacia) ===
  antibioticos: { code: 'FAR-ANT', parent: 'FAR' },
  antiinflamatorios: { code: 'FAR-INF', parent: 'FAR' },
  dermatologicos: { code: 'FAR-DER', parent: 'FAR' },
  'oftalmicos-oticos': { code: 'FAR-OFT', parent: 'FAR' },

  // === AVE (Aves) ===
  'alimento-aves': { code: 'AVE-ALI', parent: 'AVE' },
  'jaulas-aves': { code: 'AVE-JAU', parent: 'AVE' },
  'accesorios-aves': { code: 'AVE-ACC', parent: 'AVE' },

  // === PEC (Peces) ===
  'alimento-peces': { code: 'PEC-ALI', parent: 'PEC' },
  acuarios: { code: 'PEC-ACU', parent: 'PEC' },
  'filtros-bombas': { code: 'PEC-FIL', parent: 'PEC' },
  'decoracion-acuarios': { code: 'PEC-DEC', parent: 'PEC' },

  // === ROE (Roedores) ===
  'alimento-roedores': { code: 'ROE-ALI', parent: 'ROE' },
  'jaulas-roedores': { code: 'ROE-JAU', parent: 'ROE' },
  'accesorios-roedores': { code: 'ROE-ACC', parent: 'ROE' },
  'sustrato-roedores': { code: 'ROE-SUS', parent: 'ROE' },

  // === EQV (Equipos Veterinarios) ===
  diagnostico: { code: 'EQV-DIA', parent: 'EQV' },
  monitorizacion: { code: 'EQV-MON', parent: 'EQV' },
  'termometros-basculas': { code: 'EQV-TER', parent: 'EQV' },
  'iluminacion-medica': { code: 'EQV-ILU', parent: 'EQV' },

  // === INQ (Instrumental Quirúrgico) ===
  'bisturis-tijeras': { code: 'INQ-BIS', parent: 'INQ' },
  'pinzas-clamps': { code: 'INQ-PIN', parent: 'INQ' },
  'porta-agujas-suturas': { code: 'INQ-SUT', parent: 'INQ' },
  'retractores-separadores': { code: 'INQ-RET', parent: 'INQ' },
  'sets-quirurgicos': { code: 'INQ-SET', parent: 'INQ' },

  // === CON (Consumibles Médicos) ===
  'jeringas-agujas': { code: 'CON-JER', parent: 'CON' },
  'cateteres-sondas': { code: 'CON-CAT', parent: 'CON' },
  'vendajes-gasas': { code: 'CON-VEN', parent: 'CON' },
  'guantes-mascarillas': { code: 'CON-GUA', parent: 'CON' },
  'tubos-muestras': { code: 'CON-TUB', parent: 'CON' },

  // === VAC (Vacunas) ===
  'vacunas-perros': { code: 'VAC-PER', parent: 'VAC' },
  'vacunas-gatos': { code: 'VAC-GAT', parent: 'VAC' },
  'vacunas-otras-especies': { code: 'VAC-OTR', parent: 'VAC' },

  // === ANE (Anestesia) ===
  'anestesicos-inyectables': { code: 'ANE-INY', parent: 'ANE' },
  'anestesicos-inhalatorios': { code: 'ANE-INH', parent: 'ANE' },
  'equipos-anestesia': { code: 'ANE-EQU', parent: 'ANE' },
  'tubos-endotraqueales': { code: 'ANE-TUB', parent: 'ANE' },

  // === LAB (Laboratorio) ===
  'tests-rapidos': { code: 'LAB-TES', parent: 'LAB' },
  hematologia: { code: 'LAB-HEM', parent: 'LAB' },
  bioquimica: { code: 'LAB-BIO', parent: 'LAB' },
  microscopia: { code: 'LAB-MIC', parent: 'LAB' },
  centrifugas: { code: 'LAB-CEN', parent: 'LAB' },

  // === ODO (Odontología) ===
  'instrumental-dental': { code: 'ODO-INS', parent: 'ODO' },
  'equipos-dentales': { code: 'ODO-EQU', parent: 'ODO' },
  'profilaxis-dental': { code: 'ODO-PRO', parent: 'ODO' },

  // === FLU (Fluidoterapia) ===
  'soluciones-iv': { code: 'FLU-SOL', parent: 'FLU' },
  'equipos-infusion': { code: 'FLU-EQU', parent: 'FLU' },
  'cateteres-iv': { code: 'FLU-CAT', parent: 'FLU' },

  // === MOB (Mobiliario) ===
  'mesas-examen': { code: 'MOB-EXA', parent: 'MOB' },
  'mesas-cirugia': { code: 'MOB-CIR', parent: 'MOB' },
  'jaulas-hospitalizacion': { code: 'MOB-HOS', parent: 'MOB' },
  'carros-instrumentos': { code: 'MOB-CAR', parent: 'MOB' },

  // === EST (Esterilización) ===
  autoclaves: { code: 'EST-AUT', parent: 'EST' },
  'indicadores-esterilizacion': { code: 'EST-IND', parent: 'EST' },
  'bolsas-esterilizacion': { code: 'EST-BOL', parent: 'EST' },

  // === UNI (Uniformes) ===
  'batas-scrubs': { code: 'UNI-BAT', parent: 'UNI' },
  'proteccion-radiologica': { code: 'UNI-RAD', parent: 'UNI' },
  'calzado-medico': { code: 'UNI-CAL', parent: 'UNI' },
}

// Combined mapping (old slug → new code)
export const SLUG_TO_CODE: Record<string, string> = {
  ...LEVEL1_CODES,
  ...Object.fromEntries(Object.entries(LEVEL2_CODES).map(([slug, { code }]) => [slug, code])),
}

// Reverse mapping (new code → old slug)
export const CODE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_CODE).map(([slug, code]) => [code, slug])
)

// Get parent code for a Level 2 category
export function getParentCode(code: string): string | null {
  const entry = Object.entries(LEVEL2_CODES).find(([, v]) => v.code === code)
  return entry ? entry[1].parent : null
}

// Convert old slug to new code
export function slugToCode(slug: string): string {
  return SLUG_TO_CODE[slug] || slug
}

// Convert new code to old slug
export function codeToSlug(code: string): string {
  return CODE_TO_SLUG[code] || code
}

// Test/validation
if (process.argv[1]?.includes('category-migration')) {
  console.log('\n=== Category Code Migration ===\n')
  console.log(`Level 1 categories: ${Object.keys(LEVEL1_CODES).length}`)
  console.log(`Level 2 categories: ${Object.keys(LEVEL2_CODES).length}`)
  console.log(`Total categories: ${Object.keys(SLUG_TO_CODE).length}`)

  console.log('\n--- Sample mappings ---')
  console.log('alimento-seco-perros →', slugToCode('alimento-seco-perros'))
  console.log('ALP-SEC →', codeToSlug('ALP-SEC'))
  console.log('Parent of ALP-SEC:', getParentCode('ALP-SEC'))
}
