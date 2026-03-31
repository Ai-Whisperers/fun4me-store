/**
 * Vitals Recording Integration Tests
 *
 * Tests the hospitalization vitals recording workflow including:
 * - Recording vital signs (temperature, heart rate, respiratory rate, etc.)
 * - Pain score assessment
 * - Data validation for vital ranges
 * - Clinical interpretations
 *
 * @ticket TICKET-CLINICAL-001
 */
import { describe, it, expect } from 'vitest'

// Import REAL functions from lib module - this is the key fix!
import {
  interpretPainScore,
  interpretCRT,
  interpretMMColor,
  isDogFever,
  isDogHypothermia,
  isCritical,
  getMonitoringIntervalHours,
  isVitalsOverdue,
  isValidTemperature,
  isValidHeartRate,
  isValidPainScore,
  canRecordVitals,
  isIncreasingTrend,
  isDecreasingTrend,
  calculateAverageReading,
  DOG_VITAL_RANGES,
  CAT_VITAL_RANGES,
} from '@/lib/hospitalization/vitals'

describe('Vital Signs Business Rules', () => {
  describe('Normal Vital Ranges by Species', () => {
    describe('Dogs', () => {
      it('should document normal temperature range', () => {
        expect(DOG_VITAL_RANGES.temperature.min).toBeLessThan(DOG_VITAL_RANGES.temperature.max)
        expect(DOG_VITAL_RANGES.temperature.min).toBeGreaterThanOrEqual(37)
        expect(DOG_VITAL_RANGES.temperature.max).toBeLessThanOrEqual(40)
      })

      it('should document normal heart rate range', () => {
        expect(DOG_VITAL_RANGES.heart_rate.min).toBeLessThan(DOG_VITAL_RANGES.heart_rate.max)
      })

      it('should document normal respiratory rate range', () => {
        expect(DOG_VITAL_RANGES.respiratory_rate.min).toBeLessThan(DOG_VITAL_RANGES.respiratory_rate.max)
      })

      it('should flag fever for dogs', () => {
        expect(isDogFever(40.0)).toBe(true)
        expect(isDogFever(38.5)).toBe(false)
      })

      it('should flag hypothermia for dogs', () => {
        expect(isDogHypothermia(36.0)).toBe(true)
        expect(isDogHypothermia(38.0)).toBe(false)
      })
    })

    describe('Cats', () => {
      it('should document normal temperature range', () => {
        expect(CAT_VITAL_RANGES.temperature.min).toBeLessThan(CAT_VITAL_RANGES.temperature.max)
      })

      it('should document normal heart rate range', () => {
        expect(CAT_VITAL_RANGES.heart_rate.min).toBeLessThan(CAT_VITAL_RANGES.heart_rate.max)
      })

      it('should document normal respiratory rate range', () => {
        expect(CAT_VITAL_RANGES.respiratory_rate.min).toBeLessThan(CAT_VITAL_RANGES.respiratory_rate.max)
      })
    })
  })

  describe('Pain Score Interpretation', () => {
    it('should classify pain score 0 as no pain', () => {
      expect(interpretPainScore(0)).toBe('no_pain')
    })

    it('should classify pain scores 1-3 as mild', () => {
      expect(interpretPainScore(1)).toBe('mild')
      expect(interpretPainScore(2)).toBe('mild')
      expect(interpretPainScore(3)).toBe('mild')
    })

    it('should classify pain scores 4-6 as moderate', () => {
      expect(interpretPainScore(4)).toBe('moderate')
      expect(interpretPainScore(5)).toBe('moderate')
      expect(interpretPainScore(6)).toBe('moderate')
    })

    it('should classify pain scores 7-9 as severe', () => {
      expect(interpretPainScore(7)).toBe('severe')
      expect(interpretPainScore(8)).toBe('severe')
      expect(interpretPainScore(9)).toBe('severe')
    })

    it('should classify pain score 10 as extreme', () => {
      expect(interpretPainScore(10)).toBe('extreme')
    })
  })

  describe('Capillary Refill Time (CRT) Interpretation', () => {
    it('should classify CRT <= 2 seconds as normal', () => {
      expect(interpretCRT(1)).toBe('normal')
      expect(interpretCRT(2)).toBe('normal')
    })

    it('should classify CRT 3-4 seconds as delayed', () => {
      expect(interpretCRT(3)).toBe('delayed')
      expect(interpretCRT(4)).toBe('delayed')
    })

    it('should classify CRT > 4 seconds as severely delayed', () => {
      expect(interpretCRT(5)).toBe('severely_delayed')
      expect(interpretCRT(10)).toBe('severely_delayed')
    })
  })

  describe('Mucous Membrane Color Interpretation', () => {
    it('should classify pink as normal', () => {
      expect(interpretMMColor('pink').severity).toBe('normal')
    })

    it('should classify pale as warning', () => {
      expect(interpretMMColor('pale').severity).toBe('warning')
    })

    it('should classify white as critical', () => {
      expect(interpretMMColor('white').severity).toBe('critical')
    })

    it('should classify cyanotic as critical', () => {
      expect(interpretMMColor('cyanotic').severity).toBe('critical')
    })

    it('should identify possible causes for yellow', () => {
      expect(interpretMMColor('yellow').possibleCause).toContain('Liver')
    })
  })

  describe('Vitals Trending', () => {
    it('should detect temperature increase trend', () => {
      const readings = [38.0, 38.5, 39.0, 39.5]
      expect(isIncreasingTrend(readings)).toBe(true)
    })

    it('should detect heart rate stabilization', () => {
      const readings = [120, 118, 115, 110, 108]
      expect(isDecreasingTrend(readings)).toBe(true)
    })

    it('should calculate average over readings', () => {
      const readings = [38.0, 38.5, 39.0, 38.5]
      expect(calculateAverageReading(readings)).toBe(38.5)
    })
  })

  describe('Critical Values Alert', () => {
    it('should flag critical low temperature', () => {
      expect(isCritical('temperature', 35.0, 'dog')).toBe(true)
    })

    it('should flag critical high temperature', () => {
      expect(isCritical('temperature', 42.0, 'dog')).toBe(true)
    })

    it('should not flag normal temperature', () => {
      expect(isCritical('temperature', 38.5, 'dog')).toBe(false)
    })

    it('should flag critical low heart rate in dogs', () => {
      expect(isCritical('heart_rate', 30, 'dog')).toBe(true)
    })

    it('should not flag normal heart rate in cats', () => {
      expect(isCritical('heart_rate', 180, 'cat')).toBe(false)
    })
  })
})

