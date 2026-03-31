/**
 * Accessibility Audit Utilities
 *
 * A11Y-001: WCAG 2.1 AA Compliance auditing utilities
 */

import type {
  AccessibilityIssue,
  AccessibilityAuditReport,
  AuditSummary,
  RemediationPlan,
  RemediationItem,
  PageAuditResult,
  IssueSeverity,
  WCAGPrinciple,
  WCAGCriterionId,
  AccessibilityStatement,
  WCAGLevel,
} from './types'
import { WCAG_CRITERIA } from './types'

/**
 * Get WCAG criterion details
 */
export function getCriterionDetails(criterionId: WCAGCriterionId): {
  name: string
  level: string
  principle: string
} {
  return WCAG_CRITERIA[criterionId]
}

/**
 * Get principle from criterion ID
 */
export function getPrincipleFromCriterion(criterionId: WCAGCriterionId): WCAGPrinciple {
  return WCAG_CRITERIA[criterionId].principle
}

/**
 * Calculate severity score (higher = more severe)
 */
export function getSeverityScore(severity: IssueSeverity): number {
  const scores: Record<IssueSeverity, number> = {
    critical: 4,
    serious: 3,
    moderate: 2,
    minor: 1,
  }
  return scores[severity]
}

/**
 * Calculate page accessibility score (0-100)
 */
export function calculatePageScore(issues: AccessibilityIssue[]): number {
  if (issues.length === 0) return 100

  // Weight issues by severity
  const totalPenalty = issues.reduce((sum, issue) => {
    const penalty = getSeverityScore(issue.severity) * 5
    return sum + penalty
  }, 0)

  // Score is 100 - penalty, minimum 0
  return Math.max(0, 100 - totalPenalty)
}

/**
 * Calculate overall audit score
 */
export function calculateOverallScore(pages: PageAuditResult[]): number {
  if (pages.length === 0) return 100

  const totalScore = pages.reduce((sum, page) => sum + page.score, 0)
  return Math.round(totalScore / pages.length)
}

/**
 * Generate audit summary from page results
 */
export function generateAuditSummary(pages: PageAuditResult[]): AuditSummary {
  const allIssues = pages.flatMap((p) => p.issues)

  const byPrinciple: Record<WCAGPrinciple, number> = {
    Perceivable: 0,
    Operable: 0,
    Understandable: 0,
    Robust: 0,
  }

  const byCriterion: Record<string, number> = {}

  for (const issue of allIssues) {
    const principle = getPrincipleFromCriterion(issue.wcagCriterion)
    byPrinciple[principle]++

    const criterionKey = issue.wcagCriterion
    byCriterion[criterionKey] = (byCriterion[criterionKey] || 0) + 1
  }

  return {
    totalPages: pages.length,
    totalIssues: allIssues.length,
    criticalCount: allIssues.filter((i) => i.severity === 'critical').length,
    seriousCount: allIssues.filter((i) => i.severity === 'serious').length,
    moderateCount: allIssues.filter((i) => i.severity === 'moderate').length,
    minorCount: allIssues.filter((i) => i.severity === 'minor').length,
    passedPages: pages.filter((p) => p.passed).length,
    failedPages: pages.filter((p) => !p.passed).length,
    overallScore: calculateOverallScore(pages),
    byPrinciple,
    byCriterion,
  }
}

/**
 * Generate remediation plan from issues
 */
export function generateRemediationPlan(issues: AccessibilityIssue[]): RemediationPlan {
  // Group issues by priority (severity + effort consideration)
  const priorityGroups = new Map<number, AccessibilityIssue[]>()

  for (const issue of issues) {
    // Priority: critical = 1, serious = 2, moderate = 3, minor = 4
    // Adjust by effort (lower effort = higher priority within same severity)
    const basePriority =
      issue.severity === 'critical'
        ? 1
        : issue.severity === 'serious'
          ? 2
          : issue.severity === 'moderate'
            ? 3
            : 4

    const adjustedPriority = basePriority + (issue.effort > 4 ? 0.5 : 0)
    const roundedPriority = Math.ceil(adjustedPriority)

    const group = priorityGroups.get(roundedPriority) || []
    group.push(issue)
    priorityGroups.set(roundedPriority, group)
  }

  // Create remediation items sorted by priority
  const items: RemediationItem[] = []
  const sortedPriorities = [...priorityGroups.keys()].sort((a, b) => a - b)

  for (const priority of sortedPriorities) {
    const groupIssues = priorityGroups.get(priority) || []
    const estimatedEffort = groupIssues.reduce((sum, i) => sum + i.effort, 0)

    items.push({
      priority,
      issues: groupIssues,
      estimatedEffort,
    })
  }

  const totalEffort = items.reduce((sum, item) => sum + item.estimatedEffort, 0)

  return {
    totalEffort,
    items,
  }
}

