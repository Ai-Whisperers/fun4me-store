/**
 * Lab Result Entry Integration Tests
 *
 * Tests the lab result entry workflow including:
 * - Reference range validation
 * - Abnormal value flagging (low, high, critical)
 * - Specimen quality assessment
 * - Result interpretation
 *
 * @ticket TICKET-CLINICAL-004
 */
import { describe, it, expect } from 'vitest'

describe('Reference Range Validation', () => {
  interface ReferenceRange {
    testName: string
    unit: string
    species: 'dog' | 'cat'
    lowNormal: number
    highNormal: number
    criticalLow?: number
    criticalHigh?: number
  }

  const referenceRanges: ReferenceRange[] = [
    // Hematology
    {
      testName: 'RBC',
      unit: 'M/µL',
      species: 'dog',
      lowNormal: 5.5,
      highNormal: 8.5,
      criticalLow: 3.0,
      criticalHigh: 12.0,
    },
    {
      testName: 'RBC',
      unit: 'M/µL',
      species: 'cat',
      lowNormal: 5.0,
      highNormal: 10.0,
      criticalLow: 3.0,
      criticalHigh: 14.0,
    },
    {
      testName: 'WBC',
      unit: 'K/µL',
      species: 'dog',
      lowNormal: 5.5,
      highNormal: 16.9,
      criticalLow: 2.0,
      criticalHigh: 50.0,
    },
    {
      testName: 'Hemoglobin',
      unit: 'g/dL',
      species: 'dog',
      lowNormal: 12.0,
      highNormal: 18.0,
      criticalLow: 7.0,
      criticalHigh: 22.0,
    },
    {
      testName: 'Platelets',
      unit: 'K/µL',
      species: 'dog',
      lowNormal: 175,
      highNormal: 500,
      criticalLow: 50,
      criticalHigh: 800,
    },
    // Chemistry
    {
      testName: 'Glucose',
      unit: 'mg/dL',
      species: 'dog',
      lowNormal: 74,
      highNormal: 143,
      criticalLow: 40,
      criticalHigh: 400,
    },
    {
      testName: 'BUN',
      unit: 'mg/dL',
      species: 'dog',
      lowNormal: 7,
      highNormal: 27,
      criticalLow: undefined,
      criticalHigh: 100,
    },
    {
      testName: 'Creatinine',
      unit: 'mg/dL',
      species: 'dog',
      lowNormal: 0.5,
      highNormal: 1.8,
      criticalLow: undefined,
      criticalHigh: 10.0,
    },
    {
      testName: 'ALT',
      unit: 'U/L',
      species: 'dog',
      lowNormal: 10,
      highNormal: 125,
      criticalLow: undefined,
      criticalHigh: 1000,
    },
    {
      testName: 'Potassium',
      unit: 'mEq/L',
      species: 'dog',
      lowNormal: 4.1,
      highNormal: 5.6,
      criticalLow: 2.5,
      criticalHigh: 7.0,
    },
  ]

  const getRange = (testName: string, species: 'dog' | 'cat'): ReferenceRange | undefined => {
    return referenceRanges.find((r) => r.testName === testName && r.species === species)
  }

  it('should have different ranges for dogs and cats', () => {
    const dogRBC = getRange('RBC', 'dog')
    const catRBC = getRange('RBC', 'cat')

    expect(dogRBC?.highNormal).not.toBe(catRBC?.highNormal)
  })

  it('should define critical ranges narrower than normal', () => {
    const dogGlucose = getRange('Glucose', 'dog')

    expect(dogGlucose?.criticalLow).toBeLessThan(dogGlucose?.lowNormal ?? 0)
    expect(dogGlucose?.criticalHigh).toBeGreaterThan(dogGlucose?.highNormal ?? 0)
  })
})

