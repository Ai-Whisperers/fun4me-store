/**
 * SLA Calculation Utilities
 *
 * Provides utilities for calculating Service Level Agreement metrics
 * based on incident data and uptime tracking.
 *
 * @see OPS-005: Uptime SLA Monitoring
 */

export type SLAPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Incident {
  id: string
  startTime: Date
  endTime: Date | null
  durationMinutes: number
  severity: 'minor' | 'major' | 'critical'
  description: string
  resolved: boolean
}

export interface SLAMetrics {
  period: SLAPeriod
  periodStart: Date
  periodEnd: Date
  totalMinutes: number
  downtimeMinutes: number
  uptimeMinutes: number
  uptimePercentage: number
  slaTarget: number
  slaStatus: 'met' | 'at_risk' | 'breached'
  incidentCount: number
  mttr: number // Mean Time To Recovery (minutes)
  mtbf: number // Mean Time Between Failures (minutes)
}

export interface SLAConfig {
  target: number // e.g., 99.9
  atRiskThreshold: number // e.g., 99.95 (warn when below this but above target)
}

const DEFAULT_SLA_CONFIG: SLAConfig = {
  target: 99.9, // 99.9% uptime (allows ~43 min/month downtime)
  atRiskThreshold: 99.95,
}

/**
 * Get the number of minutes in a period
 */
export function getPeriodMinutes(period: SLAPeriod, referenceDate: Date = new Date()): number {
  switch (period) {
    case 'daily':
      return 24 * 60 // 1,440 minutes
    case 'weekly':
      return 7 * 24 * 60 // 10,080 minutes
    case 'monthly': {
      // Use actual days in month
      const year = referenceDate.getFullYear()
      const month = referenceDate.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      return daysInMonth * 24 * 60
    }
    case 'quarterly':
      return 90 * 24 * 60 // ~129,600 minutes
    case 'yearly': {
      const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
      const days = isLeapYear(referenceDate.getFullYear()) ? 366 : 365
      return days * 24 * 60
    }
    default:
      return 30 * 24 * 60 // Default to 30 days
  }
}

/**
 * Get period boundaries
 */
export function getPeriodBoundaries(
  period: SLAPeriod,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const now = new Date(referenceDate)
  let start: Date
  let end: Date

  switch (period) {
    case 'daily':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      break
    case 'weekly':
      const dayOfWeek = now.getDay()
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59)
      break
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      break
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0)
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59)
      break
    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  }

  return { start, end }
}

/**
 * Calculate downtime from incidents within a period
 */
export function calculateDowntime(
  incidents: Incident[],
  periodStart: Date,
  periodEnd: Date
): number {
  let totalDowntime = 0

  for (const incident of incidents) {
    // Only count resolved incidents or ongoing ones
    const incidentStart = new Date(incident.startTime)
    const incidentEnd = incident.endTime ? new Date(incident.endTime) : new Date()

    // Clamp to period boundaries
    const effectiveStart = incidentStart < periodStart ? periodStart : incidentStart
    const effectiveEnd = incidentEnd > periodEnd ? periodEnd : incidentEnd

    // Only count if within period
    if (effectiveStart < effectiveEnd) {
      const minutes = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60)
      totalDowntime += minutes
    }
  }

  return Math.round(totalDowntime)
}

/**
 * Calculate Mean Time To Recovery (MTTR)
 */
export function calculateMTTR(incidents: Incident[]): number {
  const resolvedIncidents = incidents.filter(i => i.resolved && i.durationMinutes > 0)

  if (resolvedIncidents.length === 0) return 0

  const totalDuration = resolvedIncidents.reduce((sum, i) => sum + i.durationMinutes, 0)
  return Math.round(totalDuration / resolvedIncidents.length)
}

/**
 * Calculate Mean Time Between Failures (MTBF)
 */
export function calculateMTBF(
  incidents: Incident[],
  totalMinutes: number
): number {
  if (incidents.length === 0) return totalMinutes
  if (incidents.length === 1) return totalMinutes

  // Sort by start time
  const sorted = [...incidents].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  // Calculate time between failures
  let totalTimeBetween = 0
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].endTime
      ? // Non-null assertion safe: Conditional check guarantees endTime exists
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        new Date(sorted[i - 1].endTime!).getTime()
      : new Date(sorted[i - 1].startTime).getTime() + sorted[i - 1].durationMinutes * 60 * 1000

    const nextStart = new Date(sorted[i].startTime).getTime()
    totalTimeBetween += (nextStart - prevEnd) / (1000 * 60)
  }

  return Math.round(totalTimeBetween / (sorted.length - 1))
}

/**
 * Calculate SLA metrics for a given period
 */
export function calculateSLA(
  incidents: Incident[],
  period: SLAPeriod,
  config: SLAConfig = DEFAULT_SLA_CONFIG,
  referenceDate: Date = new Date()
): SLAMetrics {
  const { start: periodStart, end: periodEnd } = getPeriodBoundaries(period, referenceDate)
  const totalMinutes = getPeriodMinutes(period, referenceDate)

  // Filter incidents within period
  const periodIncidents = incidents.filter(incident => {
    const incidentStart = new Date(incident.startTime)
    const incidentEnd = incident.endTime ? new Date(incident.endTime) : new Date()
    return incidentStart <= periodEnd && incidentEnd >= periodStart
  })

  const downtimeMinutes = calculateDowntime(periodIncidents, periodStart, periodEnd)
  const uptimeMinutes = totalMinutes - downtimeMinutes
  const uptimePercentage = (uptimeMinutes / totalMinutes) * 100

  // Determine SLA status
  let slaStatus: 'met' | 'at_risk' | 'breached'
  if (uptimePercentage >= config.atRiskThreshold) {
    slaStatus = 'met'
  } else if (uptimePercentage >= config.target) {
    slaStatus = 'at_risk'
  } else {
    slaStatus = 'breached'
  }

  return {
    period,
    periodStart,
    periodEnd,
    totalMinutes,
    downtimeMinutes,
    uptimeMinutes,
    uptimePercentage: Math.round(uptimePercentage * 1000) / 1000, // 3 decimal places
    slaTarget: config.target,
    slaStatus,
    incidentCount: periodIncidents.length,
    mttr: calculateMTTR(periodIncidents),
    mtbf: calculateMTBF(periodIncidents, totalMinutes),
  }
}

/**
 * Format uptime percentage for display
 */
export function formatUptime(percentage: number): string {
  return `${percentage.toFixed(3)}%`
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (remainingHours > 0) {
    return `${days}d ${remainingHours}h`
  }
  return `${days}d`
}

/**
 * Calculate allowed downtime for a target SLA
 */
export function getAllowedDowntime(
  period: SLAPeriod,
  targetPercentage: number = 99.9,
  referenceDate: Date = new Date()
): { minutes: number; formatted: string } {
  const totalMinutes = getPeriodMinutes(period, referenceDate)
  const allowedDowntimeMinutes = totalMinutes * (1 - targetPercentage / 100)

  return {
    minutes: Math.round(allowedDowntimeMinutes),
    formatted: formatDuration(Math.round(allowedDowntimeMinutes)),
  }
}
