#!/usr/bin/env node

/**
 * API Performance Baseline Measurement Script
 * 
 * Measures response times for critical API endpoints under various load conditions.
 * Generates baseline metrics to compare against after refactoring.
 * 
 * Usage:
 *   node scripts/measure-api-performance.js
 * 
 * Requirements:
 *   - Dev server running on localhost:3000
 *   - Test user credentials (for authenticated endpoints)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const OUTPUT_FILE = path.join(__dirname, '..', 'metrics', 'api-performance-baseline.md');
const CONCURRENCY_LEVELS = [1, 10, 50, 100];
const REQUESTS_PER_TEST = 100; // Reduced from 1000 for faster execution
const TEST_DURATION_SECONDS = 60;

// Endpoints to test (readonly operations to avoid side effects)
const ENDPOINTS = [
  { method: 'GET', path: '/api/health', name: 'Health Check', auth: false },
  { method: 'GET', path: '/api/pets', name: 'Get Pets List', auth: true },
  { method: 'GET', path: '/api/appointments', name: 'Get Appointments', auth: true },
  { method: 'GET', path: '/api/invoices', name: 'Get Invoices', auth: true },
  { method: 'GET', path: '/api/store/products', name: 'Get Products', auth: false },
  { method: 'GET', path: '/api/store/cart', name: 'Get Cart', auth: true },
  { method: 'GET', path: '/api/dashboard/stats', name: 'Dashboard Stats', auth: true },
  { method: 'GET', path: '/api/notifications', name: 'Get Notifications', auth: true },
];

// Simple HTTP request wrapper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        status: 0,
        duration,
        success: false,
        error: error.message,
      });
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Calculate percentiles
function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Calculate statistics from response times
function calculateStats(durations) {
  if (durations.length === 0) {
    return { min: 0, max: 0, p50: 0, p95: 0, p99: 0, avg: 0 };
  }
  
  const sorted = durations.slice().sort((a, b) => a - b);
  
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: calculatePercentile(sorted, 50),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
    avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
  };
}

// Test endpoint with specific concurrency
async function testEndpoint(endpoint, concurrency) {
  const url = `${BASE_URL}${endpoint.path}`;
  const options = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Add auth header if needed (simplified - would need real token in production)
  if (endpoint.auth) {
    options.headers['Authorization'] = 'Bearer mock-token';
  }
  
  console.log(`  Testing ${endpoint.name} (${concurrency} concurrent)...`);
  
  const results = [];
  const batchSize = concurrency;
  const totalBatches = Math.ceil(REQUESTS_PER_TEST / batchSize);
  
  for (let batch = 0; batch < totalBatches; batch++) {
    const promises = [];
    const requestsInBatch = Math.min(batchSize, REQUESTS_PER_TEST - (batch * batchSize));
    
    for (let i = 0; i < requestsInBatch; i++) {
      promises.push(makeRequest(url, options));
    }
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }
  
  const durations = results.map(r => r.duration);
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / results.length) * 100;
  
  const stats = calculateStats(durations);
  
  return {
    ...stats,
    successRate: successRate.toFixed(1),
    totalRequests: results.length,
    successfulRequests: successCount,
  };
}

// Generate markdown report
function generateReport(allResults) {
  const now = new Date().toISOString().split('T')[0];
  
  let markdown = `# API Performance Baseline

**Date**: ${now}  
**Environment**: Local development (${BASE_URL})  
**Tool**: Custom Node.js script  
**Requests per test**: ${REQUESTS_PER_TEST}  
**Concurrency Levels**: ${CONCURRENCY_LEVELS.join(', ')}  

## Methodology

- **Test Duration**: ~${REQUESTS_PER_TEST * ENDPOINTS.length * CONCURRENCY_LEVELS.length / 60} minutes total
- **Requests per Endpoint**: ${REQUESTS_PER_TEST} requests
- **Concurrency Levels**: ${CONCURRENCY_LEVELS.join(', ')} concurrent requests
- **Environment**: 
  - Next.js 15.1.3 dev server
  - Base URL: ${BASE_URL}
- **Measurement**: Wall clock time from request start to response complete
- **Note**: Some endpoints require authentication (simplified mock token used)

## Results Summary

### Overall Metrics

`;

  // Calculate overall stats
  const allP50 = [];
  const allP95 = [];
  const allSuccessRates = [];
  
  Object.values(allResults).forEach(endpointResults => {
    Object.values(endpointResults).forEach(result => {
      allP50.push(result.p50);
      allP95.push(result.p95);
      allSuccessRates.push(parseFloat(result.successRate));
    });
  });
  
  const overallStats = {
    bestP50: Math.min(...allP50),
    worstP50: Math.max(...allP50),
    avgP50: Math.round(allP50.reduce((a, b) => a + b, 0) / allP50.length),
    bestP95: Math.min(...allP95),
    worstP95: Math.max(...allP95),
    avgP95: Math.round(allP95.reduce((a, b) => a + b, 0) / allP95.length),
    avgSuccessRate: (allSuccessRates.reduce((a, b) => a + b, 0) / allSuccessRates.length).toFixed(1),
  };
  
  markdown += `| Metric | Best | Worst | Average |
|--------|------|-------|---------|
| P50 Response Time | ${overallStats.bestP50}ms | ${overallStats.worstP50}ms | ${overallStats.avgP50}ms |
| P95 Response Time | ${overallStats.bestP95}ms | ${overallStats.worstP95}ms | ${overallStats.avgP95}ms |
| Success Rate | - | - | ${overallStats.avgSuccessRate}% |

`;

  // Identify problem areas
  markdown += `## Problem Areas Identified

### Critical (P95 > 1000ms)

`;

  const criticalEndpoints = [];
  Object.entries(allResults).forEach(([endpointName, results]) => {
    Object.entries(results).forEach(([concurrency, stats]) => {
      if (stats.p95 > 1000) {
        criticalEndpoints.push({ endpointName, concurrency, stats });
      }
    });
  });
  
  if (criticalEndpoints.length === 0) {
    markdown += `✅ No critical performance issues detected\n\n`;
  } else {
    criticalEndpoints.forEach((item, index) => {
      markdown += `${index + 1}. **${item.endpointName}** @ ${item.concurrency} concurrency
   - P95: ${item.stats.p95}ms
   - Success Rate: ${item.stats.successRate}%
   - Recommendation: Investigate query optimization or add caching

`;
    });
  }

  // Detailed results per endpoint
  markdown += `## Detailed Results

`;

  Object.entries(allResults).forEach(([endpointName, results]) => {
    markdown += `### ${endpointName}

| Concurrency | Requests | P50 | P95 | P99 | Max | Success Rate |
|-------------|----------|-----|-----|-----|-----|--------------|
`;
    
    CONCURRENCY_LEVELS.forEach(level => {
      const stats = results[level];
      if (stats) {
        markdown += `| ${level} | ${stats.totalRequests} | ${stats.p50}ms | ${stats.p95}ms | ${stats.p99}ms | ${stats.max}ms | ${stats.successRate}% |
`;
      }
    });
    
    markdown += `\n`;
  });

  // Performance budgets
  markdown += `## Performance Budgets (Targets for Phase 6)

### API Response Times
- **GET endpoints (simple)**: P95 < 200ms
- **GET endpoints (complex)**: P95 < 400ms
- **POST endpoints (simple)**: P95 < 500ms
- **POST endpoints (complex)**: P95 < 1000ms
- **Success rate**: > 99.5% @ 50 concurrency

### Current vs Target

| Endpoint Type | Current Avg P95 | Target P95 | Gap |
|---------------|-----------------|------------|-----|
| Simple GET | ${Math.round(allP95.slice(0, 4).reduce((a, b) => a + b, 0) / 4)}ms | 200ms | ${Math.round(allP95.slice(0, 4).reduce((a, b) => a + b, 0) / 4) - 200}ms |
| Complex GET | ${overallStats.avgP95}ms | 400ms | ${overallStats.avgP95 - 400}ms |

## Next Steps

1. Run these tests again after Phase 1-2 (service layer refactor)
2. Compare results to identify regressions
3. Run after Phase 3 (background jobs)
4. Run after Phase 4 (database optimization) - expect major improvements
5. Final measurement after Phase 6

## Test Reproduction

\`\`\`bash
# Ensure dev server is running
npm run dev

# In new terminal, run baseline
node scripts/measure-api-performance.js
\`\`\`

## Notes

- ⚠️ This is a **development environment baseline**. Production performance will differ.
- ⚠️ Measurements include Next.js dev server overhead (HMR, source maps, etc.)
- ⚠️ Real authentication not implemented - using mock tokens
- ✅ Useful for **relative comparisons** between refactoring phases
- ✅ Identifies **performance trends** and **problem endpoints**

---

**Generated**: ${new Date().toISOString()}  
**Script**: scripts/measure-api-performance.js  
**Next Measurement**: After Phase 1-2 completion
`;

  return markdown;
}

// Main execution
async function main() {
  console.log('🚀 Starting API Performance Baseline Measurement...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Endpoints: ${ENDPOINTS.length}`);
  console.log(`Concurrency Levels: ${CONCURRENCY_LEVELS.join(', ')}`);
  console.log(`Requests per test: ${REQUESTS_PER_TEST}\n`);
  
  const allResults = {};
  
  for (const endpoint of ENDPOINTS) {
    console.log(`\nTesting: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
    allResults[endpoint.name] = {};
    
    for (const concurrency of CONCURRENCY_LEVELS) {
      try {
        const stats = await testEndpoint(endpoint, concurrency);
        allResults[endpoint.name][concurrency] = stats;
        console.log(`    ✓ Concurrency ${concurrency}: P50=${stats.p50}ms P95=${stats.p95}ms Success=${stats.successRate}%`);
      } catch (error) {
        console.error(`    ✗ Concurrency ${concurrency}: ${error.message}`);
        allResults[endpoint.name][concurrency] = {
          min: 0, max: 0, p50: 0, p95: 0, p99: 0, avg: 0,
          successRate: '0.0',
          totalRequests: 0,
          successfulRequests: 0,
        };
      }
    }
  }
  
  console.log('\n\n📊 Generating report...');
  
  const report = generateReport(allResults);
  
  // Ensure metrics directory exists
  const metricsDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(metricsDir)) {
    fs.mkdirSync(metricsDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
  
  console.log(`\n✅ Report saved to: ${OUTPUT_FILE}`);
  console.log(`\n📈 Summary:`);
  console.log(`   - ${ENDPOINTS.length} endpoints tested`);
  console.log(`   - ${CONCURRENCY_LEVELS.length} concurrency levels`);
  console.log(`   - ${ENDPOINTS.length * CONCURRENCY_LEVELS.length * REQUESTS_PER_TEST} total requests`);
  console.log(`\n🎯 Next: Review the report and compare after refactoring phases\n`);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { testEndpoint, calculateStats, generateReport };
