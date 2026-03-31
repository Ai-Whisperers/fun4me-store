/**
 * Accessibility Checklist
 *
 * A11Y-001: Manual testing checklist for WCAG 2.1 AA compliance
 */

import type { WCAGCriterionId } from './types'

export interface ChecklistItem {
  id: string
  criterion: WCAGCriterionId
  category: 'perceivable' | 'operable' | 'understandable' | 'robust'
  title: string
  description: string
  testSteps: string[]
  passCondition: string
  tools?: string[]
}

/**
 * WCAG 2.1 AA Manual Testing Checklist
 */
export const WCAG_CHECKLIST: ChecklistItem[] = [
  // Perceivable
  {
    id: 'CHK-001',
    criterion: '1.1.1',
    category: 'perceivable',
    title: 'Images have alt text',
    description: 'All images have appropriate alternative text',
    testSteps: [
      'Identify all <img> elements',
      'Check each has alt attribute',
      'Verify alt text is descriptive (not "image" or filename)',
      'Decorative images should have alt=""',
    ],
    passCondition: 'All meaningful images have descriptive alt text',
    tools: ['axe-core', 'WAVE'],
  },
  {
    id: 'CHK-002',
    criterion: '1.3.1',
    category: 'perceivable',
    title: 'Semantic HTML structure',
    description: 'Content uses proper semantic HTML elements',
    testSteps: [
      'Check headings follow hierarchy (h1 > h2 > h3)',
      'Verify lists use <ul>, <ol>, <dl>',
      'Tables have proper headers',
      'Forms have associated labels',
    ],
    passCondition: 'All content uses appropriate semantic markup',
    tools: ['HeadingsMap', 'axe-core'],
  },
  {
    id: 'CHK-003',
    criterion: '1.4.3',
    category: 'perceivable',
    title: 'Color contrast ratio',
    description: 'Text has sufficient contrast against background',
    testSteps: [
      'Check normal text has 4.5:1 minimum contrast',
      'Check large text (18pt+) has 3:1 minimum contrast',
      'Test all color combinations in theme',
      'Include hover/focus states',
    ],
    passCondition: 'All text meets minimum contrast requirements',
    tools: ['Color Contrast Analyzer', 'axe-core', 'WebAIM Contrast Checker'],
  },
  {
    id: 'CHK-004',
    criterion: '1.4.4',
    category: 'perceivable',
    title: 'Text resizing',
    description: 'Content remains usable at 200% zoom',
    testSteps: [
      'Zoom browser to 200%',
      'Verify no content is cut off',
      'Check all text remains readable',
      'Ensure no horizontal scrolling required',
    ],
    passCondition: 'Content is fully usable at 200% zoom',
  },
  {
    id: 'CHK-005',
    criterion: '1.4.10',
    category: 'perceivable',
    title: 'Reflow / responsive design',
    description: 'Content reflows at 320px viewport without loss',
    testSteps: [
      'Set viewport to 320px width',
      'Verify content reflows properly',
      'Check no 2D scrolling required',
      'All functionality remains accessible',
    ],
    passCondition: 'Content reflows without horizontal scrolling',
  },
  {
    id: 'CHK-006',
    criterion: '1.4.11',
    category: 'perceivable',
    title: 'Non-text contrast',
    description: 'UI components and graphics have 3:1 contrast',
    testSteps: [
      'Check button borders/backgrounds',
      'Verify form input borders',
      'Test icon visibility',
      'Check focus indicators',
    ],
    passCondition: 'All UI elements have 3:1 minimum contrast',
  },

  // Operable
  {
    id: 'CHK-007',
    criterion: '2.1.1',
    category: 'operable',
    title: 'Keyboard accessibility',
    description: 'All functionality available via keyboard',
    testSteps: [
      'Navigate entire page using Tab only',
      'Activate all interactive elements with Enter/Space',
      'Test custom components (dropdowns, modals)',
      'Verify all links, buttons, form controls accessible',
    ],
    passCondition: 'All interactive elements accessible via keyboard',
  },
  {
    id: 'CHK-008',
    criterion: '2.1.2',
    category: 'operable',
    title: 'No keyboard trap',
    description: 'Focus can always move away from elements',
    testSteps: [
      'Tab through all interactive elements',
      'Enter and exit modals/dialogs',
      'Navigate into and out of dropdowns',
      'Test any custom widgets',
    ],
    passCondition: 'Focus never becomes trapped in any element',
  },
  {
    id: 'CHK-009',
    criterion: '2.4.1',
    category: 'operable',
    title: 'Skip links',
    description: 'Skip navigation link is available',
    testSteps: [
      'Press Tab on page load',
      'Verify skip link appears',
      'Activate skip link',
      'Confirm focus moves to main content',
    ],
    passCondition: 'Skip link present and functional',
  },
  {
    id: 'CHK-010',
    criterion: '2.4.3',
    category: 'operable',
    title: 'Focus order',
    description: 'Tab order follows logical reading sequence',
    testSteps: [
      'Tab through page',
      'Verify order matches visual layout',
      'Check modals trap focus appropriately',
      'Verify no unexpected focus jumps',
    ],
    passCondition: 'Focus order is logical and predictable',
  },
  {
    id: 'CHK-011',
    criterion: '2.4.7',
    category: 'operable',
    title: 'Focus visible',
    description: 'Keyboard focus indicator is always visible',
    testSteps: [
      'Tab through all interactive elements',
      'Verify focus outline is visible',
      'Check custom focus styles',
      'Test in all themes (light/dark)',
    ],
    passCondition: 'Focus indicator clearly visible on all elements',
  },
  {
    id: 'CHK-012',
    criterion: '2.4.6',
    category: 'operable',
    title: 'Descriptive headings and labels',
    description: 'Headings and labels are descriptive',
    testSteps: [
      'Review all page headings',
      'Check form labels are descriptive',
      'Verify button text is clear',
      'Ensure link text is meaningful',
    ],
    passCondition: 'All headings and labels describe content/function',
  },

  // Understandable
  {
    id: 'CHK-013',
    criterion: '3.1.1',
    category: 'understandable',
    title: 'Language declaration',
    description: 'Page language is specified',
    testSteps: [
      'Check <html lang="xx"> attribute',
      'Verify language code is correct',
      'Check lang attribute on content in other languages',
    ],
    passCondition: 'Page has valid lang attribute',
  },
  {
    id: 'CHK-014',
    criterion: '3.2.1',
    category: 'understandable',
    title: 'On focus behavior',
    description: 'Focus does not trigger unexpected changes',
    testSteps: [
      'Tab to form fields',
      'Verify no automatic submission',
      'Check dropdowns do not submit on focus',
      'Ensure no unexpected navigation',
    ],
    passCondition: 'Focus never triggers context changes',
  },
  {
    id: 'CHK-015',
    criterion: '3.2.2',
    category: 'understandable',
    title: 'On input behavior',
    description: 'Input does not trigger unexpected changes',
    testSteps: [
      'Type in form fields',
      'Select options in dropdowns',
      'Verify changes are predictable',
      'Check for proper change warnings',
    ],
    passCondition: 'Input changes are predictable or announced',
  },
  {
    id: 'CHK-016',
    criterion: '3.3.1',
    category: 'understandable',
    title: 'Error identification',
    description: 'Form errors are clearly identified',
    testSteps: [
      'Submit forms with errors',
      'Verify error messages appear',
      'Check errors identify the field',
      'Ensure errors are accessible to screen readers',
    ],
    passCondition: 'All errors are clearly identified and described',
  },
  {
    id: 'CHK-017',
    criterion: '3.3.2',
    category: 'understandable',
    title: 'Labels and instructions',
    description: 'Form inputs have labels and instructions',
    testSteps: [
      'Check all inputs have labels',
      'Verify labels are associated (for/id)',
      'Check required fields are indicated',
      'Verify format hints are provided',
    ],
    passCondition: 'All inputs have proper labels and instructions',
  },
  {
    id: 'CHK-018',
    criterion: '3.3.3',
    category: 'understandable',
    title: 'Error suggestions',
    description: 'Error messages suggest corrections',
    testSteps: [
      'Trigger validation errors',
      'Verify messages explain how to fix',
      'Check format suggestions for dates/phones',
      'Test password requirements feedback',
    ],
    passCondition: 'Error messages provide helpful suggestions',
  },

  // Robust
  {
    id: 'CHK-019',
    criterion: '4.1.1',
    category: 'robust',
    title: 'Valid HTML',
    description: 'HTML is well-formed and valid',
    testSteps: [
      'Run HTML validator',
      'Check for duplicate IDs',
      'Verify proper nesting',
      'Check for deprecated elements',
    ],
    passCondition: 'HTML passes validation with no major errors',
    tools: ['W3C Validator', 'axe-core'],
  },
  {
    id: 'CHK-020',
    criterion: '4.1.2',
    category: 'robust',
    title: 'Name, role, value',
    description: 'Custom components expose name, role, value',
    testSteps: [
      'Check ARIA roles on custom widgets',
      'Verify accessible names exist',
      'Test state changes are announced',
      'Check custom controls in screen reader',
    ],
    passCondition: 'Custom components properly expose accessibility info',
    tools: ['axe-core', 'NVDA', 'VoiceOver'],
  },
  {
    id: 'CHK-021',
    criterion: '4.1.3',
    category: 'robust',
    title: 'Status messages',
    description: 'Status updates are announced to assistive technology',
    testSteps: [
      'Trigger toast notifications',
      'Submit forms successfully',
      'Test loading indicators',
      'Verify aria-live regions work',
    ],
    passCondition: 'Status messages announced without focus change',
    tools: ['NVDA', 'VoiceOver'],
  },
]

