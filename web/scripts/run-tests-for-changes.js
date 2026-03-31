/**
 * Smart Test Runner
 *
 * Runs tests relevant to changed files based on path mapping.
 * Use in CI/CD to optimize test execution time.
 *
 * Usage: node scripts/run-tests-for-changes.js [baseBranch]
 */

const { execSync } = require('child_process')
const path = require('path')

// Map file paths to test commands
const PATH_TO_TESTS = [
  // Components and pages
  { pattern: /app\/\[clinic\]\/portal\/pets/, tests: ['test:feature:pets', 'test:portal'] },
  {
    pattern: /app\/\[clinic\]\/portal\/appointments/,
    tests: ['test:feature:booking', 'test:portal'],
  },
  { pattern: /app\/\[clinic\]\/portal\/medical/, tests: ['test:feature:medical', 'test:portal'] },
  { pattern: /app\/\[clinic\]\/store/, tests: ['test:feature:store', 'test:store'] },
  { pattern: /app\/\[clinic\]\/services/, tests: ['test:public'] },
  { pattern: /app\/\[clinic\]\/tools/, tests: ['test:tools'] },
  { pattern: /app\/\[clinic\]\/dashboard/, tests: ['test:dashboard'] },

  // API routes
  { pattern: /app\/api\/pets/, tests: ['test:api', 'test:feature:pets'] },
  { pattern: /app\/api\/booking/, tests: ['test:api', 'test:feature:booking'] },
  { pattern: /app\/api\/inventory/, tests: ['test:feature:inventory'] },
  { pattern: /app\/api\/finance/, tests: ['test:feature:finance'] },
  { pattern: /app\/api\/medical/, tests: ['test:feature:medical'] },
  { pattern: /app\/api\/prescriptions/, tests: ['test:feature:medical'] },
  { pattern: /app\/api\/products/, tests: ['test:feature:store'] },
  { pattern: /app\/api\/cart/, tests: ['test:feature:store'] },
  { pattern: /app\/api\//, tests: ['test:api'] },

  // Server actions
  { pattern: /app\/actions\/.*pet/, tests: ['test:feature:pets'] },
  { pattern: /app\/actions\/.*vaccine/, tests: ['test:feature:vaccines'] },
  { pattern: /app\/actions\/.*appointment/, tests: ['test:feature:booking'] },
  { pattern: /app\/actions\/.*medical/, tests: ['test:feature:medical'] },
  { pattern: /app\/actions\/.*prescription/, tests: ['test:feature:medical'] },
  { pattern: /app\/actions\/.*cart/, tests: ['test:feature:store'] },
  { pattern: /app\/actions\//, tests: ['test:integration'] },

  // Components
  { pattern: /components\/store/, tests: ['test:feature:store'] },
  { pattern: /components\/cart/, tests: ['test:feature:store'] },
  { pattern: /components\/medical/, tests: ['test:feature:medical'] },
  { pattern: /components\//, tests: ['test:unit'] },

  // Library/utilities
  { pattern: /lib\/supabase/, tests: ['test:integration', 'test:security'] },
  { pattern: /lib\/auth/, tests: ['test:security'] },
  { pattern: /lib\//, tests: ['test:unit'] },

  // Database
  { pattern: /db\//, tests: ['test:integration', 'test:system', 'test:security'] },

  // Test files themselves
  { pattern: /tests\/unit/, tests: ['test:unit'] },
  { pattern: /tests\/integration/, tests: ['test:integration'] },
  { pattern: /tests\/system/, tests: ['test:system'] },
  { pattern: /tests\/functionality/, tests: ['test:functionality'] },
  { pattern: /tests\/security/, tests: ['test:security'] },
  { pattern: /tests\/uat/, tests: ['test:uat'] },
  { pattern: /e2e\/store/, tests: ['test:store'] },
  { pattern: /e2e\//, tests: ['test:e2e'] },

  // Config changes - run all tests
  { pattern: /package\.json|vitest\.config|playwright\.config/, tests: ['test:smoke'] },

  // Security-sensitive files
  { pattern: /\.env|auth|middleware/, tests: ['test:security'] },
]

function getChangedFiles(baseBranch = 'main') {
  try {
    const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, {
      encoding: 'utf-8',
    })
    return output.trim().split('\n').filter(Boolean)
  } catch (error) {
    console.warn('Could not get changed files, running smoke tests')
    return []
  }
}

function getTestsForFiles(files) {
  const testsToRun = new Set()

  for (const file of files) {
    for (const mapping of PATH_TO_TESTS) {
      if (mapping.pattern.test(file)) {
        mapping.tests.forEach((test) => testsToRun.add(test))
      }
    }
  }

  // If no specific tests matched, run smoke tests
  if (testsToRun.size === 0) {
    testsToRun.add('test:smoke')
  }

  return Array.from(testsToRun)
}

function runTests(tests) {
  console.log('🧪 Running tests for changed files...')
  console.log(`   Tests to run: ${tests.join(', ')}`)
  console.log('')

  let failed = false

  for (const test of tests) {
    console.log(`\n📋 Running: npm run ${test}`)
    console.log('─'.repeat(50))

    try {
      execSync(`npm run ${test}`, { stdio: 'inherit' })
      console.log(`✅ ${test} passed`)
    } catch (error) {
      console.error(`❌ ${test} failed`)
      failed = true
    }
  }

  if (failed) {
    console.log('\n❌ Some tests failed')
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed')
  }
}

// Main
const baseBranch = process.argv[2] || 'main'
console.log(`📁 Checking changes against: ${baseBranch}`)

const changedFiles = getChangedFiles(baseBranch)
if (changedFiles.length === 0) {
  console.log('No changed files detected, running smoke tests')
  runTests(['test:smoke'])
} else {
  console.log(`Found ${changedFiles.length} changed files:`)
  changedFiles.forEach((f) => console.log(`  - ${f}`))
  console.log('')

  const tests = getTestsForFiles(changedFiles)
  runTests(tests)
}
