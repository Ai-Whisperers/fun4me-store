#!/usr/bin/env node
/**
 * Batch fix test files to use correct import order and centralized mocks
 *
 * This script fixes:
 * 1. Move route imports after vi.mock() calls
 * 2. Replace custom auth mocks with getAuthMock()
 * 3. Replace custom supabase mocks with getSupabaseServerMock()
 */

const fs = require('fs');
const path = require('path');

const TEST_FILES = [
  'tests/integration/ambassador/conversion.test.ts',
  'tests/integration/ambassador/platform-admin.test.ts',
  'tests/integration/analytics/analytics.test.ts',
  'tests/integration/appointments/slot-availability.test.ts',
  'tests/integration/checkout/checkout-flow.test.ts',
  'tests/integration/consents/consent-workflow.test.ts',
  'tests/integration/cron/commission-invoices.test.ts',
  'tests/integration/cron/cron-reminders.test.ts',
  'tests/integration/cron/expiry-alerts.test.ts',
  'tests/integration/cron/generate-recurring.test.ts',
  'tests/integration/cron/process-subscriptions.test.ts',
  'tests/integration/cron/release-reservations.test.ts',
  'tests/integration/cron/reminders-generate.test.ts',
  'tests/integration/hospitalization/admission-workflow.test.ts',
  'tests/integration/hospitalization/auto-invoice.test.ts',
  'tests/integration/insurance/insurance-claims.test.ts',
  'tests/integration/inventory/barcode-lookup.test.ts',
  'tests/integration/inventory/inventory-adjustments.test.ts',
  'tests/integration/inventory/inventory-receiving.test.ts',
  'tests/integration/inventory/reorder-suggestions.test.ts',
  'tests/integration/invoices/invoice-pdf.test.ts',
  'tests/integration/invoices/invoice-send.test.ts',
  'tests/integration/lab/lab-orders.test.ts',
  'tests/integration/lost-pets/lost-pets.test.ts',
  'tests/integration/messaging/conversations.test.ts',
  'tests/integration/owner/medical/medical-records-access.test.ts',
  'tests/integration/payments/payment-recording.test.ts',
  'tests/integration/payments/refund-workflow.test.ts',
  'tests/integration/privacy/privacy-acceptance.test.ts',
  'tests/integration/privacy/privacy-policies.test.ts',
  'tests/integration/store/checkout.test.ts',
  'tests/integration/store/commissions.test.ts',
  'tests/integration/store/coupon-validation.test.ts',
  'tests/integration/store/prescription-upload.test.ts',
  'tests/integration/store/stock-alerts.test.ts',
  'tests/integration/store/store-cart.test.ts',
  'tests/integration/store/wishlist.test.ts',
  'tests/integration/vaccines/contraindication-check.test.ts',
  'tests/integration/vaccines/vaccine-recommendations.test.ts',
];

function fixTestFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP: ${filePath} (not found)`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Check if already using getAuthMock
  if (content.includes('getAuthMock()') && content.includes('getSupabaseServerMock()')) {
    // Check if imports are in correct order (routes after mocks)
    const routeImportMatch = content.match(/import\s*\{[^}]*\}\s*from\s*['"]@\/app\/api/);
    const mockMatch = content.match(/vi\.mock\(['"]@\/lib\/auth/);

    if (routeImportMatch && mockMatch) {
      const routePos = content.indexOf(routeImportMatch[0]);
      const mockPos = content.indexOf(mockMatch[0]);

      if (routePos > mockPos) {
        console.log(`  OK: ${filePath} (already fixed)`);
        return false;
      }
    }
  }

  // Extract route import line(s)
  const routeImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"](@\/app\/api[^'"]+)['"]/g;
  const routeImports = [];
  let match;

  while ((match = routeImportRegex.exec(content)) !== null) {
    routeImports.push({
      full: match[0],
      methods: match[1].trim(),
      path: match[2]
    });
  }

  if (routeImports.length === 0) {
    console.log(`  SKIP: ${filePath} (no route imports)`);
    return false;
  }

  // Remove route imports from original position
  routeImports.forEach(imp => {
    content = content.replace(imp.full + '\n', '');
    content = content.replace(imp.full, '');
  });

  // Check if using createStatefulSupabaseMock in imports - replace with getSupabaseServerMock, getAuthMock
  if (content.includes('createStatefulSupabaseMock')) {
    content = content.replace(/,?\s*createStatefulSupabaseMock\s*,?/g, ',');
    content = content.replace(/,\s*,/g, ',');
    content = content.replace(/\{\s*,/g, '{');
    content = content.replace(/,\s*\}/g, '}');

    // Add getSupabaseServerMock, getAuthMock to imports if not present
    if (!content.includes('getSupabaseServerMock')) {
      content = content.replace(
        /(from\s*['"]@\/lib\/test-utils['"])/,
        'getSupabaseServerMock,\n  getAuthMock,\n} $1'
      );
      // Clean up the import
      content = content.replace(/\{\s*\n\s*getSupabaseServerMock/, '{\n  getSupabaseServerMock');
    }
  }

  // Find the last vi.mock() block
  const lastMockIndex = content.lastIndexOf('vi.mock(');
  if (lastMockIndex === -1) {
    console.log(`  SKIP: ${filePath} (no vi.mock calls)`);
    return false;
  }

  // Find the end of the last vi.mock block (matching closing parenthesis)
  let depth = 0;
  let endIndex = lastMockIndex;
  let foundStart = false;

  for (let i = lastMockIndex; i < content.length; i++) {
    if (content[i] === '(') {
      depth++;
      foundStart = true;
    } else if (content[i] === ')') {
      depth--;
      if (foundStart && depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  // Find the next newline after the mock block
  const nextNewline = content.indexOf('\n', endIndex);
  if (nextNewline === -1) {
    console.log(`  SKIP: ${filePath} (can't find insertion point)`);
    return false;
  }

  // Build route imports string
  const routeImportsStr = routeImports.map(imp =>
    `import { ${imp.methods} } from '${imp.path}'`
  ).join('\n');

  // Insert route imports after all mocks
  const insertComment = '\n\n// Import routes AFTER mocks\n';
  content = content.slice(0, nextNewline + 1) + insertComment + routeImportsStr + '\n' + content.slice(nextNewline + 1);

  // Replace custom supabase mock with getSupabaseServerMock()
  const supabaseMockPattern = /vi\.mock\(['"]@\/lib\/supabase\/server['"]\s*,\s*\(\)\s*=>\s*\(\{[^}]+\}\)\)/gs;
  content = content.replace(supabaseMockPattern, "vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())");

  // Replace custom auth mock with getAuthMock()
  const authMockPattern = /vi\.mock\(['"]@\/lib\/auth['"]\s*,\s*\(\)\s*=>\s*\(\{[\s\S]*?withApiAuth[\s\S]*?\}\)\)/g;
  content = content.replace(authMockPattern, "vi.mock('@/lib/auth', () => getAuthMock())");

  // Also try simpler pattern
  const authMockPattern2 = /vi\.mock\(['"]@\/lib\/auth['"]\s*,\s*\(\)\s*=>\s*\{[\s\S]*?withApiAuth[\s\S]*?\}\)/g;
  if (content.match(authMockPattern2)) {
    content = content.replace(authMockPattern2, "vi.mock('@/lib/auth', () => getAuthMock())");
  }

  // Ensure rate-limit mock exists
  if (!content.includes("vi.mock('@/lib/rate-limit'") && !content.includes('vi.mock("@/lib/rate-limit"')) {
    const authMockEnd = content.indexOf("vi.mock('@/lib/auth', () => getAuthMock())");
    if (authMockEnd !== -1) {
      const insertPos = authMockEnd + "vi.mock('@/lib/auth', () => getAuthMock())".length;
      const rateLimitMock = `\nvi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10 }),
  RATE_LIMITS: { api: { standard: { requests: 100, window: '1m' } } },
}))`;
      content = content.slice(0, insertPos) + rateLimitMock + content.slice(insertPos);
    }
  }

  // Ensure logger mock exists
  if (!content.includes("vi.mock('@/lib/logger'") && !content.includes('vi.mock("@/lib/logger"')) {
    const rateLimitEnd = content.indexOf("vi.mock('@/lib/rate-limit'");
    if (rateLimitEnd !== -1) {
      // Find end of rate-limit mock
      let endPos = rateLimitEnd;
      let depth = 0;
      for (let i = rateLimitEnd; i < content.length; i++) {
        if (content[i] === '(') depth++;
        else if (content[i] === ')') {
          depth--;
          if (depth === 0) {
            endPos = i + 1;
            break;
          }
        }
      }
      const loggerMock = `\nvi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))`;
      content = content.slice(0, endPos) + loggerMock + content.slice(endPos);
    }
  }

  if (content === originalContent) {
    console.log(`  SKIP: ${filePath} (no changes needed)`);
    return false;
  }

  // Write the fixed content
  fs.writeFileSync(fullPath, content);
  console.log(`  FIXED: ${filePath}`);
  return true;
}

console.log('Fixing test files with import order issues...\n');

let fixedCount = 0;
TEST_FILES.forEach(file => {
  try {
    if (fixTestFile(file)) {
      fixedCount++;
    }
  } catch (err) {
    console.log(`  ERROR: ${file} - ${err.message}`);
  }
});

console.log(`\nDone! Fixed ${fixedCount} files.`);
