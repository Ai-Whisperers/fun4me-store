#!/usr/bin/env node

/**
 * Pre-commit Validation Script
 * 
 * Validates code quality before allowing git commits.
 * Checks:
 * 1. tenant_id filtering in API routes and server actions
 * 2. RLS policies in SQL migrations
 * 3. Hardcoded colors in components
 * 
 * Usage:
 *   node scripts/pre-commit-validate.js
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - Validation failures found
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function checkTenantFiltering(files) {
  log('\n🔒 Checking tenant_id filtering...', 'cyan');
  
  const apiFiles = files.filter(f => 
    (f.startsWith('web/app/api/') || f.startsWith('web/app/actions/')) && 
    f.endsWith('.ts')
  );
  
  if (apiFiles.length === 0) {
    log('  ✓ No API routes or actions to check', 'gray');
    return { passed: true, violations: [] };
  }
  
  const violations = [];
  
  for (const file of apiFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Check if file has Supabase queries
    const hasFromQuery = /\.from\(['"`]\w+['"`]\)/.test(content);
    
    if (hasFromQuery) {
      // Check for tenant_id filter
      const hasTenantFilter = /\.eq\(['"`]tenant_id['"`]/.test(content) || 
                              /WHERE\s+tenant_id/i.test(content) ||
                              /\.rpc\(['"`]\w+['"`]/.test(content); // RPC calls may handle filtering internally
      
      if (!hasTenantFilter) {
        violations.push({
          file,
          message: 'Missing tenant_id filter in Supabase query',
          suggestion: `Add .eq("tenant_id", profile.tenant_id) after .from()`,
        });
      }
    }
  }
  
  if (violations.length > 0) {
    log(`  ❌ Found ${violations.length} tenant_id filtering violation(s)`, 'red');
    violations.forEach(v => {
      log(`\n  File: ${v.file}`, 'yellow');
      log(`  Issue: ${v.message}`, 'red');
      log(`  Fix: ${v.suggestion}`, 'green');
    });
    return { passed: false, violations };
  }
  
  log(`  ✓ All ${apiFiles.length} file(s) properly filter by tenant_id`, 'green');
  return { passed: true, violations: [] };
}

function checkRLSPolicies(files) {
  log('\n🛡️  Checking RLS policies in migrations...', 'cyan');
  
  const sqlFiles = files.filter(f => f.startsWith('web/db/') && f.endsWith('.sql'));
  
  if (sqlFiles.length === 0) {
    log('  ✓ No SQL migrations to check', 'gray');
    return { passed: true, violations: [] };
  }
  
  const violations = [];
  
  for (const file of sqlFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Check if creates a table
    const hasCreateTable = /CREATE TABLE/i.test(content);
    
    if (hasCreateTable) {
      const hasTenantId = /tenant_id\s+(TEXT|UUID)\s+NOT\s+NULL/i.test(content);
      const hasRLS = /ENABLE ROW LEVEL SECURITY/i.test(content);
      const hasPolicy = /CREATE POLICY/i.test(content);
      
      const issues = [];
      if (!hasTenantId) issues.push('Missing tenant_id column');
      if (!hasRLS) issues.push('RLS not enabled');
      if (!hasPolicy) issues.push('No RLS policy created');
      
      if (issues.length > 0) {
        violations.push({
          file,
          message: `RLS compliance issues: ${issues.join(', ')}`,
          suggestion: `Add tenant_id column, enable RLS, and create policies`,
        });
      }
    }
  }
  
  if (violations.length > 0) {
    log(`  ❌ Found ${violations.length} RLS policy violation(s)`, 'red');
    violations.forEach(v => {
      log(`\n  File: ${v.file}`, 'yellow');
      log(`  Issue: ${v.message}`, 'red');
      log(`  Fix: ${v.suggestion}`, 'green');
    });
    return { passed: false, violations };
  }
  
  log(`  ✓ All ${sqlFiles.length} migration(s) have proper RLS policies`, 'green');
  return { passed: true, violations: [] };
}

function checkHardcodedColors(files) {
  log('\n🎨 Checking for hardcoded colors...', 'cyan');
  
  const componentFiles = files.filter(f => 
    (f.startsWith('web/app/') || f.startsWith('web/components/')) && 
    (f.endsWith('.tsx') || f.endsWith('.ts'))
  );
  
  if (componentFiles.length === 0) {
    log('  ✓ No component files to check', 'gray');
    return { passed: true, violations: [] };
  }
  
  const colorPattern = /(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]/g;
  const violations = [];
  
  for (const file of componentFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const matches = content.match(colorPattern);
    
    if (matches && matches.length > 0) {
      violations.push({
        file,
        count: matches.length,
        examples: matches.slice(0, 3), // Show first 3 examples
      });
    }
  }
  
  if (violations.length > 0) {
    const totalCount = violations.reduce((sum, v) => sum + v.count, 0);
    log(`  ⚠️  Found ${totalCount} hardcoded color(s) in ${violations.length} file(s)`, 'yellow');
    violations.forEach(v => {
      log(`\n  File: ${v.file}`, 'yellow');
      log(`  Count: ${v.count}`, 'yellow');
      log(`  Examples: ${v.examples.join(', ')}`, 'gray');
      log(`  Fix: Use var(--primary), var(--text-primary), etc.`, 'green');
    });
    log('\n  Note: This is a WARNING, not blocking commit', 'gray');
    // Don't fail on hardcoded colors - just warn
    return { passed: true, violations };
  }
  
  log(`  ✓ No hardcoded colors found in ${componentFiles.length} file(s)`, 'green');
  return { passed: true, violations: [] };
}

async function main() {
  log('\n🔍 Vete Pre-Commit Validation', 'cyan');
  log('═'.repeat(50), 'cyan');
  
  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    log('\n⚠️  No staged files found', 'yellow');
    log('Run: git add <files> before committing\n', 'gray');
    process.exit(0);
  }
  
  log(`\nChecking ${stagedFiles.length} staged file(s)...\n`, 'gray');
  
  // Run all checks
  const tenantResult = checkTenantFiltering(stagedFiles);
  const rlsResult = checkRLSPolicies(stagedFiles);
  const colorResult = checkHardcodedColors(stagedFiles);
  
  // Summary
  log('\n' + '═'.repeat(50), 'cyan');
  
  const allPassed = tenantResult.passed && rlsResult.passed && colorResult.passed;
  
  if (allPassed) {
    log('\n✅ All validation checks passed!', 'green');
    log('Proceeding with commit...\n', 'gray');
    process.exit(0);
  } else {
    log('\n❌ Validation failed - commit blocked', 'red');
    log('\nFix the issues above and try again.', 'yellow');
    log('Aborting commit...\n', 'gray');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Validation script error: ${error.message}`, 'red');
  process.exit(1);
});
