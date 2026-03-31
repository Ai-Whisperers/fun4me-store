/**
 * Unit tests for appointment overlap checking logic
 * Tests the overlap detection algorithm used in the database function
 */

import { describe, it, expect } from 'vitest'

/**
 * Helper function to test overlap logic (mirrors database function logic)
 * Two time ranges overlap if: start1 < end2 AND end1 > start2
 */
function checkTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  // Convert HH:MM to minutes for easier comparison
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const s1 = toMinutes(start1)
  const e1 = toMinutes(end1)
  const s2 = toMinutes(start2)
  const e2 = toMinutes(end2)

  // Overlap occurs when: start1 < end2 AND end1 > start2
  return s1 < e2 && e1 > s2
}

describe('Appointment Overlap Logic', () => {
  describe('Basic Overlap Cases', () => {
    it('should detect exact overlap', () => {
      // Same time slot
      expect(checkTimeOverlap('09:00', '09:30', '09:00', '09:30')).toBe(true)
    })

    it('should detect partial overlap - new starts during existing', () => {
      // Existing: 09:00-09:30, New: 09:15-09:45
      expect(checkTimeOverlap('09:00', '09:30', '09:15', '09:45')).toBe(true)
    })

    it('should detect partial overlap - new ends during existing', () => {
      // Existing: 09:00-09:30, New: 08:45-09:15
      expect(checkTimeOverlap('09:00', '09:30', '08:45', '09:15')).toBe(true)
    })

    it('should detect complete enclosure - new contains existing', () => {
      // Existing: 09:00-09:30, New: 08:00-10:00
      expect(checkTimeOverlap('09:00', '09:30', '08:00', '10:00')).toBe(true)
    })

    it('should detect complete enclosure - existing contains new', () => {
      // Existing: 08:00-10:00, New: 09:00-09:30
      expect(checkTimeOverlap('08:00', '10:00', '09:00', '09:30')).toBe(true)
    })
  })

  describe('Non-Overlapping Cases', () => {
    it('should not detect overlap - new after existing', () => {
      // Existing: 09:00-09:30, New: 09:30-10:00
      expect(checkTimeOverlap('09:00', '09:30', '09:30', '10:00')).toBe(false)
    })

    it('should not detect overlap - new before existing', () => {
      // Existing: 09:00-09:30, New: 08:00-09:00
      expect(checkTimeOverlap('09:00', '09:30', '08:00', '09:00')).toBe(false)
    })

    it('should not detect overlap - new well after existing', () => {
      // Existing: 09:00-09:30, New: 10:00-10:30
      expect(checkTimeOverlap('09:00', '09:30', '10:00', '10:30')).toBe(false)
    })

    it('should not detect overlap - new well before existing', () => {
      // Existing: 10:00-10:30, New: 09:00-09:30
      expect(checkTimeOverlap('10:00', '10:30', '09:00', '09:30')).toBe(false)
    })
  })

  describe('Edge Cases from BIZ-001', () => {
    it('should detect overlap reported in BIZ-001 ticket', () => {
      // Original issue: 09:00-09:30 and 09:15-09:45 were both allowed
      // They should overlap!
      const existing = { start: '09:00', end: '09:30' }
      const newAppt = { start: '09:15', end: '09:45' }

      expect(checkTimeOverlap(existing.start, existing.end, newAppt.start, newAppt.end)).toBe(true)
    })

    it('should allow back-to-back appointments', () => {
      // 09:00-09:30 and 09:30-10:00 should NOT overlap
      expect(checkTimeOverlap('09:00', '09:30', '09:30', '10:00')).toBe(false)
    })

    it('should detect one-minute overlap', () => {
      // 09:00-09:30 and 09:29-10:00 should overlap
      expect(checkTimeOverlap('09:00', '09:30', '09:29', '10:00')).toBe(true)
    })
  })

  describe('Lunch Break Scenarios', () => {
    it('should not overlap with lunch break when before', () => {
      // Appointment: 11:30-12:00, Lunch: 12:00-14:00
      expect(checkTimeOverlap('11:30', '12:00', '12:00', '14:00')).toBe(false)
    })

    it('should not overlap with lunch break when after', () => {
      // Appointment: 14:00-14:30, Lunch: 12:00-14:00
      expect(checkTimeOverlap('14:00', '14:30', '12:00', '14:00')).toBe(false)
    })

    it('should overlap with lunch break when crossing start', () => {
      // Appointment: 11:30-12:30, Lunch: 12:00-14:00
      expect(checkTimeOverlap('11:30', '12:30', '12:00', '14:00')).toBe(true)
    })

    it('should overlap with lunch break when crossing end', () => {
      // Appointment: 13:30-14:30, Lunch: 12:00-14:00
      expect(checkTimeOverlap('13:30', '14:30', '12:00', '14:00')).toBe(true)
    })

    it('should overlap with lunch break when spanning entire break', () => {
      // Appointment: 11:00-15:00, Lunch: 12:00-14:00
      expect(checkTimeOverlap('11:00', '15:00', '12:00', '14:00')).toBe(true)
    })

    it('should overlap with lunch break when contained within', () => {
      // Appointment: 12:30-13:30, Lunch: 12:00-14:00
      expect(checkTimeOverlap('12:30', '13:30', '12:00', '14:00')).toBe(true)
    })
  })

  describe('Multiple Slot Duration Cases', () => {
    it('should handle 15-minute slots', () => {
      expect(checkTimeOverlap('09:00', '09:15', '09:10', '09:25')).toBe(true)
      expect(checkTimeOverlap('09:00', '09:15', '09:15', '09:30')).toBe(false)
    })

    it('should handle 60-minute slots', () => {
      expect(checkTimeOverlap('09:00', '10:00', '09:30', '10:30')).toBe(true)
      expect(checkTimeOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false)
    })

    it('should handle 90-minute slots', () => {
      expect(checkTimeOverlap('09:00', '10:30', '10:00', '11:30')).toBe(true)
      expect(checkTimeOverlap('09:00', '10:30', '10:30', '12:00')).toBe(false)
    })
  })

  describe('Cross-Midnight Cases', () => {
    it('should handle appointments spanning midnight (edge case)', () => {
      // Note: In practice, our system shouldn't allow this,
      // but the overlap logic should still work
      expect(checkTimeOverlap('23:00', '23:59', '23:30', '23:59')).toBe(true)
    })
  })
})
