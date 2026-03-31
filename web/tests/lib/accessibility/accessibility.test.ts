/**
 * Accessibility Module Tests
 *
 * A11Y-001: Tests for WCAG 2.1 AA compliance utilities
 */

import { describe, it, expect } from 'vitest'
import {
  WCAG_CRITERIA,
  type PageAuditResult,
  type WCAGCriterionId,
  DEFAULT_AUDIT_CONFIG,
} from '../../../lib/accessibility/types'
import {
  getCriterionDetails,
  getPrincipleFromCriterion,
  getSeverityScore,
  calculatePageScore,
  calculateOverallScore,
  generateAuditSummary,
  generateRemediationPlan,
  pagePassesWCAGAA,
  formatIssue,
  formatAuditSummary,
  formatRemediationPlan,
  createIssue,
  generateAuditReport,
  generateAccessibilityStatement,
  formatAccessibilityStatement,
} from '../../../lib/accessibility/audit-utils'
import {
  WCAG_CHECKLIST,
  getChecklistByCategory,
  getChecklistByCriterion,
  formatChecklist,
  DEVELOPER_QUICK_CHECKS,
} from '../../../lib/accessibility/checklist'

describe('Accessibility Types', () => {
  describe('WCAG_CRITERIA', () => {
    it('contains all WCAG 2.1 AA criteria', () => {
      // Level A criteria count
      const levelA = Object.values(WCAG_CRITERIA).filter((c) => c.level === 'A')
      expect(levelA.length).toBeGreaterThan(20)

      // Level AA criteria count
      const levelAA = Object.values(WCAG_CRITERIA).filter((c) => c.level === 'AA')
      expect(levelAA.length).toBeGreaterThan(10)
    })

    it('has all four principles represented', () => {
      const principles = new Set(Object.values(WCAG_CRITERIA).map((c) => c.principle))
      expect(principles).toContain('Perceivable')
      expect(principles).toContain('Operable')
      expect(principles).toContain('Understandable')
      expect(principles).toContain('Robust')
    })

    it('has proper criterion structure', () => {
      const criterion = WCAG_CRITERIA['1.4.3']
      expect(criterion).toEqual({
        name: 'Contrast (Minimum)',
        level: 'AA',
        principle: 'Perceivable',
      })
    })
  })

  describe('DEFAULT_AUDIT_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_AUDIT_CONFIG.targetLevel).toBe('AA')
      expect(DEFAULT_AUDIT_CONFIG.timeout).toBe(30000)
      expect(DEFAULT_AUDIT_CONFIG.concurrency).toBe(5)
      expect(DEFAULT_AUDIT_CONFIG.includePatterns).toContain('app/**/*.tsx')
    })
  })
})