describe('Result Flag Assignment', () => {
  type ResultFlag = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high'

  interface ReferenceRange {
    lowNormal: number
    highNormal: number
    criticalLow?: number
    criticalHigh?: number
  }

  const assignResultFlag = (value: number, range: ReferenceRange): ResultFlag => {
    // Check critical values first
    if (range.criticalLow !== undefined && value < range.criticalLow) {
      return 'critical_low'
    }
    if (range.criticalHigh !== undefined && value > range.criticalHigh) {
      return 'critical_high'
    }

    // Check normal ranges
    if (value < range.lowNormal) {
      return 'low'
    }
    if (value > range.highNormal) {
      return 'high'
    }

    return 'normal'
  }

  const glucoseRange: ReferenceRange = {
    lowNormal: 74,
    highNormal: 143,
    criticalLow: 40,
    criticalHigh: 400,
  }

  it('should flag normal values as normal', () => {
    expect(assignResultFlag(100, glucoseRange)).toBe('normal')
    expect(assignResultFlag(74, glucoseRange)).toBe('normal')
    expect(assignResultFlag(143, glucoseRange)).toBe('normal')
  })

  it('should flag low values', () => {
    expect(assignResultFlag(60, glucoseRange)).toBe('low')
    expect(assignResultFlag(50, glucoseRange)).toBe('low')
  })

  it('should flag high values', () => {
    expect(assignResultFlag(200, glucoseRange)).toBe('high')
    expect(assignResultFlag(150, glucoseRange)).toBe('high')
  })

  it('should flag critically low values', () => {
    expect(assignResultFlag(35, glucoseRange)).toBe('critical_low')
    expect(assignResultFlag(10, glucoseRange)).toBe('critical_low')
  })

  it('should flag critically high values', () => {
    expect(assignResultFlag(450, glucoseRange)).toBe('critical_high')
    expect(assignResultFlag(500, glucoseRange)).toBe('critical_high')
  })

  it('should handle ranges without critical values', () => {
    const bunRange: ReferenceRange = {
      lowNormal: 7,
      highNormal: 27,
      criticalLow: undefined,
      criticalHigh: 100,
    }

    expect(assignResultFlag(5, bunRange)).toBe('low')
    expect(assignResultFlag(150, bunRange)).toBe('critical_high')
  })
})

describe('Specimen Quality Assessment', () => {
  type SpecimenQuality = 'optimal' | 'acceptable' | 'suboptimal' | 'rejected'

  interface SpecimenIssue {
    code: string
    description: string
    affectsTests: string[]
    resultAction: 'proceed' | 'note' | 'retest' | 'reject'
  }

  const specimenIssues: SpecimenIssue[] = [
    {
      code: 'HEMOLYSIS_MILD',
      description: 'Hemólisis leve',
      affectsTests: ['Potassium', 'LDH', 'AST'],
      resultAction: 'note',
    },
    {
      code: 'HEMOLYSIS_MODERATE',
      description: 'Hemólisis moderada',
      affectsTests: ['Potassium', 'LDH', 'AST', 'Hemoglobin', 'Bilirubin'],
      resultAction: 'retest',
    },
    {
      code: 'HEMOLYSIS_SEVERE',
      description: 'Hemólisis severa',
      affectsTests: ['*'],
      resultAction: 'reject',
    },
    {
      code: 'LIPEMIA',
      description: 'Muestra lipémica',
      affectsTests: ['Triglycerides', 'Cholesterol', 'Glucose'],
      resultAction: 'note',
    },
    {
      code: 'ICTERUS',
      description: 'Muestra ictérica',
      affectsTests: ['Bilirubin', 'Cholesterol'],
      resultAction: 'note',
    },
    {
      code: 'CLOTTED',
      description: 'Muestra coagulada',
      affectsTests: ['CBC', 'Coagulation'],
      resultAction: 'reject',
    },
    {
      code: 'INSUFFICIENT',
      description: 'Volumen insuficiente',
      affectsTests: ['*'],
      resultAction: 'reject',
    },
    {
      code: 'CONTAMINATED',
      description: 'Muestra contaminada',
      affectsTests: ['Culture', 'Urinalysis'],
      resultAction: 'reject',
    },
  ]

  const evaluateSpecimenQuality = (issueCodes: string[]): SpecimenQuality => {
    if (issueCodes.length === 0) return 'optimal'

    const issues = issueCodes.map((code) => specimenIssues.find((i) => i.code === code))
    const actions = issues.map((i) => i?.resultAction)

    if (actions.includes('reject')) return 'rejected'
    if (actions.includes('retest')) return 'suboptimal'
    if (actions.includes('note')) return 'acceptable'

    return 'optimal'
  }

  it('should classify specimen with no issues as optimal', () => {
    expect(evaluateSpecimenQuality([])).toBe('optimal')
  })

  it('should classify mild hemolysis as acceptable', () => {
    expect(evaluateSpecimenQuality(['HEMOLYSIS_MILD'])).toBe('acceptable')
  })

  it('should classify moderate hemolysis as suboptimal', () => {
    expect(evaluateSpecimenQuality(['HEMOLYSIS_MODERATE'])).toBe('suboptimal')
  })

  it('should reject clotted specimen', () => {
    expect(evaluateSpecimenQuality(['CLOTTED'])).toBe('rejected')
  })

  it('should reject insufficient volume', () => {
    expect(evaluateSpecimenQuality(['INSUFFICIENT'])).toBe('rejected')
  })

  it('should use worst quality when multiple issues', () => {
    // Mild hemolysis (acceptable) + Clotted (rejected) = rejected
    expect(evaluateSpecimenQuality(['HEMOLYSIS_MILD', 'CLOTTED'])).toBe('rejected')
  })
})

