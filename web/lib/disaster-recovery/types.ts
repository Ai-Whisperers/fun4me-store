/**
 * Disaster Recovery Types
 *
 * DATA-003: Type definitions for DR procedures
 */

/**
 * Incident severity levels
 */
export type SeverityLevel = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4'

/**
 * Incident status
 */
export type IncidentStatus =
  | 'detected'
  | 'investigating'
  | 'identified'
  | 'mitigating'
  | 'monitoring'
  | 'resolved'

/**
 * Recovery checklist item
 */
export interface ChecklistItem {
  id: string
  step: string
  critical: boolean
  phase: 'initial' | 'assessment' | 'communication' | 'recovery' | 'post-incident'
  completed?: boolean
  completedAt?: Date
  completedBy?: string
  notes?: string
}

/**
 * Incident record
 */
export interface Incident {
  id: string
  title: string
  severity: SeverityLevel
  status: IncidentStatus
  description: string
  affectedComponents: string[]
  affectedTenants?: string[]
  startedAt: Date
  resolvedAt?: Date
  commander?: string
  timeline: IncidentEvent[]
  checklist: ChecklistItem[]
  postMortemUrl?: string
}

/**
 * Timeline event during incident
 */
export interface IncidentEvent {
  timestamp: Date
  type: 'status_change' | 'action' | 'communication' | 'note'
  description: string
  actor?: string
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  service: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  latencyMs?: number
  lastChecked: Date
  details?: string
}

/**
 * DR scenario type
 */
export type ScenarioType =
  | 'database_corruption'
  | 'complete_outage'
  | 'security_breach'
  | 'third_party_outage'
  | 'data_loss'
  | 'other'

/**
 * Recovery procedure step
 */
export interface RecoveryStep {
  order: number
  title: string
  description: string
  commands?: string[]
  estimatedMinutes: number
  requiredRole: 'engineer' | 'admin' | 'dba' | 'security'
}

/**
 * Recovery procedure for a scenario
 */
export interface RecoveryProcedure {
  scenario: ScenarioType
  phases: {
    name: string
    steps: RecoveryStep[]
  }[]
}