describe('Audit Utilities', () => {
  describe('getCriterionDetails', () => {
    it('returns criterion details for valid ID', () => {
      const details = getCriterionDetails('2.4.7')
      expect(details.name).toBe('Focus Visible')
      expect(details.level).toBe('AA')
      expect(details.principle).toBe('Operable')
    })
  })

  describe('getPrincipleFromCriterion', () => {
    it('returns correct principle', () => {
      expect(getPrincipleFromCriterion('1.4.3')).toBe('Perceivable')
      expect(getPrincipleFromCriterion('2.1.1')).toBe('Operable')
      expect(getPrincipleFromCriterion('3.1.1')).toBe('Understandable')
      expect(getPrincipleFromCriterion('4.1.2')).toBe('Robust')
    })
  })

  describe('getSeverityScore', () => {
    it('returns correct scores', () => {
      expect(getSeverityScore('critical')).toBe(4)
      expect(getSeverityScore('serious')).toBe(3)
      expect(getSeverityScore('moderate')).toBe(2)
      expect(getSeverityScore('minor')).toBe(1)
    })
  })

  describe('calculatePageScore', () => {
    it('returns 100 for no issues', () => {
      expect(calculatePageScore([])).toBe(100)
    })

    it('penalizes based on severity', () => {
      const criticalIssue = createIssue(
        '1.4.3',
        'critical',
        'Test',
        'test.tsx',
        'Issue',
        'Fix',
        1
      )
      const score = calculatePageScore([criticalIssue])
      expect(score).toBe(80) // 100 - (4 * 5)
    })

    it('accumulates penalties for multiple issues', () => {
      const issues = [
        createIssue('1.4.3', 'critical', 'Test', 'test.tsx', 'Issue', 'Fix', 1),
        createIssue('2.1.1', 'serious', 'Test', 'test.tsx', 'Issue', 'Fix', 1),
      ]
      const score = calculatePageScore(issues)
      expect(score).toBe(65) // 100 - (4*5 + 3*5)
    })

    it('never goes below 0', () => {
      const manyIssues = Array(30)
        .fill(null)
        .map(() => createIssue('1.4.3', 'critical', 'Test', 'test.tsx', 'Issue', 'Fix', 1))
      const score = calculatePageScore(manyIssues)
      expect(score).toBe(0)
    })
  })

  describe('calculateOverallScore', () => {
    it('returns 100 for empty pages', () => {
      expect(calculateOverallScore([])).toBe(100)
    })

    it('averages page scores', () => {
      const pages: PageAuditResult[] = [
        { url: '/a', pageName: 'A', auditedAt: new Date(), issues: [], passed: true, score: 100 },
        { url: '/b', pageName: 'B', auditedAt: new Date(), issues: [], passed: true, score: 80 },
      ]
      expect(calculateOverallScore(pages)).toBe(90)
    })
  })

  describe('generateAuditSummary', () => {
    it('generates empty summary for no pages', () => {
      const summary = generateAuditSummary([])
      expect(summary.totalPages).toBe(0)
      expect(summary.totalIssues).toBe(0)
      expect(summary.overallScore).toBe(100)
    })

    it('aggregates issues by severity', () => {
      const issues = [
        createIssue('1.4.3', 'critical', 'A', 'a.tsx', 'Issue', 'Fix', 1),
        createIssue('2.1.1', 'serious', 'B', 'b.tsx', 'Issue', 'Fix', 1),
        createIssue('3.1.1', 'moderate', 'C', 'c.tsx', 'Issue', 'Fix', 1),
        createIssue('4.1.2', 'minor', 'D', 'd.tsx', 'Issue', 'Fix', 1),
      ]

      const pages: PageAuditResult[] = [
        { url: '/', pageName: 'Home', auditedAt: new Date(), issues, passed: false, score: 50 },
      ]

      const summary = generateAuditSummary(pages)
      expect(summary.criticalCount).toBe(1)
      expect(summary.seriousCount).toBe(1)
      expect(summary.moderateCount).toBe(1)
      expect(summary.minorCount).toBe(1)
      expect(summary.totalIssues).toBe(4)
    })

    it('aggregates by principle', () => {
      const issues = [
        createIssue('1.4.3', 'moderate', 'A', 'a.tsx', 'Issue', 'Fix', 1),
        createIssue('1.4.4', 'moderate', 'B', 'b.tsx', 'Issue', 'Fix', 1),
        createIssue('2.1.1', 'moderate', 'C', 'c.tsx', 'Issue', 'Fix', 1),
      ]

      const pages: PageAuditResult[] = [
        { url: '/', pageName: 'Home', auditedAt: new Date(), issues, passed: false, score: 70 },
      ]

      const summary = generateAuditSummary(pages)
      expect(summary.byPrinciple.Perceivable).toBe(2)
      expect(summary.byPrinciple.Operable).toBe(1)
    })
  })

  describe('generateRemediationPlan', () => {
    it('groups by priority', () => {
      const issues = [
        createIssue('1.4.3', 'critical', 'A', 'a.tsx', 'Issue', 'Fix', 2),
        createIssue('2.1.1', 'serious', 'B', 'b.tsx', 'Issue', 'Fix', 3),
        createIssue('3.1.1', 'moderate', 'C', 'c.tsx', 'Issue', 'Fix', 1),
      ]

      const plan = generateRemediationPlan(issues)
      expect(plan.items.length).toBeGreaterThan(0)
      expect(plan.items[0].priority).toBe(1) // Critical first
      expect(plan.totalEffort).toBe(6)
    })

    it('calculates total effort', () => {
      const issues = [
        createIssue('1.4.3', 'minor', 'A', 'a.tsx', 'Issue', 'Fix', 2),
        createIssue('2.1.1', 'minor', 'B', 'b.tsx', 'Issue', 'Fix', 3),
      ]

      const plan = generateRemediationPlan(issues)
      expect(plan.totalEffort).toBe(5)
    })
  })

  describe('pagePassesWCAGAA', () => {
    it('passes with no issues', () => {
      expect(pagePassesWCAGAA([])).toBe(true)
    })

    it('passes with only minor/moderate issues', () => {
      const issues = [
        createIssue('1.4.3', 'moderate', 'A', 'a.tsx', 'Issue', 'Fix', 1),
        createIssue('2.1.1', 'minor', 'B', 'b.tsx', 'Issue', 'Fix', 1),
      ]
      expect(pagePassesWCAGAA(issues)).toBe(true)
    })

    it('fails with serious issues', () => {
      const issues = [
        createIssue('1.4.3', 'serious', 'A', 'a.tsx', 'Issue', 'Fix', 1),
      ]
      expect(pagePassesWCAGAA(issues)).toBe(false)
    })

    it('fails with critical issues', () => {
      const issues = [
        createIssue('2.1.1', 'critical', 'A', 'a.tsx', 'Issue', 'Fix', 1),
      ]
      expect(pagePassesWCAGAA(issues)).toBe(false)
    })
  })

  describe('formatIssue', () => {
    it('formats issue with severity emoji', () => {
      const issue = createIssue(
        '1.4.3',
        'critical',
        'Button',
        'components/button.tsx',
        'Low contrast text',
        'Increase contrast ratio to 4.5:1',
        2
      )

      const formatted = formatIssue(issue)
      expect(formatted).toContain('🔴') // Critical emoji
      expect(formatted).toContain('[1.4.3]')
      expect(formatted).toContain('Contrast (Minimum)')
      expect(formatted).toContain('Button')
      expect(formatted).toContain('2h')
    })
  })

  describe('formatAuditSummary', () => {
    it('includes all summary sections', () => {
      const summary = generateAuditSummary([])
      const formatted = formatAuditSummary(summary)

      expect(formatted).toContain('# Accessibility Audit Summary')
      expect(formatted).toContain('Overall Score')
      expect(formatted).toContain('Issues by Severity')
      expect(formatted).toContain('Issues by Principle')
    })
  })

  describe('formatRemediationPlan', () => {
    it('formats plan with priority sections', () => {
      const issues = [
        createIssue('1.4.3', 'critical', 'A', 'a.tsx', 'Issue A', 'Fix A', 2),
        createIssue('2.1.1', 'minor', 'B', 'b.tsx', 'Issue B', 'Fix B', 1),
      ]

      const plan = generateRemediationPlan(issues)
      const formatted = formatRemediationPlan(plan)

      expect(formatted).toContain('# Accessibility Remediation Plan')
      expect(formatted).toContain('P1 - Critical')
      expect(formatted).toContain('- [ ]') // Checklist items
    })
  })

  describe('createIssue', () => {
    it('creates issue with unique ID', () => {
      const issue1 = createIssue('1.4.3', 'minor', 'A', 'a.tsx', 'Issue', 'Fix', 1)
      const issue2 = createIssue('1.4.3', 'minor', 'B', 'b.tsx', 'Issue', 'Fix', 1)

      expect(issue1.id).not.toBe(issue2.id)
      expect(issue1.id).toMatch(/^A11Y-/)
    })

    it('sets default status to open', () => {
      const issue = createIssue('1.4.3', 'minor', 'A', 'a.tsx', 'Issue', 'Fix', 1)
      expect(issue.status).toBe('open')
    })

    it('sets detected date', () => {
      const issue = createIssue('1.4.3', 'minor', 'A', 'a.tsx', 'Issue', 'Fix', 1)
      expect(issue.detectedAt).toBeInstanceOf(Date)
    })
  })

  describe('generateAuditReport', () => {
    it('generates complete report structure', () => {
      const pages: PageAuditResult[] = [
        { url: '/', pageName: 'Home', auditedAt: new Date(), issues: [], passed: true, score: 100 },
      ]

      const report = generateAuditReport(pages, 'AA')

      expect(report.version).toBe('1.0.0')
      expect(report.targetLevel).toBe('AA')
      expect(report.pages).toHaveLength(1)
      expect(report.summary).toBeDefined()
      expect(report.remediationPlan).toBeDefined()
    })
  })

  describe('generateAccessibilityStatement', () => {
    it('determines conformance status correctly', () => {
      const pages: PageAuditResult[] = [
        { url: '/', pageName: 'Home', auditedAt: new Date(), issues: [], passed: true, score: 100 },
      ]
      const report = generateAuditReport(pages)

      const statement = generateAccessibilityStatement(
        report,
        'Test Org',
        'https://test.com',
        'test@test.com'
      )

      expect(statement.conformanceStatus).toBe('fully')
    })

    it('marks as non-conformant with critical issues', () => {
      const issues = [
        createIssue('1.4.3', 'critical', 'A', 'a.tsx', 'Issue', 'Fix', 1),
      ]
      const pages: PageAuditResult[] = [
        { url: '/', pageName: 'Home', auditedAt: new Date(), issues, passed: false, score: 80 },
      ]
      const report = generateAuditReport(pages)

      const statement = generateAccessibilityStatement(
        report,
        'Test Org',
        'https://test.com',
        'test@test.com'
      )

      expect(statement.conformanceStatus).toBe('non-conformant')
    })
  })

  describe('formatAccessibilityStatement', () => {
    it('formats complete statement', () => {
      const pages: PageAuditResult[] = [
        { url: '/', pageName: 'Home', auditedAt: new Date(), issues: [], passed: true, score: 100 },
      ]
      const report = generateAuditReport(pages)
      const statement = generateAccessibilityStatement(
        report,
        'Test Org',
        'https://test.com',
        'test@test.com'
      )

      const formatted = formatAccessibilityStatement(statement)

      expect(formatted).toContain('# Accessibility Statement')
      expect(formatted).toContain('Test Org')
      expect(formatted).toContain('test@test.com')
      expect(formatted).toContain('Conformance Status')
    })
  })
})