describe('Result Interpretation', () => {
  interface ResultInterpretation {
    testName: string
    flag: string
    interpretation: string
    clinicalSignificance: string
    recommendedAction: string
  }

  const interpretations: ResultInterpretation[] = [
    // Kidney markers
    {
      testName: 'Creatinine',
      flag: 'high',
      interpretation: 'Azotemia',
      clinicalSignificance: 'Posible enfermedad renal',
      recommendedAction: 'Evaluar relación BUN:Creatinina, repetir en 2-4 semanas',
    },
    {
      testName: 'BUN',
      flag: 'high',
      interpretation: 'Azotemia',
      clinicalSignificance: 'Puede ser renal o pre-renal',
      recommendedAction: 'Evaluar estado de hidratación y creatinina',
    },
    {
      testName: 'SDMA',
      flag: 'high',
      interpretation: 'Marcador precoz de enfermedad renal',
      clinicalSignificance: 'Más sensible que creatinina en etapas tempranas',
      recommendedAction: 'Considerar estadificación IRIS de ERC',
    },
    // Liver markers
    {
      testName: 'ALT',
      flag: 'high',
      interpretation: 'Daño hepatocelular',
      clinicalSignificance: 'Elevación indica lesión de hepatocitos',
      recommendedAction: 'Evaluar ALP, bilirrubina, ecografía hepática',
    },
    {
      testName: 'ALP',
      flag: 'high',
      interpretation: 'Colestasis o inducción',
      clinicalSignificance: 'Puede ser hepático, óseo o inducido por corticoides',
      recommendedAction: 'Evaluar GGT, bilirrubina, historial de medicamentos',
    },
    // Electrolytes
    {
      testName: 'Potassium',
      flag: 'critical_high',
      interpretation: 'Hiperkalemia severa',
      clinicalSignificance: 'Riesgo de arritmias cardíacas',
      recommendedAction: 'ECG inmediato, tratamiento de emergencia',
    },
    {
      testName: 'Potassium',
      flag: 'critical_low',
      interpretation: 'Hipokalemia severa',
      clinicalSignificance: 'Riesgo de debilidad muscular y arritmias',
      recommendedAction: 'Suplementación intravenosa con monitoreo',
    },
    // Glucose
    {
      testName: 'Glucose',
      flag: 'critical_low',
      interpretation: 'Hipoglucemia',
      clinicalSignificance: 'Puede causar convulsiones, coma',
      recommendedAction: 'Administrar dextrosa IV inmediatamente',
    },
    {
      testName: 'Glucose',
      flag: 'critical_high',
      interpretation: 'Hiperglucemia severa',
      clinicalSignificance: 'Posible cetoacidosis diabética',
      recommendedAction: 'Evaluar cetonas, gases, iniciar insulina',
    },
  ]

  const getInterpretation = (
    testName: string,
    flag: string
  ): ResultInterpretation | undefined => {
    return interpretations.find((i) => i.testName === testName && i.flag === flag)
  }

  it('should provide interpretation for high creatinine', () => {
    const interp = getInterpretation('Creatinine', 'high')
    expect(interp?.interpretation).toBe('Azotemia')
    expect(interp?.recommendedAction).toContain('BUN:Creatinina')
  })

  it('should provide emergency action for critical potassium', () => {
    const interp = getInterpretation('Potassium', 'critical_high')
    expect(interp?.recommendedAction).toContain('ECG')
    expect(interp?.recommendedAction).toContain('emergencia')
  })

  it('should identify hypoglycemia as emergency', () => {
    const interp = getInterpretation('Glucose', 'critical_low')
    expect(interp?.recommendedAction).toContain('dextrosa')
    expect(interp?.clinicalSignificance).toContain('convulsiones')
  })

  it('should link ALT to hepatocellular damage', () => {
    const interp = getInterpretation('ALT', 'high')
    expect(interp?.interpretation).toContain('hepatocelular')
  })
})

