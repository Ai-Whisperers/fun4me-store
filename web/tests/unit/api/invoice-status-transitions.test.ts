/**
 * Invoice Status Transitions Tests
 *
 * Tests the invoice state machine transitions.
 * Ensures business rules are enforced for invoice lifecycle.
 *
 * State Machine:
 * - draft → sent, cancelled
 * - sent → paid, partial, overdue, cancelled
 * - partial → paid, overdue, cancelled
 * - paid → void
 * - overdue → paid, partial, cancelled
 * - cancelled → (terminal)
 * - void → (terminal)
 */
import { describe, it, expect } from 'vitest'
import {
  canTransitionTo,
  validateStatusTransition,
  getValidTransitions,
} from '@/lib/api/status-transitions'

describe('Invoice Status Transitions', () => {
  describe('canTransitionTo', () => {
    describe('From Draft Status', () => {
      it('should allow transition to sent', () => {
        expect(canTransitionTo('draft', 'sent', 'invoice')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('draft', 'cancelled', 'invoice')).toBe(true)
      })

      it('should NOT allow direct transition to paid', () => {
        expect(canTransitionTo('draft', 'paid', 'invoice')).toBe(false)
      })

      it('should NOT allow transition to partial', () => {
        expect(canTransitionTo('draft', 'partial', 'invoice')).toBe(false)
      })

      it('should NOT allow transition to void', () => {
        expect(canTransitionTo('draft', 'void', 'invoice')).toBe(false)
      })

      it('should NOT allow transition to overdue', () => {
        expect(canTransitionTo('draft', 'overdue', 'invoice')).toBe(false)
      })
    })

    describe('From Sent Status', () => {
      it('should allow transition to paid', () => {
        expect(canTransitionTo('sent', 'paid', 'invoice')).toBe(true)
      })

      it('should allow transition to partial', () => {
        expect(canTransitionTo('sent', 'partial', 'invoice')).toBe(true)
      })

      it('should allow transition to overdue', () => {
        expect(canTransitionTo('sent', 'overdue', 'invoice')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('sent', 'cancelled', 'invoice')).toBe(true)
      })

      it('should NOT allow transition to draft', () => {
        expect(canTransitionTo('sent', 'draft', 'invoice')).toBe(false)
      })

      it('should NOT allow transition to void', () => {
        expect(canTransitionTo('sent', 'void', 'invoice')).toBe(false)
      })
    })

    describe('From Partial Status', () => {
      it('should allow transition to paid', () => {
        expect(canTransitionTo('partial', 'paid', 'invoice')).toBe(true)
      })

      it('should allow transition to overdue', () => {
        expect(canTransitionTo('partial', 'overdue', 'invoice')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('partial', 'cancelled', 'invoice')).toBe(true)
      })

      it('should NOT allow transition to draft', () => {
        expect(canTransitionTo('partial', 'draft', 'invoice')).toBe(false)
      })

      it('should NOT allow transition to sent', () => {
        expect(canTransitionTo('partial', 'sent', 'invoice')).toBe(false)
      })
    })

    describe('From Paid Status', () => {
      it('should allow transition to void', () => {
        expect(canTransitionTo('paid', 'void', 'invoice')).toBe(true)
      })

      it('should NOT allow transition to any other status', () => {
        expect(canTransitionTo('paid', 'draft', 'invoice')).toBe(false)
        expect(canTransitionTo('paid', 'sent', 'invoice')).toBe(false)
        expect(canTransitionTo('paid', 'partial', 'invoice')).toBe(false)
        expect(canTransitionTo('paid', 'overdue', 'invoice')).toBe(false)
        expect(canTransitionTo('paid', 'cancelled', 'invoice')).toBe(false)
      })
    })

    describe('From Overdue Status', () => {
      it('should allow transition to paid', () => {
        expect(canTransitionTo('overdue', 'paid', 'invoice')).toBe(true)
      })

      it('should allow transition to partial', () => {
        expect(canTransitionTo('overdue', 'partial', 'invoice')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('overdue', 'cancelled', 'invoice')).toBe(true)
      })

      it('should NOT allow transition to void', () => {
        expect(canTransitionTo('overdue', 'void', 'invoice')).toBe(false)
      })
    })

    describe('Terminal States', () => {
      it('should NOT allow transitions from cancelled', () => {
        expect(canTransitionTo('cancelled', 'draft', 'invoice')).toBe(false)
        expect(canTransitionTo('cancelled', 'sent', 'invoice')).toBe(false)
        expect(canTransitionTo('cancelled', 'paid', 'invoice')).toBe(false)
        expect(canTransitionTo('cancelled', 'partial', 'invoice')).toBe(false)
        expect(canTransitionTo('cancelled', 'overdue', 'invoice')).toBe(false)
        expect(canTransitionTo('cancelled', 'void', 'invoice')).toBe(false)
      })

      it('should NOT allow transitions from void', () => {
        expect(canTransitionTo('void', 'draft', 'invoice')).toBe(false)
        expect(canTransitionTo('void', 'sent', 'invoice')).toBe(false)
        expect(canTransitionTo('void', 'paid', 'invoice')).toBe(false)
        expect(canTransitionTo('void', 'partial', 'invoice')).toBe(false)
        expect(canTransitionTo('void', 'overdue', 'invoice')).toBe(false)
        expect(canTransitionTo('void', 'cancelled', 'invoice')).toBe(false)
      })
    })

    describe('Unknown Status Handling', () => {
      it('should return false for unknown current status', () => {
        expect(canTransitionTo('unknown', 'sent', 'invoice')).toBe(false)
      })

      it('should return false for unknown new status', () => {
        expect(canTransitionTo('draft', 'unknown', 'invoice')).toBe(false)
      })
    })
  })

  describe('validateStatusTransition', () => {
    it('should return null for valid transition', () => {
      const result = validateStatusTransition('draft', 'sent', 'invoice')
      expect(result).toBeNull()
    })

    it('should return error response for invalid transition', () => {
      const result = validateStatusTransition('draft', 'paid', 'invoice')

      expect(result).not.toBeNull()
      expect(result?.status).toBe(400)
    })

    it('should include Spanish error message', async () => {
      const result = validateStatusTransition('draft', 'paid', 'invoice')

      if (result) {
        const json = await result.json()
        expect(json.field_errors?.status[0]).toContain('No se puede cambiar')
      }
    })
  })

  describe('getValidTransitions', () => {
    it('should return valid transitions for draft', () => {
      const transitions = getValidTransitions('draft', 'invoice')
      expect(transitions).toContain('sent')
      expect(transitions).toContain('cancelled')
      expect(transitions).toHaveLength(2)
    })

    it('should return valid transitions for sent', () => {
      const transitions = getValidTransitions('sent', 'invoice')
      expect(transitions).toContain('paid')
      expect(transitions).toContain('partial')
      expect(transitions).toContain('overdue')
      expect(transitions).toContain('cancelled')
      expect(transitions).toHaveLength(4)
    })

    it('should return empty array for terminal states', () => {
      expect(getValidTransitions('cancelled', 'invoice')).toEqual([])
      expect(getValidTransitions('void', 'invoice')).toEqual([])
    })

    it('should return empty array for unknown status', () => {
      expect(getValidTransitions('unknown', 'invoice')).toEqual([])
    })
  })
})