/**
 * Get checklist by category
 */
export function getChecklistByCategory(
  category: 'perceivable' | 'operable' | 'understandable' | 'robust'
): ChecklistItem[] {
  return WCAG_CHECKLIST.filter((item) => item.category === category)
}

/**
 * Get checklist item by criterion
 */
export function getChecklistByCriterion(criterion: WCAGCriterionId): ChecklistItem | undefined {
  return WCAG_CHECKLIST.find((item) => item.criterion === criterion)
}

/**
 * Format checklist as markdown
 */
export function formatChecklist(): string {
  const lines: string[] = []

  lines.push('# WCAG 2.1 AA Manual Testing Checklist')
  lines.push('')
  lines.push('Use this checklist to manually verify accessibility compliance.')
  lines.push('')

  const categories: Array<{
    name: string
    key: 'perceivable' | 'operable' | 'understandable' | 'robust'
  }> = [
    { name: 'Perceivable', key: 'perceivable' },
    { name: 'Operable', key: 'operable' },
    { name: 'Understandable', key: 'understandable' },
    { name: 'Robust', key: 'robust' },
  ]

  for (const cat of categories) {
    lines.push(`## ${cat.name}`)
    lines.push('')

    const items = getChecklistByCategory(cat.key)
    for (const item of items) {
      lines.push(`### ${item.id}: ${item.title} (${item.criterion})`)
      lines.push('')
      lines.push(`**Description**: ${item.description}`)
      lines.push('')
      lines.push('**Test Steps**:')
      for (const step of item.testSteps) {
        lines.push(`1. ${step}`)
      }
      lines.push('')
      lines.push(`**Pass Condition**: ${item.passCondition}`)
      if (item.tools) {
        lines.push('')
        lines.push(`**Recommended Tools**: ${item.tools.join(', ')}`)
      }
      lines.push('')
      lines.push('- [ ] **PASS** | [ ] **FAIL** | [ ] **N/A**')
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Quick check list for developers
 */
export const DEVELOPER_QUICK_CHECKS = [
  '✓ All images have alt text',
  '✓ All form inputs have associated labels',
  '✓ Color is not the only way to convey information',
  '✓ Text has sufficient color contrast (4.5:1)',
  '✓ All interactive elements are keyboard accessible',
  '✓ Focus indicator is always visible',
  '✓ Page has a logical heading structure',
  '✓ ARIA attributes are used correctly',
  '✓ Form errors are clearly described',
  '✓ Page has a skip navigation link',
]
