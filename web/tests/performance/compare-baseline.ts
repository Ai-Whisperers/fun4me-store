/**
 * Performance Baseline Comparison Tool
 * 
 * Compares current performance against a saved baseline to detect regressions.
 * 
 * Usage:
 *   npm run test:performance:compare -- --baseline=baseline-2026-01-19.json
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

interface PerformanceStats {
  min: number
  max: number
  mean: number
  median: number
  p50: number
  p95: number
  p99: number
  stdDev: number
}

interface PerformanceMetric {
  endpoint: string
  method: string
  description: string
  stats: PerformanceStats
}

interface BaselineReport {
  timestamp: string
  environment: string
  measurements_per_endpoint: number
  warmup_runs: number
  endpoints: PerformanceMetric[]
  summary: {
    total_endpoints: number
    total_measurements: number
    average_response_time: number
  }
}

interface ComparisonResult {
  endpoint: string
  baseline: PerformanceStats
  current: PerformanceStats
  diff: {
    mean: number
    p95: number
    p99: number
  }
  regression: boolean
  improvement: boolean
}

const REGRESSION_THRESHOLD = 20 // % increase is a regression
const IMPROVEMENT_THRESHOLD = 10 // % decrease is an improvement

/**
 * Calculate percentage difference
 */
function percentDiff(baseline: number, current: number): number {
  return Math.round(((current - baseline) / baseline) * 100 * 100) / 100
}

/**
 * Load baseline report
 */