describe('Checklist', () => {
  describe('WCAG_CHECKLIST', () => {
    it('contains items for all principles', () => {
      const categories = new Set(WCAG_CHECKLIST.map((item) => item.category))
      expect(categories.size).toBe(4)
      expect(categories).toContain('perceivable')
      expect(categories).toContain('operable')
      expect(categories).toContain('understandable')
      expect(categories).toContain('robust')
    })

    it('has at least 20 items', () => {
      expect(WCAG_CHECKLIST.length).toBeGreaterThanOrEqual(20)
    })

    it('items have required properties', () => {
      for (const item of WCAG_CHECKLIST) {
        expect(item.id).toMatch(/^CHK-/)
        expect(item.criterion).toBeDefined()
        expect(item.title).toBeDefined()
        expect(item.description).toBeDefined()
        expect(item.testSteps.length).toBeGreaterThan(0)
        expect(item.passCondition).toBeDefined()
      }
    })
  })

  describe('getChecklistByCategory', () => {
    it('filters by perceivable', () => {
      const items = getChecklistByCategory('perceivable')
      expect(items.every((i) => i.category === 'perceivable')).toBe(true)
      expect(items.length).toBeGreaterThan(0)
    })

    it('filters by operable', () => {
      const items = getChecklistByCategory('operable')
      expect(items.every((i) => i.category === 'operable')).toBe(true)
      expect(items.length).toBeGreaterThan(0)
    })
  })

  describe('getChecklistByCriterion', () => {
    it('finds item by criterion', () => {
      const item = getChecklistByCriterion('1.4.3')
      expect(item).toBeDefined()
      expect(item?.criterion).toBe('1.4.3')
    })

    it('returns undefined for unknown criterion', () => {
      const item = getChecklistByCriterion('9.9.9' as WCAGCriterionId)
      expect(item).toBeUndefined()
    })
  })

  describe('formatChecklist', () => {
    it('generates markdown checklist', () => {
      const formatted = formatChecklist()

      expect(formatted).toContain('# WCAG 2.1 AA Manual Testing Checklist')
      expect(formatted).toContain('## Perceivable')
      expect(formatted).toContain('## Operable')
      expect(formatted).toContain('## Understandable')
      expect(formatted).toContain('## Robust')
      expect(formatted).toContain('**PASS**')
      expect(formatted).toContain('**FAIL**')
    })
  })

  describe('DEVELOPER_QUICK_CHECKS', () => {
    it('has at least 10 items', () => {
      expect(DEVELOPER_QUICK_CHECKS.length).toBeGreaterThanOrEqual(10)
    })

    it('all items start with checkmark', () => {
      expect(DEVELOPER_QUICK_CHECKS.every((c) => c.startsWith('✓'))).toBe(true)
    })
  })
})