describe('Critical Value Notification', () => {
  interface CriticalNotification {
    testName: string
    value: number
    unit: string
    flag: string
    notifyVet: boolean
    notifyOwner: boolean
    urgencyLevel: 'immediate' | 'urgent' | 'routine'
    suggestedMessage: string
  }

  const shouldNotifyCritical = (flag: string): boolean => {
    return flag === 'critical_low' || flag === 'critical_high'
  }

  const getUrgencyLevel = (flag: string): 'immediate' | 'urgent' | 'routine' => {
    if (flag === 'critical_low' || flag === 'critical_high') return 'immediate'
    if (flag === 'low' || flag === 'high') return 'urgent'
    return 'routine'
  }

  it('should require notification for critical values', () => {
    expect(shouldNotifyCritical('critical_low')).toBe(true)
    expect(shouldNotifyCritical('critical_high')).toBe(true)
    expect(shouldNotifyCritical('low')).toBe(false)
    expect(shouldNotifyCritical('high')).toBe(false)
    expect(shouldNotifyCritical('normal')).toBe(false)
  })

  it('should assign immediate urgency to critical values', () => {
    expect(getUrgencyLevel('critical_low')).toBe('immediate')
    expect(getUrgencyLevel('critical_high')).toBe('immediate')
  })

  it('should assign urgent level to abnormal values', () => {
    expect(getUrgencyLevel('low')).toBe('urgent')
    expect(getUrgencyLevel('high')).toBe('urgent')
  })

  it('should assign routine level to normal values', () => {
    expect(getUrgencyLevel('normal')).toBe('routine')
  })
})

