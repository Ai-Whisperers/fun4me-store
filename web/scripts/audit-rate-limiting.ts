/**
 * Rate Limiting Audit Script
 * Finds all mutation endpoints without rate limiting
 * Generates CSV report with recommendations
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface EndpointInfo {
  file: string;
  method: string;
  hasRateLimit: boolean;
  usesWithApiAuth: boolean;
  recommendedTier: string;
  lineNumber: number;
}

async function auditRateLimiting() {
  const apiDir = path.join(process.cwd(), 'app', 'api');
  const routeFiles = await glob('**/route.ts', { cwd: apiDir });
  
  const findings: EndpointInfo[] = [];
  
  for (const file of routeFiles) {
    const fullPath = path.join(apiDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    // Check for mutation methods
    const mutations = ['POST', 'PATCH', 'PUT', 'DELETE'];
    
    for (const method of mutations) {
      const methodRegex = new RegExp('export (const|async function) ' + method, 'g');
      let match;
      
      while ((match = methodRegex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        // Check if this specific method has rate limiting
        const contextStart = Math.max(0, lineNumber - 1);
        const contextEnd = Math.min(lines.length, lineNumber + 10);
        const context = lines.slice(contextStart, contextEnd).join('\n');
        
        const hasRateLimit = /rateLimit:\s*['"]/.test(context);
        const usesWithApiAuth = /withApiAuth/.test(context);
        
        findings.push({
          file: file.replace(/\\/g, '/'),
          method,
          hasRateLimit,
          usesWithApiAuth,
          recommendedTier: recommendTier(file, method),
          lineNumber
        });
      }
    }
  }
  
  // Generate report
  console.log('\n=== Rate Limiting Audit Report ===\n');
  console.log('Total mutation endpoints: ' + findings.length);
  console.log('Protected: ' + findings.filter(f => f.hasRateLimit).length);
  console.log('Missing: ' + findings.filter(f => !f.hasRateLimit).length);
  console.log('Uses withApiAuth: ' + findings.filter(f => f.usesWithApiAuth).length);
  
  // CSV output
  const csv = [
    'File,Method,HasRateLimit,UsesWithApiAuth,RecommendedTier,LineNumber',
    ...findings.map(f => 
      f.file + ',' + f.method + ',' + f.hasRateLimit + ',' + f.usesWithApiAuth + ',' + f.recommendedTier + ',' + f.lineNumber
    )
  ].join('\n');
  
  fs.writeFileSync('rate-limiting-audit.csv', csv);
  console.log('\nFull report saved to: rate-limiting-audit.csv');
  
  // Show missing by category
  const missing = findings.filter(f => !f.hasRateLimit);
  const byTier = groupBy(missing, 'recommendedTier');
  
  console.log('\n=== Missing By Priority ===\n');
  
  const tierOrder = ['refund', 'financial', 'auth', 'booking', 'checkout', 'cart', 'write', 'search', 'default'];
  tierOrder.forEach(tier => {
    const endpoints = byTier[tier] || [];
    if (endpoints.length > 0) {
      console.log('\n' + tier.toUpperCase() + ': ' + endpoints.length + ' endpoints');
      endpoints.slice(0, 5).forEach(e => {
        console.log('  - ' + e.file + ' (' + e.method + ') line ' + e.lineNumber);
      });
      if (endpoints.length > 5) {
        console.log('  ... and ' + (endpoints.length - 5) + ' more');
      }
    }
  });
  
  // Generate checklist
  const detailedReport = tierOrder.map(tier => {
    const endpoints = byTier[tier] || [];
    if (endpoints.length === 0) return '';
    
    return '\n## ' + tier.toUpperCase() + ' (' + endpoints.length + ' endpoints)\n\n' +
      endpoints.map(e => 
        '- [ ] `' + e.file + '` (' + e.method + ') line ' + e.lineNumber
      ).join('\n');
  }).join('\n');
  
  fs.writeFileSync('rate-limiting-checklist.md', 
    '# Rate Limiting Implementation Checklist\n\n' +
    'Generated: ' + new Date().toISOString() + '\n\n' +
    '**Total**: ' + missing.length + ' endpoints need rate limiting\n' +
    detailedReport
  );
  
  console.log('\nChecklist saved to: rate-limiting-checklist.md');
  console.log('\n=== Next Steps ===\n');
  console.log('1. Review rate-limiting-audit.csv for full list');
  console.log('2. Start with high-priority tiers: refund, financial, auth');
  console.log('3. Add rateLimit option to withApiAuth calls');
}

function recommendTier(file: string, method: string): string {
  const p = file.toLowerCase();
  
  if (p.includes('refund')) return 'refund';
  
  if (p.includes('payment') || p.includes('invoice') || 
      p.includes('billing') || p.includes('stripe') ||
      p.includes('charge') || p.includes('transfer')) {
    return 'financial';
  }
  
  if (p.includes('auth') || p.includes('login') || 
      p.includes('signup') || p.includes('register') ||
      p.includes('onboarding') || p.includes('preferences')) {
    return 'auth';
  }
  
  if (p.includes('appointment') || p.includes('book') ||
      p.includes('waitlist') || p.includes('recurrence')) {
    return 'booking';
  }
  
  if (p.includes('cart') || p.includes('wishlist')) return 'cart';
  
  if (p.includes('checkout') || p.includes('order') || 
      p.includes('subscription')) {
    return 'checkout';
  }
  
  if (p.includes('search') || p.includes('check-availability')) {
    return 'search';
  }
  
  return 'write';
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    (result[group] = result[group] || []).push(item);
    return result;
  }, {} as Record<string, T[]>);
}

auditRateLimiting().catch(console.error);
