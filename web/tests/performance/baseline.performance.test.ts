/**
 * Performance Baseline Test Suite
 * 
 * Establishes performance baselines for 10 critical API endpoints.
 * Runs 20 iterations per endpoint with 3 warmup runs.
 * 
 * Usage:
 *   npm run test:performance:baseline
 * 
 * Output:
 *   - Console: Performance metrics table
 *   - File: tests/performance/results/baseline-YYYY-MM-DD.json
 */

import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// Test configuration
const ITERATIONS = 20
const WARMUP_RUNS = 3
const BASE_URL = 'http://localhost:3000'
const TEST_TIMEOUT = 60000 // 60 seconds per test

// Critical endpoints to measure
const ENDPOINTS = [
  {
    endpoint: '/api/pets',
    method: 'GET',
    description: 'List all pets for a user',
    target_p95: 500, // ms
  },
  {
    endpoint: '/api/pets',
    method: 'POST',
    description: 'Create new pet',
    target_p95: 800,
    body: {
      name: 'Test Pet',
      species: 'dog',
      breed: 'Golden Retriever',
      birth_date: '2020-01-01',
    },
  },
  {
    endpoint: '/api/booking',
    method: 'GET',
    description: 'Booking page data (services + slots)',
    target_p95: 600,
  },
  {
    endpoint: '/api/appointments/slots',
    method: 'GET',
    description: 'Available appointment slots',
    target_p95: 700,
    query: '?date=2026-02-01&service_id=test',
  },
  {
    endpoint: '/api/dashboard/vaccines',
    method: 'GET',
    description: 'Vaccine dashboard (upcoming + overdue)',
    target_p95: 600,
  },
  {
    endpoint: '/api/vaccines',
    method: 'GET',
    description: 'List all vaccines',
    target_p95: 500,
  },
  {
    endpoint: '/api/billing/invoices',
    method: 'GET',
    description: 'List invoices with pagination',
    target_p95: 700,
  },
  {
    endpoint: '/api/inventory/catalog',
    method: 'GET',
    description: 'Global inventory catalog',
    target_p95: 800,
  },
  {
    endpoint: '/api/dashboard/inventory',
    method: 'GET',
    description: 'Inventory dashboard',
    target_p95: 600,
  },
  {
    endpoint: '/api/analytics',
    method: 'GET',
    description: 'Analytics overview',
    target_p95: 1000,
  },
]

// Statistics helper
interface PerformanceStats {
  min: number
  max: number
  mean: number
  p50: number
  p95: number
  p99: number
}

function calculateStats(times: number[]): PerformanceStats {
  const sorted = [...times].sort((a, b) => a - b)
  const sum = times.reduce((acc, t) => acc + t, 0)

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / times.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  }
}

// Measurement helper
async function measureEndpoint(
  endpoint: string,
  method: string,
  options: RequestInit = {}
): Promise<number> {
  const start = performance.now()
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    // Wait for body to be consumed (full request time)
    await response.text()
    
    const end = performance.now()
    return end - start
  } catch (error) {
    const end = performance.now()
    console.warn(`Request failed for ${endpoint}:`, error)
    return end - start
  }
}

// Results storage
interface BaselineResult {
  timestamp: string
  environment: string
  measurements_per_endpoint: number
  warmup_runs: number
  endpoints: Array<{
    endpoint: string
    method: string
    description: string
    target_p95: number
    stats: PerformanceStats
  }>
}

function saveBaselineResults(results: BaselineResult): void {
  const resultsDir = join(process.cwd(), 'tests/performance/results')
  
  // Ensure directory exists
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true })
  }

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0]
  const filename = `baseline-${date}.json`
  const filepath = join(resultsDir, filename)

  // Write results
  writeFileSync(filepath, JSON.stringify(results, null, 2))
  
  console.log('\n📊 Performance Baseline Report Generated')
  console.log(`   File: ${filepath}`)
  console.log(`   Total endpoints: ${results.endpoints.length}`)
  console.log(`   Total measurements: ${results.endpoints.length * results.measurements_per_endpoint}`)
}

