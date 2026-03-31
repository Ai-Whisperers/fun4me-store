/**
 * Accessibility Types
 *
 * A11Y-001: WCAG 2.1 AA Compliance definitions
 */

/**
 * WCAG 2.1 AA Success Criteria
 */
export const WCAG_CRITERIA = {
  // Perceivable
  '1.1.1': {
    name: 'Non-text Content',
    level: 'A',
    principle: 'Perceivable',
  },
  '1.2.1': {
    name: 'Audio-only and Video-only (Prerecorded)',
    level: 'A',
    principle: 'Perceivable',
  },
  '1.2.2': {
    name: 'Captions (Prerecorded)',
    level: 'A',
    principle: 'Perceivable',
  },
  '1.2.3': {
    name: 'Audio Description or Media Alternative (Prerecorded)',
    level: 'A',
    principle: 'Perceivable',
  },
  '1.2.5': {
    name: 'Audio Description (Prerecorded)',
    level: 'AA',
    principle: 'Perceivable',
  },
  '1.3.1': {
    name: 'Info and Relationships',
    level: 'A',
    principle: 'Perceivable',
  },
  '1.3.2': {
    name: 'Meaningful Sequence',
    level: 'A',
    principle: 'Perceivable',
  },
  '1.3.3': {
    name: 'Sensory Characteristics',
    level: 'A',
    principle: 'Perceivable',
  },
  '1.3.4': {
    name: 'Orientation',
    level: 'AA',
    principle: 'Perceivable',
  },
  '1.3.5': {
    name: 'Identify Input Purpose',
    level: 'AA',
    principle: 'Perceivable',
  },
  '1.4.1': {
    name: 'Use of Color',
    level: 'A',
    principle: 'Perceivable',
  },
  '1.4.2': {
    name: 'Audio Control',
    level: 'A',
    principle: 'Perceivable',
  },
  '1.4.3': {
    name: 'Contrast (Minimum)',
    level: 'AA',
    principle: 'Perceivable',
  },
  '1.4.4': {
    name: 'Resize Text',
    level: 'AA',
    principle: 'Perceivable',
  },
  '1.4.5': {
    name: 'Images of Text',
    level: 'AA',
    principle: 'Perceivable',
  },
  '1.4.10': {
    name: 'Reflow',
    level: 'AA',
    principle: 'Perceivable',
  },
  '1.4.11': {
    name: 'Non-text Contrast',
    level: 'AA',
    principle: 'Perceivable',
  },
  '1.4.12': {
    name: 'Text Spacing',
    level: 'AA',
    principle: 'Perceivable',
  },
  '1.4.13': {
    name: 'Content on Hover or Focus',
    level: 'AA',
    principle: 'Perceivable',
  },

  // Operable
  '2.1.1': {
    name: 'Keyboard',
    level: 'A',
    principle: 'Operable',
  },
  '2.1.2': {
    name: 'No Keyboard Trap',
    level: 'A',
    principle: 'Operable',
  },
  '2.1.4': {
    name: 'Character Key Shortcuts',
    level: 'A',
    principle: 'Operable',
  },
  '2.2.1': {
    name: 'Timing Adjustable',
    level: 'A',
    principle: 'Operable',
  },
  '2.2.2': {
    name: 'Pause, Stop, Hide',
    level: 'A',
    principle: 'Operable',
  },
  '2.3.1': {
    name: 'Three Flashes or Below Threshold',
    level: 'A',
    principle: 'Operable',
  },
  '2.4.1': {
    name: 'Bypass Blocks',
    level: 'A',
    principle: 'Operable',
  },
  '2.4.2': {
    name: 'Page Titled',
    level: 'A',
    principle: 'Operable',
  },
  '2.4.3': {
    name: 'Focus Order',
    level: 'A',
    principle: 'Operable',
  },
  '2.4.4': {
    name: 'Link Purpose (In Context)',
    level: 'A',
    principle: 'Operable',
  },
  '2.4.5': {
    name: 'Multiple Ways',
    level: 'AA',
    principle: 'Operable',
  },
  '2.4.6': {
    name: 'Headings and Labels',
    level: 'AA',
    principle: 'Operable',
  },
  '2.4.7': {
    name: 'Focus Visible',
    level: 'AA',
    principle: 'Operable',
  },
  '2.5.1': {
    name: 'Pointer Gestures',
    level: 'A',
    principle: 'Operable',
  },
  '2.5.2': {
    name: 'Pointer Cancellation',
    level: 'A',
    principle: 'Operable',
  },
  '2.5.3': {
    name: 'Label in Name',
    level: 'A',
    principle: 'Operable',
  },
  '2.5.4': {
    name: 'Motion Actuation',
    level: 'A',
    principle: 'Operable',
  },

  // Understandable
  '3.1.1': {
    name: 'Language of Page',
    level: 'A',
    principle: 'Understandable',
  },
  '3.1.2': {
    name: 'Language of Parts',
    level: 'AA',
    principle: 'Understandable',
  },
  '3.2.1': {
    name: 'On Focus',
    level: 'A',
    principle: 'Understandable',
  },
  '3.2.2': {
    name: 'On Input',
    level: 'A',
    principle: 'Understandable',
  },
  '3.2.3': {
    name: 'Consistent Navigation',
    level: 'AA',
    principle: 'Understandable',
  },
  '3.2.4': {
    name: 'Consistent Identification',
    level: 'AA',
    principle: 'Understandable',
  },
  '3.3.1': {
    name: 'Error Identification',
    level: 'A',
    principle: 'Understandable',
  },
  '3.3.2': {
    name: 'Labels or Instructions',
    level: 'A',
    principle: 'Understandable',
  },
  '3.3.3': {
    name: 'Error Suggestion',
    level: 'AA',
    principle: 'Understandable',
  },
  '3.3.4': {
    name: 'Error Prevention (Legal, Financial, Data)',
    level: 'AA',
    principle: 'Understandable',
  },

  // Robust
  '4.1.1': {
    name: 'Parsing',
    level: 'A',
    principle: 'Robust',
  },
  '4.1.2': {
    name: 'Name, Role, Value',
    level: 'A',
    principle: 'Robust',
  },
  '4.1.3': {
    name: 'Status Messages',
    level: 'AA',
    principle: 'Robust',
  },
} as const

