/**
 * Status transition validation utilities
 * API-010: Create Status Transitions Utility
 */

import { apiError, HTTP_STATUS } from './errors'
import { NextResponse } from 'next/server'

/**
 * Valid invoice status transitions
 * draft -> sent, cancelled
 * sent -> paid, partial, overdue, cancelled
 * partial -> paid, overdue, cancelled
 * paid -> void
 * overdue -> paid, partial, cancelled
 * cancelled -> (terminal)
 * void -> (terminal)
 */
const INVOICE_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'partial', 'overdue', 'cancelled'],
  partial: ['paid', 'overdue', 'cancelled'],
  paid: ['void'],
  overdue: ['paid', 'partial', 'cancelled'],
  cancelled: [],
  void: [],
}

/**
 * Valid appointment status transitions
 * scheduled -> confirmed, cancelled
 * confirmed -> checked_in, cancelled, no_show
 * checked_in -> in_progress, cancelled
 * in_progress -> completed
 * completed -> (terminal)
 * cancelled -> (terminal)
 * no_show -> (terminal)
 */
const APPOINTMENT_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
}

/**
 * Valid lab order status transitions
 * pending -> collected, cancelled
 * collected -> processing, cancelled
 * processing -> completed, cancelled
 * completed -> (terminal)
 * cancelled -> (terminal)
 */
const LAB_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['collected', 'cancelled'],
  collected: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

/**
 * Valid hospitalization status transitions
 * admitted -> active, discharged
 * active -> discharged, transferred, deceased
 * discharged -> (terminal)
 * transferred -> (terminal)
 * deceased -> (terminal)
 */
const HOSPITALIZATION_TRANSITIONS: Record<string, string[]> = {
  admitted: ['active', 'discharged'],
  active: ['discharged', 'transferred', 'deceased'],
  discharged: [],
  transferred: [],
  deceased: [],
}

type EntityType = 'invoice' | 'appointment' | 'lab_order' | 'hospitalization'

/**
 * Check if a status transition is valid for an entity type
 *
 * @param currentStatus - Current status
 * @param newStatus - Desired new status
 * @param entityType - Type of entity
 * @returns True if transition is allowed
 *
 * @example
 * ```typescript
 * if (!canTransitionTo('draft', 'paid', 'invoice')) {
 *   return apiError('VALIDATION_ERROR', 400, { details: { message: 'Invalid status transition' } });
 * }
 * ```
 */
export function canTransitionTo(
  currentStatus: string,
  newStatus: string,
  entityType: EntityType
): boolean {
  const transitions = {
    invoice: INVOICE_TRANSITIONS,
    appointment: APPOINTMENT_TRANSITIONS,
    lab_order: LAB_ORDER_TRANSITIONS,
    hospitalization: HOSPITALIZATION_TRANSITIONS,
  }[entityType]

  return transitions[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Validate a status transition and return error if invalid
 *
 * @param currentStatus - Current status
 * @param newStatus - Desired new status
 * @param entityType - Type of entity
 * @returns Error response if invalid, null if valid
 *
 * @example
 * ```typescript
 * const transitionError = validateStatusTransition(currentStatus, newStatus, 'invoice');
 * if (transitionError) {
 *   return transitionError;
 * }
 * ```
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  entityType: EntityType
): NextResponse | null {
  if (!canTransitionTo(currentStatus, newStatus, entityType)) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      field_errors: {
        status: [`No se puede cambiar de "${currentStatus}" a "${newStatus}"`],
      },
    })
  }
  return null
}

/**
 * Get all valid transitions for a given status
 *
 * @param currentStatus - Current status
 * @param entityType - Type of entity
 * @returns Array of valid next statuses
 */
export function getValidTransitions(currentStatus: string, entityType: EntityType): string[] {
  const transitions = {
    invoice: INVOICE_TRANSITIONS,
    appointment: APPOINTMENT_TRANSITIONS,
    lab_order: LAB_ORDER_TRANSITIONS,
    hospitalization: HOSPITALIZATION_TRANSITIONS,
  }[entityType]

  return transitions[currentStatus] ?? []
}
