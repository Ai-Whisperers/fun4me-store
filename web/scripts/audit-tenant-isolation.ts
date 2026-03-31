#!/usr/bin/env tsx
/**
 * TENANT ISOLATION AUDIT SCRIPT
 * 
 * Automatically scans all API routes to detect missing tenant isolation.
 * 
 * CHECKS:
 * 1. Routes with tenant_id columns that don't filter by tenant_id
 * 2. Routes missing authentication
 * 3. Routes using raw SQL without parameterization
 * 4. Routes that could leak cross-tenant data
 * 
 * TICKET: TICKET-SEC-003
 * EPIC: EPIC-001-Security-Vulnerabilities
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

interface AuditFinding {
  file: string
  line: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  issue: string
  recommendation: string
  codeSnippet?: string
}

const findings: AuditFinding[] = []

// Tables that have tenant_id column
const TENANT_TABLES = [
  'tenants',
  'profiles',
  'pets',
  'vaccines',
  'medical_records',
  'appointments',
  'services',
  'invoices',
  'payments',
  'prescriptions',
  'lost_pets',
  'messages',
  'conversations',
  'hospitalizations',
  'lab_orders',
  'expenses',
  'audit_logs',
  'notifications',
  'kennels',
  'staff_profiles',
  // Add more as needed
]

async function auditFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  // Check 1: Missing withApiAuth wrapper
  if (!content.includes('withApiAuth') && !content.includes('auth.getUser')) {
    const isPublicRoute = content.includes('// PUBLIC') || content.includes('@public')
    if (!isPublicRoute && (content.includes('export const GET') || content.includes('export const POST') || content.includes('export const PATCH') || content.includes('export const DELETE'))) {
      findings.push({
        file: filePath,
        line: 1,
        severity: 'critical',
        issue: 'Missing authentication check',
        recommendation: 'Wrap handler with withApiAuth() or manually check supabase.auth.getUser()',
      })
    }
  }
  
  // Check 2: Query tenant tables without tenant_id filter
  for (const table of TENANT_TABLES) {
    const fromPattern = new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)`, 'g')
    const matches = [...content.matchAll(fromPattern)]
    
    for (const match of matches) {
      const matchIndex = match.index!
      const lineNumber = content.substring(0, matchIndex).split('\n').length
      
      // Look ahead 10 lines to check for .eq('tenant_id', ...)
      const contextStart = matchIndex
      const contextEnd = Math.min(matchIndex + 500, content.length)
      const context = content.substring(contextStart, contextEnd)
      
      if (!context.includes('.eq(\'tenant_id\'') && !context.includes('.eq("tenant_id"')) {
        // Check if it's a legitimate exception (e.g., public lookup, auth check)
        const isPublicLookup = context.includes('// PUBLIC') || context.includes('@public')
        const hasIsStaffOf = context.includes('is_staff_of(')
        const hasIsOwnerOf = context.includes('is_owner_of_pet(')
        
        if (!isPublicLookup && !hasIsStaffOf && !hasIsOwnerOf) {
          findings.push({
            file: filePath,
            line: lineNumber,
            severity: 'critical',
            issue: `Query on '${table}' table without tenant_id filter`,
            recommendation: `Add .eq('tenant_id', profile.tenant_id) after .from('${table}')`,
            codeSnippet: lines[lineNumber - 1]?.trim(),
          })
        }
      }
    }
  }
  
  // Check 3: Direct supabase client usage without profile context
  const clientPattern = /const \w+ = createClient\(\)/g
  if (clientPattern.test(content) && !content.includes('profile.tenant_id')) {
    // This might be OK for some routes, but worth flagging
    findings.push({
      file: filePath,
      line: 1,
      severity: 'medium',
      issue: 'Supabase client created but no profile.tenant_id usage detected',
      recommendation: 'Ensure all queries filter by tenant_id if accessing multi-tenant tables',
    })
  }
  
  // Check 4: Raw SQL without parameterization
  const rawSqlPattern = /\$\{.*?\}/g
  const rawMatches = [...content.matchAll(rawSqlPattern)]
  for (const match of rawMatches) {
    const matchIndex = match.index!
    const lineNumber = content.substring(0, matchIndex).split('\n').length
    const line = lines[lineNumber - 1]
    
    if (line.includes('sql`') || line.includes('.rpc(')) {
      findings.push({
        file: filePath,
        line: lineNumber,
        severity: 'high',
        issue: 'Potential SQL injection via string interpolation',
        recommendation: 'Use parameterized queries instead of template literals in SQL',
        codeSnippet: line.trim(),
      })
    }
  }
}

async function main() {
  console.log('🔍 Auditing API routes for tenant isolation issues...\n')
  
  const apiRoutes = await glob('web/app/api/**/route.ts', { absolute: true })
  
  console.log(`Found ${apiRoutes.length} API route files\n`)
  
  for (const route of apiRoutes) {
    await auditFile(route)
  }
  
  // Generate report
  console.log('=' .repeat(80))
  console.log('TENANT ISOLATION AUDIT REPORT')
  console.log('='.repeat(80))
  console.log()
  
  const criticalCount = findings.filter(f => f.severity === 'critical').length
  const highCount = findings.filter(f => f.severity === 'high').length
  const mediumCount = findings.filter(f => f.severity === 'medium').length
  const lowCount = findings.filter(f => f.severity === 'low').length
  
  console.log(`🔴 CRITICAL: ${criticalCount}`)
  console.log(`🟠 HIGH: ${highCount}`)
  console.log(`🟡 MEDIUM: ${mediumCount}`)
  console.log(`🟢 LOW: ${lowCount}`)
  console.log()
  
  if (findings.length === 0) {
    console.log('✅ No tenant isolation issues found!')
    process.exit(0)
  }
  
  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  
  // Group by severity
  for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
    const severityFindings = findings.filter(f => f.severity === severity)
    if (severityFindings.length === 0) continue
    
    console.log(`\n${'='.repeat(80)}`)
    console.log(`${severity.toUpperCase()} ISSUES (${severityFindings.length})`)
    console.log('='.repeat(80))
    
    for (const finding of severityFindings) {
      console.log()
      console.log(`📍 ${finding.file}:${finding.line}`)
      console.log(`   ${finding.issue}`)
      console.log(`   💡 ${finding.recommendation}`)
      if (finding.codeSnippet) {
        console.log(`   📝 ${finding.codeSnippet}`)
      }
    }
  }
  
  // Export CSV for tracking
  const csv = [
    'File,Line,Severity,Issue,Recommendation',
    ...findings.map(f => 
      `"${f.file}",${f.line},"${f.severity}","${f.issue}","${f.recommendation}"`
    )
  ].join('\n')
  
  const reportPath = path.join(process.cwd(), 'tenant-isolation-audit.csv')
  fs.writeFileSync(reportPath, csv)
  
  console.log()
  console.log('='.repeat(80))
  console.log(`📊 Report saved to: ${reportPath}`)
  console.log('='.repeat(80))
  
  // Exit with error if critical issues found
  if (criticalCount > 0) {
    console.log()
    console.log('❌ AUDIT FAILED: Critical tenant isolation issues must be fixed')
    process.exit(1)
  }
  
  process.exit(0)
}

main().catch(console.error)