describe('Appointment Status Transitions', () => {
  describe('canTransitionTo', () => {
    describe('From Scheduled Status', () => {
      it('should allow transition to confirmed', () => {
        expect(canTransitionTo('scheduled', 'confirmed', 'appointment')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('scheduled', 'cancelled', 'appointment')).toBe(true)
      })

      it('should NOT allow direct transition to completed', () => {
        expect(canTransitionTo('scheduled', 'completed', 'appointment')).toBe(false)
      })
    })

    describe('From Confirmed Status', () => {
      it('should allow transition to checked_in', () => {
        expect(canTransitionTo('confirmed', 'checked_in', 'appointment')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('confirmed', 'cancelled', 'appointment')).toBe(true)
      })

      it('should allow transition to no_show', () => {
        expect(canTransitionTo('confirmed', 'no_show', 'appointment')).toBe(true)
      })
    })

    describe('From Checked_in Status', () => {
      it('should allow transition to in_progress', () => {
        expect(canTransitionTo('checked_in', 'in_progress', 'appointment')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('checked_in', 'cancelled', 'appointment')).toBe(true)
      })
    })

    describe('From In_progress Status', () => {
      it('should allow transition to completed', () => {
        expect(canTransitionTo('in_progress', 'completed', 'appointment')).toBe(true)
      })

      it('should NOT allow transition to cancelled', () => {
        expect(canTransitionTo('in_progress', 'cancelled', 'appointment')).toBe(false)
      })
    })

    describe('Terminal States', () => {
      it('should NOT allow transitions from completed', () => {
        expect(canTransitionTo('completed', 'scheduled', 'appointment')).toBe(false)
        expect(canTransitionTo('completed', 'cancelled', 'appointment')).toBe(false)
      })

      it('should NOT allow transitions from cancelled', () => {
        expect(canTransitionTo('cancelled', 'scheduled', 'appointment')).toBe(false)
      })

      it('should NOT allow transitions from no_show', () => {
        expect(canTransitionTo('no_show', 'scheduled', 'appointment')).toBe(false)
      })
    })
  })
})