/**
 * Check if page passes WCAG AA
 */
export function pagePassesWCAGAA(issues: AccessibilityIssue[]): boolean {
  // Page fails if any critical or serious issues exist
  return !issues.some((i) => i.severity === 'critical' || i.severity === 'serious')
}

/**
 * Format issue for display
 */
export function formatIssue(issue: AccessibilityIssue): string {
  const criterion = getCriterionDetails(issue.wcagCriterion)
  const severityEmoji =
    issue.severity === 'critical'
      ? '🔴'
      : issue.severity === 'serious'
        ? '🟠'
        : issue.severity === 'moderate'
          ? '🟡'
          : '🟢'

  return `${severityEmoji} [${issue.wcagCriterion}] ${criterion.name}
   Component: ${issue.component}
   File: ${issue.filePath}
   Issue: ${issue.description}
   Fix: ${issue.remediation}
   Effort: ${issue.effort}h`
}

/**
 * Format audit summary for display
 */
export function formatAuditSummary(summary: AuditSummary): string {
  const lines: string[] = []

  lines.push('# Accessibility Audit Summary')
  lines.push('')
  lines.push(`Overall Score: ${summary.overallScore}/100`)
  lines.push(`Total Pages: ${summary.totalPages}`)
  lines.push(`Passed: ${summary.passedPages} | Failed: ${summary.failedPages}`)
  lines.push('')
  lines.push('## Issues by Severity')
  lines.push(`- 🔴 Critical: ${summary.criticalCount}`)
  lines.push(`- 🟠 Serious: ${summary.seriousCount}`)
  lines.push(`- 🟡 Moderate: ${summary.moderateCount}`)
  lines.push(`- 🟢 Minor: ${summary.minorCount}`)
  lines.push(`- **Total: ${summary.totalIssues}**`)
  lines.push('')
  lines.push('## Issues by Principle')
  lines.push(`- Perceivable: ${summary.byPrinciple.Perceivable}`)
  lines.push(`- Operable: ${summary.byPrinciple.Operable}`)
  lines.push(`- Understandable: ${summary.byPrinciple.Understandable}`)
  lines.push(`- Robust: ${summary.byPrinciple.Robust}`)

  return lines.join('\n')
}

/**
 * Format remediation plan for display
 */
