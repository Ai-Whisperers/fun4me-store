import { useState, useCallback } from 'react'
import {
  Species,
  DogSize,
  CatType,
  BirdCategory,
  TurtleType,
  FishType,
  SizeConfig,
  LifeStageConfig,
  SPECIES_CONFIG,
  DOG_SIZE_CONFIG,
  CAT_TYPE_CONFIG,
  BIRD_CONFIG,
  OTHER_SPECIES_CONFIG,
  LIFE_STAGES,
} from '@/lib/age-calculator/configs'

// =============================================================================
// TYPES
// =============================================================================

export type FormulaType = 'classic' | 'logarithmic'

export interface CalculationResult {
  humanAge: number
  exactHumanAge: number
  breakdown: CalculationStep[]
  formula: string
  lifeStage: LifeStage
  healthTips: string[]
  milestones: Milestone[]
  lifeExpectancy: {
    min: number
    max: number
    remaining: { min: number; max: number }
  }
}

export interface CalculationStep {
  description: string
  calculation: string
  result: string
}

export interface LifeStage extends LifeStageConfig {
  ageRange: string
}

export interface Milestone {
  petAge: number
  humanAge: number
  description: string
  reached: boolean
}

// =============================================================================
// HOOK
// =============================================================================

export function useAgeCalculation(
  species: Species,
  dogSize: DogSize,
  catType: CatType,
  birdCategory: BirdCategory,
  turtleType: TurtleType,
  fishType: FishType
) {
  const [result, setResult] = useState<CalculationResult | null>(null)

  // Get current sub-config based on species
  const getSubConfig = useCallback((): SizeConfig => {
    switch (species) {
      case 'dog':
        return DOG_SIZE_CONFIG[dogSize]
      case 'cat':
        return CAT_TYPE_CONFIG[catType]
      case 'bird':
        return BIRD_CONFIG[birdCategory]
      case 'turtle':
        return OTHER_SPECIES_CONFIG[`turtle_${turtleType}`]
      case 'fish':
        return OTHER_SPECIES_CONFIG[`fish_${fishType}`]
      default:
        return OTHER_SPECIES_CONFIG[species] || OTHER_SPECIES_CONFIG.rabbit
    }
  }, [species, dogSize, catType, birdCategory, turtleType, fishType])

  // Get life stage based on age
  const getLifeStage = useCallback(
    (petAge: number, seniorAge: number): LifeStage => {
      let stageKey: keyof typeof LIFE_STAGES
      let ageRange: string

      // Adjust thresholds based on species
      const juniorEnd = species === 'hamster' ? 0.25 : species === 'horse' ? 2 : 0.5
      const adultStart = species === 'hamster' ? 0.5 : species === 'horse' ? 4 : 2
      const matureStart = seniorAge * 0.7
      const geriatricStart = seniorAge * 1.3

      if (petAge < juniorEnd) {
        stageKey = 'puppy'
        ageRange = `0 - ${juniorEnd} años`
      } else if (petAge < adultStart) {
        stageKey = 'junior'
        ageRange = `${juniorEnd} - ${adultStart} años`
      } else if (petAge < matureStart) {
        stageKey = 'adult'
        ageRange = `${adultStart} - ${matureStart.toFixed(1)} años`
      } else if (petAge < seniorAge) {
        stageKey = 'mature'
        ageRange = `${matureStart.toFixed(1)} - ${seniorAge} años`
      } else if (petAge < geriatricStart) {
        stageKey = 'senior'
        ageRange = `${seniorAge} - ${geriatricStart.toFixed(1)} años`
      } else {
        stageKey = 'geriatric'
        ageRange = `> ${geriatricStart.toFixed(1)} años`
      }

      return {
        ...LIFE_STAGES[stageKey],
        ageRange,
      }
    },
    [species]
  )

  // Generate milestones
  const generateMilestones = useCallback(
    (currentAge: number, config: SizeConfig, currentHumanAge: number): Milestone[] => {
      const milestones: Milestone[] = [
        {
          petAge: 0.5,
          humanAge: Math.round(config.year1Equiv * 0.5),
          description: 'Equivalente a un niño de 7-8 años',
          reached: currentAge >= 0.5,
        },
        {
          petAge: 1,
          humanAge: config.year1Equiv,
          description: 'Adolescente (pubertad)',
          reached: currentAge >= 1,
        },
        {
          petAge: 2,
          humanAge: config.year2Equiv,
          description: 'Adulto joven',
          reached: currentAge >= 2,
        },
        {
          petAge: config.seniorAge * 0.5,
          humanAge: Math.round(
            config.year2Equiv + (config.seniorAge * 0.5 - 2) * config.multiplier
          ),
          description: 'Mediana edad',
          reached: currentAge >= config.seniorAge * 0.5,
        },
        {
          petAge: config.seniorAge,
          humanAge: Math.round(config.year2Equiv + (config.seniorAge - 2) * config.multiplier),
          description: 'Inicio etapa senior',
          reached: currentAge >= config.seniorAge,
        },
      ]
      return milestones.filter((m) => m.petAge > 0)
    },
    []
  )

  // Get health tips based on life stage
  const getHealthTips = useCallback((species: Species, stageKey: string, age: number): string[] => {
    const tips: string[] = []

    // General tips by stage
    if (stageKey === 'puppy' || stageKey === 'junior') {
      tips.push('Completar esquema de vacunación')
      tips.push('Socialización temprana con otros animales y personas')
      tips.push('Establecer rutinas de alimentación y ejercicio')
    } else if (stageKey === 'adult') {
      tips.push('Mantener peso ideal para prevenir enfermedades')
      tips.push('Limpieza dental regular')
      tips.push('Chequeo anual completo')
    } else if (stageKey === 'mature' || stageKey === 'senior') {
      tips.push('Análisis de sangre cada 6 meses')
      tips.push('Suplementos para articulaciones si hay rigidez')
      tips.push('Monitorear cambios en apetito y comportamiento')
      tips.push('Considerar dieta específica para seniors')
    } else if (stageKey === 'geriatric') {
      tips.push('Visitas veterinarias más frecuentes')
      tips.push('Adaptar el hogar para mayor comodidad')
      tips.push('Monitoreo de signos de dolor o malestar')
      tips.push('Considerar evaluación de calidad de vida')
    }

    // Species-specific tips
    if (species === 'dog' && age > 7) {
      tips.push('Revisar función cardíaca y renal')
    } else if (species === 'cat' && age > 10) {
      tips.push('Monitorear función tiroidea')
      tips.push('Chequeo de presión arterial')
    } else if (species === 'ferret' && age > 3) {
      tips.push('Vigilar signos de insulinoma')
      tips.push('Chequeo adrenal semestral')
    }

    return tips.slice(0, 5)
  }, [])

  // Calculate age
  const calculate = useCallback(
    (ageInYears: number, formulaType: FormulaType = 'classic') => {
      if (ageInYears <= 0) {
        setResult(null)
        return
      }

      const subConfig = getSubConfig()
      const year = ageInYears
      let humanAge = 0
      const breakdown: CalculationStep[] = []
      let formula = ''

      // Calculate based on species and formula type
      if (species === 'dog' && formulaType === 'logarithmic') {
        // UCSD 2019 epigenetic clock formula
        humanAge = year > 0 ? 16 * Math.log(year) + 31 : 0
        formula = 'Edad Humana = 16 × ln(edad_perro) + 31'
        breakdown.push({
          description: 'Fórmula logarítmica (Estudio UCSD 2019)',
          calculation: `16 × ln(${year.toFixed(2)}) + 31`,
          result: `16 × ${Math.log(year).toFixed(4)} + 31 = ${humanAge.toFixed(1)}`,
        })
      } else {
        // Classic piecewise formula
        const { year1Equiv, year2Equiv, multiplier } = subConfig

        if (year <= 1) {
          humanAge = year * year1Equiv
          breakdown.push({
            description: 'Primer año (desarrollo rápido)',
            calculation: `${year.toFixed(2)} × ${year1Equiv}`,
            result: `= ${humanAge.toFixed(1)} años humanos`,
          })
        } else if (year <= 2) {
          const firstYear = year1Equiv
          const secondYearRate = year2Equiv - year1Equiv
          const secondPortion = (year - 1) * secondYearRate
          humanAge = firstYear + secondPortion
          breakdown.push({
            description: 'Año 1 (desarrollo inicial)',
            calculation: `${year1Equiv} años humanos`,
            result: `= ${year1Equiv}`,
          })
          breakdown.push({
            description: 'Año 1-2 (maduración)',
            calculation: `(${year.toFixed(2)} - 1) × ${secondYearRate}`,
            result: `= ${secondPortion.toFixed(1)}`,
          })
          breakdown.push({
            description: 'Total',
            calculation: `${year1Equiv} + ${secondPortion.toFixed(1)}`,
            result: `= ${humanAge.toFixed(1)} años humanos`,
          })
        } else {
          const base = year2Equiv
          const additional = (year - 2) * multiplier
          humanAge = base + additional
          breakdown.push({
            description: 'Base (primeros 2 años)',
            calculation: `${year2Equiv} años humanos`,
            result: `= ${year2Equiv}`,
          })
          breakdown.push({
            description: `Años adicionales (×${multiplier}/año)`,
            calculation: `(${year.toFixed(2)} - 2) × ${multiplier}`,
            result: `= ${additional.toFixed(1)}`,
          })
          breakdown.push({
            description: 'Total',
            calculation: `${year2Equiv} + ${additional.toFixed(1)}`,
            result: `= ${humanAge.toFixed(1)} años humanos`,
          })
        }

        formula = `${year2Equiv} + (edad - 2) × ${multiplier}`
      }

      // Determine life stage
      const lifeStage = getLifeStage(year, subConfig.seniorAge)

      // Generate milestones
      const milestones = generateMilestones(year, subConfig, humanAge)

      // Calculate life expectancy
      const speciesConfig = SPECIES_CONFIG[species]
      let lifeExpectancy = speciesConfig.avgLifespan
      if (species === 'bird') {
        lifeExpectancy = BIRD_CONFIG[birdCategory].avgLifespan
      }
      const remainingMin = Math.max(0, lifeExpectancy.min - year)
      const remainingMax = Math.max(0, lifeExpectancy.max - year)

      // Health tips based on life stage
      const healthTips = getHealthTips(species, lifeStage.key, year)

      setResult({
        humanAge: Math.round(humanAge),
        exactHumanAge: humanAge,
        breakdown,
        formula,
        lifeStage,
        healthTips,
        milestones,
        lifeExpectancy: {
          min: lifeExpectancy.min,
          max: lifeExpectancy.max,
          remaining: { min: remainingMin, max: remainingMax },
        },
      })
    },
    [species, birdCategory, getSubConfig, getLifeStage, generateMilestones, getHealthTips]
  )

  return {
    result,
    calculate,
    reset: () => setResult(null),
  }
}