export type WCAGCriterionId = keyof typeof WCAG_CRITERIA

export type WCAGLevel = 'A' | 'AA' | 'AAA'

export type WCAGPrinciple = 'Perceivable' | 'Operable' | 'Understandable' | 'Robust'

/**
 * Severity levels for accessibility issues
 */
export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor'

/**
 * Issue status
 */
export type IssueStatus = 'open' | 'in_progress' | 'fixed' | 'wont_fix' | 'false_positive'

/**
 * Accessibility issue
 */
export interface AccessibilityIssue {
  id: string
  wcagCriterion: WCAGCriterionId
  severity: IssueSeverity
  status: IssueStatus
  component: string
  filePath: string
  description: string
  remediation: string
  effort: number // hours
  detectedBy: 'automated' | 'manual'
  detectedAt: Date
  fixedAt?: Date
}

/**
 * Page audit result
 */
export interface PageAuditResult {
  url: string
  pageName: string
  auditedAt: Date
  issues: AccessibilityIssue[]
  passed: boolean
  score: number // 0-100
}

/**
 * Overall audit report
 */
export interface AccessibilityAuditReport {
  version: string
  generatedAt: Date
  targetLevel: WCAGLevel
  pages: PageAuditResult[]
  summary: AuditSummary
  remediationPlan: RemediationPlan
}

/**
 * Audit summary statistics
 */
export interface AuditSummary {
  totalPages: number
  totalIssues: number
  criticalCount: number
  seriousCount: number
  moderateCount: number
  minorCount: number
  passedPages: number
  failedPages: number
  overallScore: number
  byPrinciple: Record<WCAGPrinciple, number>
  byCriterion: Record<string, number>
}

/**
 * Remediation plan item
 */
export interface RemediationItem {
  priority: number
  issues: AccessibilityIssue[]
  estimatedEffort: number
  sprint?: string
  assignee?: string
}

/**
 * Remediation plan
 */
export interface RemediationPlan {
  totalEffort: number
  items: RemediationItem[]
}

/**
 * Accessibility statement
 */
export interface AccessibilityStatement {
  organization: string
  website: string
  conformanceLevel: WCAGLevel
  conformanceStatus: 'fully' | 'partially' | 'non-conformant'
  lastReviewDate: Date
  feedback: {
    email: string
    phone?: string
    address?: string
  }
  knownLimitations: Array<{
    description: string
    wcagCriteria: WCAGCriterionId[]
    plannedFix?: string
  }>
  technologies: string[]
  testingMethods: string[]
}

/**
 * Audit configuration
 */
export interface AuditConfig {
  targetLevel: WCAGLevel
  includePatterns: string[]
  excludePatterns: string[]
  timeout: number
  concurrency: number
}

/**
 * Default audit configuration
 */
export const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  targetLevel: 'AA',
  includePatterns: ['app/**/*.tsx', 'components/**/*.tsx'],
  excludePatterns: ['**/*.test.tsx', '**/*.spec.tsx'],
  timeout: 30000,
  concurrency: 5,
}