export function formatRemediationPlan(plan: RemediationPlan): string {
  const lines: string[] = []

  lines.push('# Accessibility Remediation Plan')
  lines.push('')
  lines.push(`Total Estimated Effort: ${plan.totalEffort} hours`)
  lines.push('')

  for (const item of plan.items) {
    const priorityLabel =
      item.priority === 1
        ? 'P1 - Critical'
        : item.priority === 2
          ? 'P2 - High'
          : item.priority === 3
            ? 'P3 - Medium'
            : 'P4 - Low'

    lines.push(`## ${priorityLabel} (${item.estimatedEffort}h)`)
    lines.push('')

    for (const issue of item.issues) {
      lines.push(`- [ ] ${issue.component}: ${issue.description} (${issue.effort}h)`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate accessibility statement
 */
export function generateAccessibilityStatement(
  report: AccessibilityAuditReport,
  organization: string,
  website: string,
  feedbackEmail: string
): AccessibilityStatement {
  const { summary } = report

  // Determine conformance status
  let conformanceStatus: 'fully' | 'partially' | 'non-conformant'
  if (summary.criticalCount === 0 && summary.seriousCount === 0) {
    conformanceStatus = summary.moderateCount === 0 ? 'fully' : 'partially'
  } else {
    conformanceStatus = 'non-conformant'
  }

  // Collect known limitations from open issues
  const knownLimitations = report.pages
    .flatMap((p) => p.issues)
    .filter((i) => i.status === 'open' && (i.severity === 'serious' || i.severity === 'critical'))
    .map((issue) => ({
      description: `${issue.component}: ${issue.description}`,
      wcagCriteria: [issue.wcagCriterion],
      plannedFix: issue.remediation,
    }))

  return {
    organization,
    website,
    conformanceLevel: report.targetLevel,
    conformanceStatus,
    lastReviewDate: report.generatedAt,
    feedback: {
      email: feedbackEmail,
    },
    knownLimitations,
    technologies: ['HTML5', 'CSS3', 'JavaScript', 'React', 'Next.js', 'ARIA'],
    testingMethods: [
      'Automated testing with axe-core',
      'Manual keyboard navigation testing',
      'Screen reader testing (NVDA, VoiceOver)',
      'Color contrast analysis',
    ],
  }
}

/**
 * Format accessibility statement as markdown
 */
export function formatAccessibilityStatement(statement: AccessibilityStatement): string {
  const lines: string[] = []

  lines.push('# Accessibility Statement')
  lines.push('')
  lines.push(`**${statement.organization}** is committed to ensuring digital accessibility for people with disabilities.`)
  lines.push('')
  lines.push('## Conformance Status')
  lines.push('')

  const statusText =
    statement.conformanceStatus === 'fully'
      ? 'fully conforms'
      : statement.conformanceStatus === 'partially'
        ? 'partially conforms'
        : 'does not currently conform'

  lines.push(
    `The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA. ${statement.website} ${statusText} to WCAG 2.1 Level ${statement.conformanceLevel}.`
  )
  lines.push('')
  lines.push('## Feedback')
  lines.push('')
  lines.push('We welcome your feedback on the accessibility of this site. Please let us know if you encounter accessibility barriers:')
  lines.push('')
  lines.push(`- **Email**: ${statement.feedback.email}`)
  if (statement.feedback.phone) {
    lines.push(`- **Phone**: ${statement.feedback.phone}`)
  }
  lines.push('')
  lines.push('We try to respond to accessibility feedback within 5 business days.')
  lines.push('')

  if (statement.knownLimitations.length > 0) {
    lines.push('## Known Limitations')
    lines.push('')
    lines.push('Despite our best efforts, some content may have accessibility limitations:')
    lines.push('')
    for (const limitation of statement.knownLimitations) {
      lines.push(`- **${limitation.description}**`)
      lines.push(`  - WCAG Criteria: ${limitation.wcagCriteria.join(', ')}`)
      if (limitation.plannedFix) {
        lines.push(`  - Planned fix: ${limitation.plannedFix}`)
      }
    }
    lines.push('')
  }

  lines.push('## Technical Specifications')
  lines.push('')
  lines.push('Accessibility of this site relies on the following technologies:')
  lines.push('')
  for (const tech of statement.technologies) {
    lines.push(`- ${tech}`)
  }
  lines.push('')
  lines.push('## Assessment Methods')
  lines.push('')
  lines.push('This site was assessed using the following methods:')
  lines.push('')
  for (const method of statement.testingMethods) {
    lines.push(`- ${method}`)
  }
  lines.push('')
  lines.push(`**Last reviewed**: ${statement.lastReviewDate.toISOString().split('T')[0]}`)

  return lines.join('\n')
}

/**
 * Create a new accessibility issue
 */
export function createIssue(
  wcagCriterion: WCAGCriterionId,
  severity: IssueSeverity,
  component: string,
  filePath: string,
  description: string,
  remediation: string,
  effort: number,
  detectedBy: 'automated' | 'manual' = 'manual'
): AccessibilityIssue {
  return {
    id: `A11Y-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    wcagCriterion,
    severity,
    status: 'open',
    component,
    filePath,
    description,
    remediation,
    effort,
    detectedBy,
    detectedAt: new Date(),
  }
}

/**
 * Generate full audit report
 */
export function generateAuditReport(
  pages: PageAuditResult[],
  targetLevel: WCAGLevel = 'AA'
): AccessibilityAuditReport {
  const summary = generateAuditSummary(pages)
  const allIssues = pages.flatMap((p) => p.issues).filter((i) => i.status === 'open')
  const remediationPlan = generateRemediationPlan(allIssues)

  return {
    version: '1.0.0',
    generatedAt: new Date(),
    targetLevel,
    pages,
    summary,
    remediationPlan,
  }
}
