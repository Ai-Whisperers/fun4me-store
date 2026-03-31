#!/usr/bin/env node
/**
 * Simple test file fixer - processes files line by line to avoid regex issues
 */

const fs = require('fs');
const path = require('path');

// Files to fix - just a few key ones first
const TEST_FILES = [
  'tests/integration/appointments/appointment-workflow.test.ts',
  'tests/integration/analytics/analytics.test.ts',
  'tests/integration/messaging/conversations.test.ts',
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP: ${filePath} (not found)`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // Find route imports (lines with @/app/api)
  const routeImportLines = [];
  const routeImportIndices = [];

  lines.forEach((line, idx) => {
    if (line.includes("from '@/app/api") || line.includes('from "@/app/api')) {
      routeImportLines.push(line);
      routeImportIndices.push(idx);
    }
  });

  if (routeImportLines.length === 0) {
    console.log(`SKIP: ${filePath} (no route imports)`);
    return;
  }

  // Check if already fixed (route imports after vi.mock)
  const firstMockIdx = lines.findIndex(l => l.includes('vi.mock('));
  if (firstMockIdx !== -1 && routeImportIndices[0] > firstMockIdx) {
    console.log(`SKIP: ${filePath} (already in correct order)`);
    return;
  }

  // Find the last vi.mock block
  let lastMockEndIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('vi.mock(')) {
      // Find the closing of this mock
      let depth = 0;
      for (let j = i; j < lines.length; j++) {
        depth += (lines[j].match(/\(/g) || []).length;
        depth -= (lines[j].match(/\)/g) || []).length;
        if (depth <= 0) {
          lastMockEndIdx = j;
          break;
        }
      }
      break;
    }
  }

  if (lastMockEndIdx === -1) {
    console.log(`SKIP: ${filePath} (no vi.mock blocks)`);
    return;
  }

  // Remove route imports from their original positions (in reverse order to preserve indices)
  routeImportIndices.sort((a, b) => b - a).forEach(idx => {
    lines.splice(idx, 1);
    if (idx < lastMockEndIdx) lastMockEndIdx--;
  });

  // Add route imports after the last mock block
  const importComment = '';
  const routeImportsBlock = [
    '',
    '// Import routes AFTER mocks',
    ...routeImportLines,
    ''
  ];

  lines.splice(lastMockEndIdx + 1, 0, ...routeImportsBlock);

  // Now update imports from test-utils to add getSupabaseServerMock, getAuthMock
  const testUtilsImportIdx = lines.findIndex(l =>
    l.includes("from '@/lib/test-utils'") || l.includes('from "@/lib/test-utils"')
  );

  if (testUtilsImportIdx !== -1) {
    // Find the start and end of the import block
    let importStart = testUtilsImportIdx;
    while (importStart > 0 && !lines[importStart].includes('import')) {
      importStart--;
    }

    let importEnd = testUtilsImportIdx;
    while (!lines[importEnd].includes("from '@/lib/test-utils'") &&
           !lines[importEnd].includes('from "@/lib/test-utils"')) {
      importEnd++;
    }

    // Check if getSupabaseServerMock is already imported
    const importBlock = lines.slice(importStart, importEnd + 1).join('\n');

    if (!importBlock.includes('getSupabaseServerMock')) {
      // Need to add getSupabaseServerMock and getAuthMock
      // Find a line with a closing } before 'from'
      for (let i = importStart; i <= importEnd; i++) {
        if (lines[i].includes('} from')) {
          lines[i] = lines[i].replace('} from', '  getSupabaseServerMock,\n  getAuthMock,\n} from');
          break;
        } else if (lines[i].includes('}') && i < importEnd) {
          // Multi-line import - find the } line
          if (lines[i].trim() === '}') {
            lines[i] = '  getSupabaseServerMock,\n  getAuthMock,\n}';
            break;
          }
        }
      }
    }

    // Remove createStatefulSupabaseMock if present
    for (let i = importStart; i <= importEnd; i++) {
      if (lines[i].includes('createStatefulSupabaseMock')) {
        lines[i] = lines[i].replace(/,?\s*createStatefulSupabaseMock\s*,?/, ',');
        lines[i] = lines[i].replace(/,\s*,/g, ',');
        lines[i] = lines[i].replace(/\{\s*,/g, '{');
        lines[i] = lines[i].replace(/,\s*\}/g, '}');
      }
    }
  }

  // Replace custom supabase mock with getSupabaseServerMock()
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("vi.mock('@/lib/supabase/server'") ||
        lines[i].includes('vi.mock("@/lib/supabase/server"')) {
      // Check if it's a multi-line mock
      if (lines[i].includes('() => ({') || lines[i].includes('() => {')) {
        // Find the end of this mock block
        let depth = 0;
        let startIdx = i;
        let endIdx = i;
        for (let j = i; j < lines.length; j++) {
          depth += (lines[j].match(/\(/g) || []).length;
          depth -= (lines[j].match(/\)/g) || []).length;
          if (depth <= 0) {
            endIdx = j;
            break;
          }
        }
        // Replace the entire block
        lines.splice(startIdx, endIdx - startIdx + 1,
          "vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())");
        break;
      }
    }
  }

  // Replace custom auth mock with getAuthMock()
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("vi.mock('@/lib/auth'") ||
        lines[i].includes('vi.mock("@/lib/auth"')) {
      // Check if it's a multi-line mock
      if (lines[i].includes('() => ({') || lines[i].includes('() => {')) {
        // Find the end of this mock block
        let depth = 0;
        let endIdx = i;
        for (let j = i; j < lines.length; j++) {
          depth += (lines[j].match(/\(/g) || []).length;
          depth -= (lines[j].match(/\)/g) || []).length;
          if (depth <= 0) {
            endIdx = j;
            break;
          }
        }
        // Replace the entire block
        lines.splice(i, endIdx - i + 1, "vi.mock('@/lib/auth', () => getAuthMock())");
        break;
      }
    }
  }

  // Ensure rate-limit mock exists
  let hasRateLimitMock = lines.some(l => l.includes("vi.mock('@/lib/rate-limit'"));
  if (!hasRateLimitMock) {
    // Find the line after getAuthMock and insert rate-limit mock
    const authMockIdx = lines.findIndex(l => l.includes("getAuthMock()"));
    if (authMockIdx !== -1) {
      lines.splice(authMockIdx + 1, 0,
        "vi.mock('@/lib/rate-limit', () => ({",
        "  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10 }),",
        "  RATE_LIMITS: { api: { standard: { requests: 100, window: '1m' } } },",
        "}))"
      );
    }
  }

  // Ensure logger mock exists
  let hasLoggerMock = lines.some(l => l.includes("vi.mock('@/lib/logger'"));
  if (!hasLoggerMock) {
    const rateLimitIdx = lines.findIndex(l => l.includes("vi.mock('@/lib/rate-limit'"));
    if (rateLimitIdx !== -1) {
      // Find end of rate-limit mock
      let depth = 0;
      let endIdx = rateLimitIdx;
      for (let j = rateLimitIdx; j < lines.length; j++) {
        depth += (lines[j].match(/\(/g) || []).length;
        depth -= (lines[j].match(/\)/g) || []).length;
        if (depth <= 0) {
          endIdx = j;
          break;
        }
      }
      lines.splice(endIdx + 1, 0,
        "vi.mock('@/lib/logger', () => ({",
        "  logger: {",
        "    error: vi.fn(),",
        "    info: vi.fn(),",
        "    warn: vi.fn(),",
        "  },",
        "}))"
      );
    }
  }

  fs.writeFileSync(fullPath, lines.join('\n'));
  console.log(`FIXED: ${filePath}`);
}

console.log('Fixing test files...\n');
TEST_FILES.forEach(fixFile);
console.log('\nDone!');