function printSummaryTable(results: BaselineResult): void {
  console.log('\n┌─────────────────────────────────────┬────────┬────────┬────────┬────────┬────────┐')
  console.log('│ Endpoint                            │ Mean   │ P50    │ P95    │ P99    │ Target │')
  console.log('├─────────────────────────────────────┼────────┼────────┼────────┼────────┼────────┤')
  
  results.endpoints.forEach((ep) => {
    const endpoint = `${ep.method} ${ep.endpoint}`.padEnd(35)
    const mean = ep.stats.mean.toFixed(1).padStart(6)
    const p50 = ep.stats.p50.toFixed(1).padStart(6)
    const p95 = ep.stats.p95.toFixed(1).padStart(6)
    const p99 = ep.stats.p99.toFixed(1).padStart(6)
    const target = ep.target_p95.toFixed(0).padStart(6)
    
    // Color code based on target
    const exceeds = ep.stats.p95 > ep.target_p95
    const symbol = exceeds ? '❌' : '✅'
    
    console.log(`│ ${symbol} ${endpoint.substring(0, 33)} │ ${mean} │ ${p50} │ ${p95} │ ${p99} │ ${target} │`)
  })
  
  console.log('└─────────────────────────────────────┴────────┴────────┴────────┴────────┴────────┘')
}

// Main test suite
describe('Performance Baseline Tests', () => {
  const allResults: BaselineResult = {
    timestamp: new Date().toISOString(),
    environment: 'test',
    measurements_per_endpoint: ITERATIONS,
    warmup_runs: WARMUP_RUNS,
    endpoints: [],
  }

  // Test each endpoint
  ENDPOINTS.forEach((config) => {
    it(
      `${config.method} ${config.endpoint} - ${config.description}`,
      async () => {
        const times: number[] = []
        const fullEndpoint = config.endpoint + (config.query || '')
        
        const requestOptions: RequestInit = {
          method: config.method,
          ...(config.body ? { body: JSON.stringify(config.body) } : {}),
        }

        // Warmup runs (not counted)
        console.log(`\n🔥 Warming up ${config.endpoint}...`)
        for (let i = 0; i < WARMUP_RUNS; i++) {
          await measureEndpoint(fullEndpoint, config.method, requestOptions)
        }

        // Actual measurements
        console.log(`📊 Measuring ${config.endpoint} (${ITERATIONS} iterations)...`)
        for (let i = 0; i < ITERATIONS; i++) {
          const time = await measureEndpoint(fullEndpoint, config.method, requestOptions)
          times.push(time)
          
          // Progress indicator
          if ((i + 1) % 5 === 0) {
            process.stdout.write('.')
          }
        }
        console.log(' Done!')

        // Calculate statistics
        const stats = calculateStats(times)

        // Store results
        allResults.endpoints.push({
          endpoint: config.endpoint,
          method: config.method,
          description: config.description,
          target_p95: config.target_p95,
          stats,
        })

        // Log results
        console.log(`   Mean: ${stats.mean.toFixed(2)}ms`)
        console.log(`   P50:  ${stats.p50.toFixed(2)}ms`)
        console.log(`   P95:  ${stats.p95.toFixed(2)}ms (target: ${config.target_p95}ms)`)
        console.log(`   P99:  ${stats.p99.toFixed(2)}ms`)

        // Assert P95 within target (warning only, don't fail)
        if (stats.p95 > config.target_p95) {
          console.warn(
            `⚠️  Warning: P95 (${stats.p95.toFixed(2)}ms) exceeds target (${config.target_p95}ms)`
          )
        }

        // Don't fail tests, just collect data
        expect(times.length).toBe(ITERATIONS)
      },
      TEST_TIMEOUT
    )
  })

  // After all tests, save results
  it('should save baseline results to file', () => {
    if (allResults.endpoints.length > 0) {
      saveBaselineResults(allResults)
      printSummaryTable(allResults)
    }

    expect(allResults.endpoints.length).toBe(ENDPOINTS.length)
  })
})
