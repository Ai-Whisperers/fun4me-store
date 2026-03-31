/**
 * Disaster Recovery Checklist
 *
 * DATA-003: Standard recovery checklist for incident response
 */

import type { ChecklistItem } from './types'

/**
 * Standard recovery checklist items
 */
export const RECOVERY_CHECKLIST: ChecklistItem[] = [
  // Initial Response
  {
    id: 'acknowledge',
    step: 'Acknowledge incident',
    critical: true,
    phase: 'initial',
  },
  {
    id: 'start-timer',
    step: 'Start incident timer',
    critical: true,
    phase: 'initial',
  },
  {
    id: 'assign-commander',
    step: 'Assign incident commander',
    critical: true,
    phase: 'initial',
  },
  {
    id: 'open-channel',
    step: 'Open incident channel',
    critical: false,
    phase: 'initial',
  },

  // Assessment
  {
    id: 'check-supabase',
    step: 'Check Supabase status',
    critical: true,
    phase: 'assessment',
  },
  {
    id: 'check-vercel',
    step: 'Check Vercel status',
    critical: true,
    phase: 'assessment',
  },
  {
    id: 'review-logs',
    step: 'Review error logs',
    critical: true,
    phase: 'assessment',
  },
  {
    id: 'identify-components',
    step: 'Identify affected components',
    critical: true,
    phase: 'assessment',
  },
  {
    id: 'determine-severity',
    step: 'Determine severity level',
    critical: true,
    phase: 'assessment',
  },

  // Communication
  {
    id: 'notify-internal',
    step: 'Notify internal team',
    critical: true,
    phase: 'communication',
  },
  {
    id: 'update-status',
    step: 'Update status page',
    critical: false,
    phase: 'communication',
  },
  {
    id: 'prepare-customer-comms',
    step: 'Prepare customer communication',
    critical: false,
    phase: 'communication',
  },

  // Recovery
  {
    id: 'execute-recovery',
    step: 'Execute recovery procedure',
    critical: true,
    phase: 'recovery',
  },
  {
    id: 'verify-service',
    step: 'Verify service restoration',
    critical: true,
    phase: 'recovery',
  },
  {
    id: 'test-critical-paths',
    step: 'Test critical paths',
    critical: true,
    phase: 'recovery',
  },
  {
    id: 'monitor-regression',
    step: 'Monitor for regression',
    critical: true,
    phase: 'recovery',
  },

  // Post-Incident
  {
    id: 'disable-maintenance',
    step: 'Disable maintenance mode',
    critical: true,
    phase: 'post-incident',
  },
  {
    id: 'send-all-clear',
    step: 'Send all-clear notification',
    critical: true,
    phase: 'post-incident',
  },
  {
    id: 'schedule-postmortem',
    step: 'Schedule post-mortem',
    critical: false,
    phase: 'post-incident',
  },
  {
    id: 'update-docs',
    step: 'Update documentation',
    critical: false,
    phase: 'post-incident',
  },
]

/**
 * Get checklist items by phase
 */
export function getChecklistByPhase(
  phase: ChecklistItem['phase']
): ChecklistItem[] {
  return RECOVERY_CHECKLIST.filter((item) => item.phase === phase)
}

/**
 * Get critical checklist items only
 */
export function getCriticalChecklist(): ChecklistItem[] {
  return RECOVERY_CHECKLIST.filter((item) => item.critical)
}

/**
 * Calculate checklist completion percentage
 */
export function calculateProgress(checklist: ChecklistItem[]): {
  total: number
  completed: number
  percentage: number
  criticalCompleted: number
  criticalTotal: number
} {
  const total = checklist.length
  const completed = checklist.filter((item) => item.completed).length
  const criticalItems = checklist.filter((item) => item.critical)
  const criticalCompleted = criticalItems.filter((item) => item.completed).length

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    criticalCompleted,
    criticalTotal: criticalItems.length,
  }
}

/**
 * Get next incomplete item
 */
export function getNextIncompleteItem(
  checklist: ChecklistItem[]
): ChecklistItem | null {
  return checklist.find((item) => !item.completed) ?? null
}

/**
 * Format checklist for display
 */
export function formatChecklist(checklist: ChecklistItem[]): string {
  const lines: string[] = ['# Recovery Checklist', '']

  const phases: ChecklistItem['phase'][] = [
    'initial',
    'assessment',
    'communication',
    'recovery',
    'post-incident',
  ]

  const phaseNames: Record<ChecklistItem['phase'], string> = {
    initial: 'Initial Response',
    assessment: 'Assessment',
    communication: 'Communication',
    recovery: 'Recovery',
    'post-incident': 'Post-Incident',
  }

  for (const phase of phases) {
    const items = checklist.filter((item) => item.phase === phase)
    if (items.length === 0) continue

    lines.push(`## ${phaseNames[phase]}`)
    for (const item of items) {
      const status = item.completed ? '[x]' : '[ ]'
      const critical = item.critical ? ' (CRITICAL)' : ''
      const time = item.completedAt
        ? ` - ${item.completedAt.toISOString()}`
        : ''
      lines.push(`- ${status} ${item.step}${critical}${time}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