describe('Lab Order Status Transitions', () => {
  describe('canTransitionTo', () => {
    describe('From Pending Status', () => {
      it('should allow transition to collected', () => {
        expect(canTransitionTo('pending', 'collected', 'lab_order')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('pending', 'cancelled', 'lab_order')).toBe(true)
      })

      it('should NOT allow direct transition to completed', () => {
        expect(canTransitionTo('pending', 'completed', 'lab_order')).toBe(false)
      })
    })

    describe('From Collected Status', () => {
      it('should allow transition to processing', () => {
        expect(canTransitionTo('collected', 'processing', 'lab_order')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('collected', 'cancelled', 'lab_order')).toBe(true)
      })
    })

    describe('From Processing Status', () => {
      it('should allow transition to completed', () => {
        expect(canTransitionTo('processing', 'completed', 'lab_order')).toBe(true)
      })

      it('should allow transition to cancelled', () => {
        expect(canTransitionTo('processing', 'cancelled', 'lab_order')).toBe(true)
      })
    })
  })
})

describe('Hospitalization Status Transitions', () => {
  describe('canTransitionTo', () => {
    describe('From Admitted Status', () => {
      it('should allow transition to active', () => {
        expect(canTransitionTo('admitted', 'active', 'hospitalization')).toBe(true)
      })

      it('should allow transition to discharged', () => {
        expect(canTransitionTo('admitted', 'discharged', 'hospitalization')).toBe(true)
      })

      it('should NOT allow direct transition to deceased', () => {
        expect(canTransitionTo('admitted', 'deceased', 'hospitalization')).toBe(false)
      })
    })

    describe('From Active Status', () => {
      it('should allow transition to discharged', () => {
        expect(canTransitionTo('active', 'discharged', 'hospitalization')).toBe(true)
      })

      it('should allow transition to transferred', () => {
        expect(canTransitionTo('active', 'transferred', 'hospitalization')).toBe(true)
      })

      it('should allow transition to deceased', () => {
        expect(canTransitionTo('active', 'deceased', 'hospitalization')).toBe(true)
      })
    })

    describe('Terminal States', () => {
      it('should NOT allow transitions from discharged', () => {
        expect(canTransitionTo('discharged', 'active', 'hospitalization')).toBe(false)
      })

      it('should NOT allow transitions from transferred', () => {
        expect(canTransitionTo('transferred', 'active', 'hospitalization')).toBe(false)
      })

      it('should NOT allow transitions from deceased', () => {
        expect(canTransitionTo('deceased', 'active', 'hospitalization')).toBe(false)
      })
    })
  })
})

describe('Business Rule Validation', () => {
  describe('Invoice Lifecycle', () => {
    it('should enforce sending before payment', () => {
      // Invoice must be sent before it can be paid
      const canPayDraft = canTransitionTo('draft', 'paid', 'invoice')
      const canPaySent = canTransitionTo('sent', 'paid', 'invoice')

      expect(canPayDraft).toBe(false)
      expect(canPaySent).toBe(true)
    })

    it('should allow voiding only paid invoices', () => {
      // Only paid invoices can be voided (for accounting reasons)
      const canVoidDraft = canTransitionTo('draft', 'void', 'invoice')
      const canVoidSent = canTransitionTo('sent', 'void', 'invoice')
      const canVoidPaid = canTransitionTo('paid', 'void', 'invoice')

      expect(canVoidDraft).toBe(false)
      expect(canVoidSent).toBe(false)
      expect(canVoidPaid).toBe(true)
    })

    it('should allow cancellation at any non-terminal state', () => {
      expect(canTransitionTo('draft', 'cancelled', 'invoice')).toBe(true)
      expect(canTransitionTo('sent', 'cancelled', 'invoice')).toBe(true)
      expect(canTransitionTo('partial', 'cancelled', 'invoice')).toBe(true)
      expect(canTransitionTo('overdue', 'cancelled', 'invoice')).toBe(true)
      // But NOT from paid
      expect(canTransitionTo('paid', 'cancelled', 'invoice')).toBe(false)
    })
  })

  describe('Appointment Workflow', () => {
    it('should require check-in before starting', () => {
      const canStartFromConfirmed = canTransitionTo('confirmed', 'in_progress', 'appointment')
      const canStartFromCheckedIn = canTransitionTo('checked_in', 'in_progress', 'appointment')

      expect(canStartFromConfirmed).toBe(false)
      expect(canStartFromCheckedIn).toBe(true)
    })

    it('should not allow cancellation once in progress', () => {
      // Once a service has started, it cannot be cancelled
      const canCancelInProgress = canTransitionTo('in_progress', 'cancelled', 'appointment')

      expect(canCancelInProgress).toBe(false)
    })
  })
})