function loadBaseline(filename: string): BaselineReport {
  const resultsDir = join(process.cwd(), 'tests', 'performance', 'results')
  const filepath = join(resultsDir, filename)

  if (!existsSync(filepath)) {
    console.error(`❌ Baseline file not found: ${filepath}`)
    console.error('\nAvailable baselines:')
    
    if (existsSync(resultsDir)) {
      const files = readdirSync(resultsDir).filter(f => f.startsWith('baseline-'))
      files.forEach(f => console.error(`  • ${f}`))
    } else {
      console.error('  (No baselines found)')
    }
    
    process.exit(1)
  }

  const content = readFileSync(filepath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Load latest baseline (most recent by filename)
 */
function loadLatestBaseline(): BaselineReport {
  const resultsDir = join(process.cwd(), 'tests', 'performance', 'results')
  
  if (!existsSync(resultsDir)) {
    console.error('❌ No results directory found. Run baseline test first.')
    process.exit(1)
  }

  const files = readdirSync(resultsDir)
    .filter(f => f.startsWith('baseline-') && f.endsWith('.json'))
    .sort()
    .reverse()

  if (files.length === 0) {
    console.error('❌ No baseline files found. Run baseline test first.')
    process.exit(1)
  }

  console.log(`📊 Using latest baseline: ${files[0]}`)
  return loadBaseline(files[0])
}

/**
 * Compare two baselines
 */
function compareBaselines(baseline: BaselineReport, current: BaselineReport): ComparisonResult[] {
  const results: ComparisonResult[] = []

  baseline.endpoints.forEach(baselineMetric => {
    const currentMetric = current.endpoints.find(
      m => m.endpoint === baselineMetric.endpoint && m.method === baselineMetric.method
    )

    if (!currentMetric) {
      console.warn(`⚠️  Endpoint not found in current: ${baselineMetric.endpoint}`)
      return
    }

    const meanDiff = percentDiff(baselineMetric.stats.mean, currentMetric.stats.mean)
    const p95Diff = percentDiff(baselineMetric.stats.p95, currentMetric.stats.p95)
    const p99Diff = percentDiff(baselineMetric.stats.p99, currentMetric.stats.p99)

    const regression = p95Diff > REGRESSION_THRESHOLD
    const improvement = p95Diff < -IMPROVEMENT_THRESHOLD

    results.push({
      endpoint: baselineMetric.endpoint,
      baseline: baselineMetric.stats,
      current: currentMetric.stats,
      diff: {
        mean: meanDiff,
        p95: p95Diff,
        p99: p99Diff,
      },
      regression,
      improvement,
    })
  })

  return results
}

/**
 * Print comparison report
 */
function printReport(
  baseline: BaselineReport,
  current: BaselineReport,
  results: ComparisonResult[]
) {
  console.log('\n📊 Performance Comparison Report\n')
  console.log(`Baseline: ${baseline.timestamp}`)
  console.log(`Current:  ${current.timestamp}`)
  console.log(`Threshold: ±${REGRESSION_THRESHOLD}% (p95)\n`)

  // Summary
  const regressions = results.filter(r => r.regression)
  const improvements = results.filter(r => r.improvement)
  const stable = results.filter(r => !r.regression && !r.improvement)

  console.log('Summary:')
  console.log(`  🔴 Regressions:  ${regressions.length}`)
  console.log(`  🟢 Improvements: ${improvements.length}`)
  console.log(`  ⚪ Stable:       ${stable.length}\n`)

  // Regressions (detailed)
  if (regressions.length > 0) {
    console.log('🔴 REGRESSIONS DETECTED:\n')
    regressions.forEach(r => {
      console.log(`  ${r.endpoint}`)
      console.log(`    Mean: ${r.baseline.mean}ms → ${r.current.mean}ms (${r.diff.mean > 0 ? '+' : ''}${r.diff.mean}%)`)
      console.log(`    P95:  ${r.baseline.p95}ms → ${r.current.p95}ms (${r.diff.p95 > 0 ? '+' : ''}${r.diff.p95}%)`)
      console.log(`    P99:  ${r.baseline.p99}ms → ${r.current.p99}ms (${r.diff.p99 > 0 ? '+' : ''}${r.diff.p99}%)\n`)
    })
  }

  // Improvements
  if (improvements.length > 0) {
    console.log('🟢 IMPROVEMENTS DETECTED:\n')
    improvements.forEach(r => {
      console.log(`  ${r.endpoint}`)
      console.log(`    Mean: ${r.baseline.mean}ms → ${r.current.mean}ms (${r.diff.mean}%)`)
      console.log(`    P95:  ${r.baseline.p95}ms → ${r.current.p95}ms (${r.diff.p95}%)`)
      console.log(`    P99:  ${r.baseline.p99}ms → ${r.current.p99}ms (${r.diff.p99}%)\n`)
    })
  }

  // Stable endpoints (brief)
  if (stable.length > 0) {
    console.log('⚪ STABLE ENDPOINTS:\n')
    stable.forEach(r => {
      console.log(`  ${r.endpoint} (p95: ${r.diff.p95 > 0 ? '+' : ''}${r.diff.p95}%)`)
    })
    console.log('')
  }

  // Detailed comparison table
  console.log('Detailed Comparison:\n')
  console.log('┌─────────────────────────────────────────────┬────────┬────────┬────────┬────────┬────────┐')
  console.log('│ Endpoint                                    │ Metric │ Base   │ Curr   │ Diff   │ Status │')
  console.log('├─────────────────────────────────────────────┼────────┼────────┼────────┼────────┼────────┤')

  results.forEach(r => {
    const endpoint = r.endpoint.padEnd(43)
    const metrics = ['Mean', 'P95', 'P99']
    const baseValues = [r.baseline.mean, r.baseline.p95, r.baseline.p99]
    const currValues = [r.current.mean, r.current.p95, r.current.p99]
    const diffs = [r.diff.mean, r.diff.p95, r.diff.p99]

    metrics.forEach((metric, idx) => {
      const metricStr = metric.padEnd(6)
      const baseStr = String(baseValues[idx]).padStart(6)
      const currStr = String(currValues[idx]).padStart(6)
      const diffStr = `${diffs[idx] > 0 ? '+' : ''}${diffs[idx]}%`.padStart(6)
      
      let status = '  -   '
      if (idx === 1) { // P95 determines status
        if (r.regression) status = '  🔴  '
        else if (r.improvement) status = '  🟢  '
        else status = '  ⚪  '
      }

      if (idx === 0) {
        console.log(`│ ${endpoint} │ ${metricStr} │ ${baseStr} │ ${currStr} │ ${diffStr} │ ${status} │`)
      } else {
        console.log(`│ ${''.padEnd(43)} │ ${metricStr} │ ${baseStr} │ ${currStr} │ ${diffStr} │ ${status} │`)
      }
    })

    console.log('├─────────────────────────────────────────────┼────────┼────────┼────────┼────────┼────────┤')
  })

  console.log('└─────────────────────────────────────────────┴────────┴────────┴────────┴────────┴────────┘')
  console.log('(All times in milliseconds)\n')

  // Exit code
  if (regressions.length > 0) {
    console.log('❌ Performance regressions detected!')
    process.exit(1)
  } else if (improvements.length > 0) {
    console.log('✅ Performance improved!')
    process.exit(0)
  } else {
    console.log('✅ Performance stable (no significant changes)')
    process.exit(0)
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2)
  const baselineArg = args.find(arg => arg.startsWith('--baseline='))
  const currentArg = args.find(arg => arg.startsWith('--current='))

  let baseline: BaselineReport
  let current: BaselineReport

  // Load baseline
  if (baselineArg) {
    const filename = baselineArg.split('=')[1]
    baseline = loadBaseline(filename)
  } else {
    console.log('⚠️  No --baseline specified, using latest baseline\n')
    baseline = loadLatestBaseline()
  }

  // Load current
  if (currentArg) {
    const filename = currentArg.split('=')[1]
    current = loadBaseline(filename)
  } else {
    // Find most recent baseline that's not the baseline we're comparing against
    const resultsDir = join(process.cwd(), 'tests', 'performance', 'results')
    const files = readdirSync(resultsDir)
      .filter(f => f.startsWith('baseline-') && f.endsWith('.json'))
      .sort()
      .reverse()
      .filter(f => {
        const filepath = join(resultsDir, f)
        const content = JSON.parse(readFileSync(filepath, 'utf-8'))
        return content.timestamp !== baseline.timestamp
      })

    if (files.length === 0) {
      console.error('❌ No current baseline found for comparison')
      console.error('Run the baseline test again to generate a new measurement')
      process.exit(1)
    }

    console.log(`📊 Using current baseline: ${files[0]}\n`)
    current = loadBaseline(files[0])
  }

  // Compare
  const results = compareBaselines(baseline, current)

  // Report
  printReport(baseline, current, results)
}

// Run
main()