describe('Vitals Recording Scheduling', () => {
  describe('Monitoring Frequency by Acuity', () => {
    it('should require hourly monitoring for critical patients', () => {
      expect(getMonitoringIntervalHours('critical')).toBe(1)
    })

    it('should require every 2 hours for high acuity', () => {
      expect(getMonitoringIntervalHours('high')).toBe(2)
    })

    it('should require every 4 hours for medium acuity', () => {
      expect(getMonitoringIntervalHours('medium')).toBe(4)
    })

    it('should require every 8 hours for low acuity', () => {
      expect(getMonitoringIntervalHours('low')).toBe(8)
    })

    it('should require every 12 hours for routine', () => {
      expect(getMonitoringIntervalHours('routine')).toBe(12)
    })
  })

  describe('Overdue Vitals Detection', () => {
    it('should detect overdue vitals', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000)
      expect(isVitalsOverdue(fiveHoursAgo, 4)).toBe(true)
    })

    it('should not flag recent vitals as overdue', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000)
      expect(isVitalsOverdue(oneHourAgo, 4)).toBe(false)
    })
  })
})

describe('Vitals Data Validation', () => {
  describe('Valid Ranges', () => {
    it('should validate normal dog temperature', () => {
      expect(isValidTemperature(38.5)).toBe(true)
    })

    it('should reject impossible temperature', () => {
      expect(isValidTemperature(50)).toBe(false)
      expect(isValidTemperature(20)).toBe(false)
    })

    it('should validate normal heart rate', () => {
      expect(isValidHeartRate(100)).toBe(true)
    })

    it('should reject impossible heart rate', () => {
      expect(isValidHeartRate(0)).toBe(false)
      expect(isValidHeartRate(500)).toBe(false)
    })

    it('should validate pain score in range', () => {
      expect(isValidPainScore(5)).toBe(true)
      expect(isValidPainScore(0)).toBe(true)
      expect(isValidPainScore(10)).toBe(true)
    })

    it('should reject invalid pain scores', () => {
      expect(isValidPainScore(-1)).toBe(false)
      expect(isValidPainScore(11)).toBe(false)
      expect(isValidPainScore(5.5)).toBe(false)
    })
  })
})

describe('API Authorization Rules', () => {
  describe('Role-Based Access', () => {
    it('should allow vets to record vitals', () => {
      expect(canRecordVitals('vet')).toBe(true)
    })

    it('should allow admins to record vitals', () => {
      expect(canRecordVitals('admin')).toBe(true)
    })

    it('should reject pet owners from recording vitals', () => {
      expect(canRecordVitals('owner')).toBe(false)
    })

    it('should reject unknown roles', () => {
      expect(canRecordVitals('guest')).toBe(false)
    })
  })
})