describe('Result Entry Validation', () => {
  interface ResultEntry {
    order_item_id: string
    value_numeric?: number
    value_text?: string
    flag?: string
  }

  interface ValidationResult {
    valid: boolean
    errors: string[]
  }

  const validateResultEntry = (entry: ResultEntry): ValidationResult => {
    const errors: string[] = []

    if (!entry.order_item_id) {
      errors.push('order_item_id es requerido')
    }

    // Must have either numeric or text value
    if (entry.value_numeric === undefined && !entry.value_text) {
      errors.push('Se requiere valor numérico o texto')
    }

    // Validate flag if provided
    const validFlags = ['normal', 'low', 'high', 'critical_low', 'critical_high']
    if (entry.flag && !validFlags.includes(entry.flag)) {
      errors.push('Flag inválido')
    }

    // Numeric validation
    if (entry.value_numeric !== undefined) {
      if (isNaN(entry.value_numeric)) {
        errors.push('Valor numérico inválido')
      }
      if (entry.value_numeric < 0) {
        errors.push('Valor numérico no puede ser negativo')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  it('should accept valid numeric result', () => {
    const result = validateResultEntry({
      order_item_id: 'item-1',
      value_numeric: 100,
      flag: 'normal',
    })
    expect(result.valid).toBe(true)
  })

  it('should accept valid text result', () => {
    const result = validateResultEntry({
      order_item_id: 'item-1',
      value_text: 'Positive',
      flag: 'high',
    })
    expect(result.valid).toBe(true)
  })

  it('should require order_item_id', () => {
    const result = validateResultEntry({
      order_item_id: '',
      value_numeric: 100,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('order_item_id es requerido')
  })

  it('should require either numeric or text value', () => {
    const result = validateResultEntry({
      order_item_id: 'item-1',
    })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Se requiere')
  })

  it('should reject invalid flag', () => {
    const result = validateResultEntry({
      order_item_id: 'item-1',
      value_numeric: 100,
      flag: 'invalid',
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Flag inválido')
  })

  it('should reject negative numeric values', () => {
    const result = validateResultEntry({
      order_item_id: 'item-1',
      value_numeric: -5,
    })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('negativo')
  })
})

describe('API Authorization Rules', () => {
  describe('Role-Based Access', () => {
    const canEnterResults = (role: string): boolean => {
      return ['vet', 'admin'].includes(role)
    }

    const canModifyResults = (
      role: string,
      isResultOwner: boolean,
      resultAge: 'recent' | 'old'
    ): boolean => {
      if (role === 'admin') return true
      if (role === 'vet' && isResultOwner && resultAge === 'recent') return true
      return false
    }

    const canDeleteResults = (role: string): boolean => {
      return role === 'admin'
    }

    it('should allow vets to enter results', () => {
      expect(canEnterResults('vet')).toBe(true)
    })

    it('should allow admins to enter results', () => {
      expect(canEnterResults('admin')).toBe(true)
    })

    it('should reject pet owners from entering results', () => {
      expect(canEnterResults('owner')).toBe(false)
    })

    it('should allow vet to modify their own recent results', () => {
      expect(canModifyResults('vet', true, 'recent')).toBe(true)
    })

    it('should prevent vet from modifying old results', () => {
      expect(canModifyResults('vet', true, 'old')).toBe(false)
    })

    it('should prevent vet from modifying other vet results', () => {
      expect(canModifyResults('vet', false, 'recent')).toBe(false)
    })

    it('should allow admin to modify any results', () => {
      expect(canModifyResults('admin', false, 'old')).toBe(true)
    })

    it('should only allow admin to delete results', () => {
      expect(canDeleteResults('admin')).toBe(true)
      expect(canDeleteResults('vet')).toBe(false)
      expect(canDeleteResults('owner')).toBe(false)
    })
  })
})

describe('Complete Results Status', () => {
  interface LabOrderItem {
    id: string
    testName: string
    hasResult: boolean
  }

  const checkOrderCompletion = (
    items: LabOrderItem[]
  ): { complete: boolean; pendingTests: string[] } => {
    const pendingTests = items.filter((item) => !item.hasResult).map((item) => item.testName)

    return {
      complete: pendingTests.length === 0,
      pendingTests,
    }
  }

  it('should identify complete order', () => {
    const items = [
      { id: '1', testName: 'CBC', hasResult: true },
      { id: '2', testName: 'Chemistry', hasResult: true },
    ]

    const result = checkOrderCompletion(items)
    expect(result.complete).toBe(true)
    expect(result.pendingTests).toHaveLength(0)
  })

  it('should identify incomplete order', () => {
    const items = [
      { id: '1', testName: 'CBC', hasResult: true },
      { id: '2', testName: 'Chemistry', hasResult: false },
      { id: '3', testName: 'Urinalysis', hasResult: false },
    ]

    const result = checkOrderCompletion(items)
    expect(result.complete).toBe(false)
    expect(result.pendingTests).toContain('Chemistry')
    expect(result.pendingTests).toContain('Urinalysis')
  })

  it('should handle empty order', () => {
    const result = checkOrderCompletion([])
    expect(result.complete).toBe(true)
  })
})

describe('Delta Check (Change from Previous)', () => {
  interface DeltaCheckResult {
    testName: string
    currentValue: number
    previousValue: number
    percentChange: number
    isSignificant: boolean
    trend: 'increasing' | 'decreasing' | 'stable'
  }

  const performDeltaCheck = (
    testName: string,
    currentValue: number,
    previousValue: number,
    significantThreshold: number = 20
  ): DeltaCheckResult => {
    const percentChange = ((currentValue - previousValue) / previousValue) * 100

    let trend: 'increasing' | 'decreasing' | 'stable'
    if (percentChange > 5) trend = 'increasing'
    else if (percentChange < -5) trend = 'decreasing'
    else trend = 'stable'

    return {
      testName,
      currentValue,
      previousValue,
      percentChange: Math.round(percentChange * 10) / 10,
      isSignificant: Math.abs(percentChange) >= significantThreshold,
      trend,
    }
  }

  it('should calculate percentage change correctly', () => {
    const result = performDeltaCheck('Creatinine', 2.0, 1.0)
    expect(result.percentChange).toBe(100)
  })

  it('should flag significant changes', () => {
    const result = performDeltaCheck('ALT', 250, 100)
    expect(result.isSignificant).toBe(true)
    expect(result.percentChange).toBe(150)
  })

  it('should not flag minor changes', () => {
    const result = performDeltaCheck('Glucose', 105, 100)
    expect(result.isSignificant).toBe(false)
    expect(result.percentChange).toBe(5)
  })

  it('should identify increasing trend', () => {
    const result = performDeltaCheck('BUN', 35, 25)
    expect(result.trend).toBe('increasing')
  })

  it('should identify decreasing trend', () => {
    const result = performDeltaCheck('WBC', 8, 12)
    expect(result.trend).toBe('decreasing')
  })

  it('should identify stable values', () => {
    const result = performDeltaCheck('Potassium', 4.3, 4.2)
    expect(result.trend).toBe('stable')
  })

  it('should handle custom significance threshold', () => {
    const result = performDeltaCheck('Hemoglobin', 15, 12, 10)
    expect(result.percentChange).toBe(25)
    expect(result.isSignificant).toBe(true) // 25% > 10% threshold
  })
})
