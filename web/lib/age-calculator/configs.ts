/**
 * Age Calculator Configuration Data
 * Contains all static configuration for species, breeds, life stages, and calculations.
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type Species =
  | 'dog'
  | 'cat'
  | 'rabbit'
  | 'hamster'
  | 'guinea_pig'
  | 'bird'
  | 'ferret'
  | 'horse'
  | 'turtle'
  | 'fish'
export type DogSize = 'toy' | 'small' | 'medium' | 'large' | 'giant'
export type CatType = 'indoor' | 'outdoor' | 'mixed'
export type BirdCategory = 'finch' | 'parakeet' | 'cockatiel' | 'parrot' | 'macaw'
export type TurtleType = 'aquatic' | 'terrestrial'
export type FishType = 'tropical' | 'goldfish' | 'koi'

export interface SpeciesConfig {
  label: string
  labelPlural: string
  icon: string
  emoji: string
  avgLifespan: { min: number; max: number }
  description: string
  hasSubOptions: boolean
  sources: string[]
}

export interface SizeConfig {
  label: string
  description: string
  weightRange?: string
  multiplier: number
  seniorAge: number
  year1Equiv: number
  year2Equiv: number
}

export interface LifeStageConfig {
  key: 'puppy' | 'junior' | 'adult' | 'mature' | 'senior' | 'geriatric'
  label: string
  color: string
  icon: string
  description: string
  checkupFrequency: string
  dietTips: string
  exerciseTips: string
}

// =============================================================================
// SPECIES CONFIGURATION
// =============================================================================

export const SPECIES_CONFIG: Record<Species, SpeciesConfig> = {
  dog: {
    label: 'Perro',
    labelPlural: 'Perros',
    icon: 'Dog',
    emoji: '🐕',
    avgLifespan: { min: 10, max: 13 },
    description: 'El envejecimiento varía significativamente según el tamaño de la raza.',
    hasSubOptions: true,
    sources: ['American Veterinary Medical Association', 'UCSD Epigenetic Clock Study (2019)'],
  },
  cat: {
    label: 'Gato',
    labelPlural: 'Gatos',
    icon: 'Cat',
    emoji: '🐈',
    avgLifespan: { min: 12, max: 18 },
    description: 'Los gatos de interior viven significativamente más que los de exterior.',
    hasSubOptions: true,
    sources: [
      'American Association of Feline Practitioners',
      'Journal of Feline Medicine and Surgery',
    ],
  },
  rabbit: {
    label: 'Conejo',
    labelPlural: 'Conejos',
    icon: 'Rabbit',
    emoji: '🐰',
    avgLifespan: { min: 8, max: 12 },
    description: 'Los conejos domésticos bien cuidados pueden vivir más de 10 años.',
    hasSubOptions: false,
    sources: ['House Rabbit Society', 'Rabbit Welfare Association'],
  },
  hamster: {
    label: 'Hámster',
    labelPlural: 'Hámsteres',
    icon: 'Squirrel',
    emoji: '🐹',
    avgLifespan: { min: 2, max: 3 },
    description: 'Vida corta pero intensa. Cada mes cuenta significativamente.',
    hasSubOptions: false,
    sources: ['American Hamster Association'],
  },
  guinea_pig: {
    label: 'Cobayo',
    labelPlural: 'Cobayos',
    icon: 'Squirrel',
    emoji: '🐹',
    avgLifespan: { min: 5, max: 7 },
    description: 'También conocido como cuy o conejillo de indias.',
    hasSubOptions: false,
    sources: ['Guinea Pig Veterinary Guidelines'],
  },
  bird: {
    label: 'Ave',
    labelPlural: 'Aves',
    icon: 'Bird',
    emoji: '🦜',
    avgLifespan: { min: 5, max: 80 },
    description: 'La esperanza de vida varía enormemente según la especie.',
    hasSubOptions: true,
    sources: ['Association of Avian Veterinarians'],
  },
  ferret: {
    label: 'Hurón',
    labelPlural: 'Hurones',
    icon: 'Squirrel',
    emoji: '🦡',
    avgLifespan: { min: 6, max: 10 },
    description: 'Propensos a problemas adrenales y insulinoma después de los 3 años.',
    hasSubOptions: false,
    sources: ['American Ferret Association'],
  },
  horse: {
    label: 'Caballo',
    labelPlural: 'Caballos',
    icon: 'Cherry',
    emoji: '🐴',
    avgLifespan: { min: 25, max: 30 },
    description: 'Los ponis suelen vivir más que los caballos de razas grandes.',
    hasSubOptions: false,
    sources: ['American Association of Equine Practitioners'],
  },
  turtle: {
    label: 'Tortuga',
    labelPlural: 'Tortugas',
    icon: 'Shell',
    emoji: '🐢',
    avgLifespan: { min: 20, max: 100 },
    description: 'Algunas especies pueden vivir más de un siglo.',
    hasSubOptions: true,
    sources: ['Turtle Survival Alliance'],
  },
  fish: {
    label: 'Pez',
    labelPlural: 'Peces',
    icon: 'Fish',
    emoji: '🐠',
    avgLifespan: { min: 2, max: 25 },
    description: 'La longevidad depende mucho de la especie y calidad del agua.',
    hasSubOptions: true,
    sources: ['World Aquaculture Society'],
  },
}

// =============================================================================
// DOG SIZE CONFIGURATION (Research-based)
// =============================================================================

export const DOG_SIZE_CONFIG: Record<DogSize, SizeConfig> = {
  toy: {
    label: 'Toy / Miniatura',
    description: 'Chihuahua, Yorkshire, Pomerania',
    weightRange: '< 4 kg',
    multiplier: 4.0,
    seniorAge: 11,
    year1Equiv: 15,
    year2Equiv: 24,
  },
  small: {
    label: 'Pequeño',
    description: 'Beagle, Cocker Spaniel, Bulldog Francés',
    weightRange: '4-10 kg',
    multiplier: 4.5,
    seniorAge: 10,
    year1Equiv: 15,
    year2Equiv: 24,
  },
  medium: {
    label: 'Mediano',
    description: 'Border Collie, Bulldog Inglés, Husky',
    weightRange: '10-25 kg',
    multiplier: 5.0,
    seniorAge: 8,
    year1Equiv: 15,
    year2Equiv: 24,
  },
  large: {
    label: 'Grande',
    description: 'Labrador, Golden Retriever, Pastor Alemán',
    weightRange: '25-45 kg',
    multiplier: 5.5,
    seniorAge: 7,
    year1Equiv: 15,
    year2Equiv: 24,
  },
  giant: {
    label: 'Gigante',
    description: 'Gran Danés, San Bernardo, Mastín',
    weightRange: '> 45 kg',
    multiplier: 7.0,
    seniorAge: 5,
    year1Equiv: 12,
    year2Equiv: 22,
  },
}

// =============================================================================
// CAT TYPE CONFIGURATION
// =============================================================================

export const CAT_TYPE_CONFIG: Record<CatType, SizeConfig> = {
  indoor: {
    label: 'Interior',
    description: 'Vive exclusivamente dentro de casa',
    multiplier: 4.0,
    seniorAge: 11,
    year1Equiv: 15,
    year2Equiv: 24,
  },
  outdoor: {
    label: 'Exterior',
    description: 'Acceso libre al exterior',
    multiplier: 4.5,
    seniorAge: 8,
    year1Equiv: 15,
    year2Equiv: 24,
  },
  mixed: {
    label: 'Mixto',
    description: 'Interior con salidas supervisadas',
    multiplier: 4.2,
    seniorAge: 10,
    year1Equiv: 15,
    year2Equiv: 24,
  },
}

// =============================================================================
// BIRD CATEGORY CONFIGURATION
// =============================================================================

export const BIRD_CONFIG: Record<
  BirdCategory,
  SizeConfig & { avgLifespan: { min: number; max: number } }
> = {
  finch: {
    label: 'Pinzón / Canario',
    description: 'Aves pequeñas de jaula',
    multiplier: 7.0,
    seniorAge: 5,
    year1Equiv: 20,
    year2Equiv: 30,
    avgLifespan: { min: 5, max: 10 },
  },
  parakeet: {
    label: 'Periquito',
    description: 'Periquito australiano, inglés',
    multiplier: 5.5,
    seniorAge: 6,
    year1Equiv: 18,
    year2Equiv: 28,
    avgLifespan: { min: 7, max: 15 },
  },
  cockatiel: {
    label: 'Cockatiel / Agaporni',
    description: 'Aves medianas sociables',
    multiplier: 3.5,
    seniorAge: 12,
    year1Equiv: 15,
    year2Equiv: 22,
    avgLifespan: { min: 15, max: 25 },
  },
  parrot: {
    label: 'Loro / Cotorra',
    description: 'Amazonas, Grises, Eclectus',
    multiplier: 1.5,
    seniorAge: 30,
    year1Equiv: 8,
    year2Equiv: 12,
    avgLifespan: { min: 40, max: 60 },
  },
  macaw: {
    label: 'Guacamaya / Cacatúa',
    description: 'Aves grandes y longevas',
    multiplier: 1.0,
    seniorAge: 40,
    year1Equiv: 5,
    year2Equiv: 8,
    avgLifespan: { min: 50, max: 80 },
  },
}

// =============================================================================
// OTHER SPECIES CONFIGURATION
// =============================================================================

export const OTHER_SPECIES_CONFIG: Record<string, SizeConfig> = {
  rabbit: {
    label: 'Conejo doméstico',
    description: 'Razas enanas viven más',
    multiplier: 6.0,
    seniorAge: 6,
    year1Equiv: 21,
    year2Equiv: 27,
  },
  hamster: {
    label: 'Hámster sirio/enano',
    description: 'Vida muy corta e intensa',
    multiplier: 25.0,
    seniorAge: 1.5,
    year1Equiv: 26,
    year2Equiv: 45,
  },
  guinea_pig: {
    label: 'Cobayo/Cuy',
    description: 'Muy social, vive en grupos',
    multiplier: 10.0,
    seniorAge: 4,
    year1Equiv: 15,
    year2Equiv: 25,
  },
  ferret: {
    label: 'Hurón doméstico',
    description: 'Propenso a enfermedades después de 3 años',
    multiplier: 6.0,
    seniorAge: 5,
    year1Equiv: 14,
    year2Equiv: 24,
  },
  horse: {
    label: 'Caballo/Poni',
    description: 'Los ponis viven más',
    multiplier: 2.5,
    seniorAge: 20,
    year1Equiv: 6,
    year2Equiv: 13,
  },
  turtle_aquatic: {
    label: 'Tortuga acuática',
    description: 'Orejas rojas, pintadas',
    multiplier: 1.0,
    seniorAge: 25,
    year1Equiv: 2,
    year2Equiv: 4,
  },
  turtle_terrestrial: {
    label: 'Tortuga terrestre',
    description: 'Sulcata, leopardo, mediterránea',
    multiplier: 0.5,
    seniorAge: 50,
    year1Equiv: 1,
    year2Equiv: 2,
  },
  fish_tropical: {
    label: 'Pez tropical',
    description: 'Bettas, tetras, guppies',
    multiplier: 15.0,
    seniorAge: 2,
    year1Equiv: 25,
    year2Equiv: 40,
  },
  fish_goldfish: {
    label: 'Pez dorado',
    description: 'Goldfish, cometa, shubunkin',
    multiplier: 4.0,
    seniorAge: 8,
    year1Equiv: 10,
    year2Equiv: 18,
  },
  fish_koi: {
    label: 'Koi / Carpa',
    description: 'Muy longevos en estanques',
    multiplier: 2.0,
    seniorAge: 20,
    year1Equiv: 5,
    year2Equiv: 10,
  },
}

// =============================================================================
// LIFE STAGES CONFIGURATION
// =============================================================================

export const LIFE_STAGES: Record<string, Omit<LifeStageConfig, 'ageRange'>> = {
  puppy: {
    key: 'puppy',
    label: 'Cachorro',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: 'Baby',
    description: 'Fase de crecimiento rápido y desarrollo neurológico crítico.',
    checkupFrequency: 'Mensual durante el primer año',
    dietTips: 'Alimento específico para cachorros con alto contenido proteico.',
    exerciseTips: 'Ejercicio moderado; evitar impacto en articulaciones en desarrollo.',
  },
  junior: {
    key: 'junior',
    label: 'Juvenil',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: 'Zap',
    description: 'Adolescencia con alta energía y consolidación del comportamiento.',
    checkupFrequency: 'Cada 6 meses',
    dietTips: 'Transición gradual a alimento adulto según tamaño.',
    exerciseTips: 'Alta actividad física para canalizar energía.',
  },
  adult: {
    key: 'adult',
    label: 'Adulto',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'ShieldCheck',
    description: 'Madurez física completa. Mejor momento para mantener hábitos saludables.',
    checkupFrequency: 'Anual',
    dietTips: 'Dieta de mantenimiento; controlar porciones para evitar obesidad.',
    exerciseTips: 'Rutina regular de ejercicio según la especie.',
  },
  mature: {
    key: 'mature',
    label: 'Maduro',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: 'Clock',
    description: 'Inicio del envejecimiento. Pueden aparecer primeros signos de edad.',
    checkupFrequency: 'Cada 6 meses con análisis de sangre',
    dietTips: 'Considerar alimento para adultos mayores; suplementos articulares.',
    exerciseTips: 'Mantener actividad pero reducir intensidad si hay rigidez.',
  },
  senior: {
    key: 'senior',
    label: 'Senior',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: 'Heart',
    description: 'Etapa geriátrica. Requiere cuidados preventivos especializados.',
    checkupFrequency: 'Cada 4-6 meses con chequeo geriátrico completo',
    dietTips: 'Alimento senior; proteína de alta calidad; control de fósforo.',
    exerciseTips: 'Ejercicio suave y regular; caminatas cortas frecuentes.',
  },
  geriatric: {
    key: 'geriatric',
    label: 'Geriátrico',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: 'HeartHandshake',
    description: 'Etapa final. Enfoque en calidad de vida y comodidad.',
    checkupFrequency: 'Cada 3-4 meses o según necesidad',
    dietTips: 'Alimento muy digestible; considerar alimentación blanda.',
    exerciseTips: 'Solo lo que el animal tolere cómodamente.',
  },
}

// =============================================================================
// AGE PRESETS (for quick selection)
// =============================================================================

export const getAgePresets = (
  species: Species,
  birdCategory?: BirdCategory,
  turtleType?: TurtleType,
  fishType?: FishType
): Array<{ value: number; unit: string }> => {
  switch (species) {
    case 'hamster':
      return [
        { value: 3, unit: 'months' },
        { value: 6, unit: 'months' },
        { value: 1, unit: 'years' },
        { value: 1.5, unit: 'years' },
        { value: 2, unit: 'years' },
        { value: 2.5, unit: 'years' },
      ]
    case 'guinea_pig':
      return [
        { value: 6, unit: 'months' },
        { value: 1, unit: 'years' },
        { value: 2, unit: 'years' },
        { value: 3, unit: 'years' },
        { value: 4, unit: 'years' },
        { value: 5, unit: 'years' },
        { value: 6, unit: 'years' },
      ]
    case 'rabbit':
    case 'ferret':
      return [
        { value: 6, unit: 'months' },
        { value: 1, unit: 'years' },
        { value: 2, unit: 'years' },
        { value: 4, unit: 'years' },
        { value: 6, unit: 'years' },
        { value: 8, unit: 'years' },
      ]
    case 'horse':
      return [
        { value: 1, unit: 'years' },
        { value: 3, unit: 'years' },
        { value: 5, unit: 'years' },
        { value: 10, unit: 'years' },
        { value: 15, unit: 'years' },
        { value: 20, unit: 'years' },
        { value: 25, unit: 'years' },
      ]
    case 'turtle':
      return turtleType === 'terrestrial'
        ? [
            { value: 5, unit: 'years' },
            { value: 10, unit: 'years' },
            { value: 25, unit: 'years' },
            { value: 50, unit: 'years' },
            { value: 75, unit: 'years' },
            { value: 100, unit: 'years' },
          ]
        : [
            { value: 1, unit: 'years' },
            { value: 5, unit: 'years' },
            { value: 10, unit: 'years' },
            { value: 15, unit: 'years' },
            { value: 20, unit: 'years' },
            { value: 25, unit: 'years' },
          ]
    case 'fish':
      return fishType === 'koi'
        ? [
            { value: 1, unit: 'years' },
            { value: 5, unit: 'years' },
            { value: 10, unit: 'years' },
            { value: 15, unit: 'years' },
            { value: 20, unit: 'years' },
          ]
        : [
            { value: 6, unit: 'months' },
            { value: 1, unit: 'years' },
            { value: 2, unit: 'years' },
            { value: 3, unit: 'years' },
            { value: 5, unit: 'years' },
          ]
    case 'bird':
      if (birdCategory === 'macaw' || birdCategory === 'parrot') {
        return [
          { value: 1, unit: 'years' },
          { value: 5, unit: 'years' },
          { value: 10, unit: 'years' },
          { value: 20, unit: 'years' },
          { value: 30, unit: 'years' },
          { value: 50, unit: 'years' },
        ]
      }
      return [
        { value: 6, unit: 'months' },
        { value: 1, unit: 'years' },
        { value: 3, unit: 'years' },
        { value: 5, unit: 'years' },
        { value: 8, unit: 'years' },
        { value: 12, unit: 'years' },
      ]
    default:
      return [
        { value: 6, unit: 'months' },
        { value: 1, unit: 'years' },
        { value: 2, unit: 'years' },
        { value: 5, unit: 'years' },
        { value: 7, unit: 'years' },
        { value: 10, unit: 'years' },
        { value: 12, unit: 'years' },
        { value: 15, unit: 'years' },
      ]
  }
}
