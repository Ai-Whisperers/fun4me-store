import { TenantSchema } from './lib/test-utils/schemas'
import { readFileSync } from 'fs'

const json = JSON.parse(readFileSync('db/seeds/data/00-core/tenants.json', 'utf-8'))
const tenants = json.tenants

console.log('Tenants count:', tenants.length)
console.log('First tenant keys:', Object.keys(tenants[0]))

// Test with minimal data first
const minimalTenant = { id: 'test', name: 'Test' }
console.log('\nMinimal tenant test:')
try {
  const result = TenantSchema.parse(minimalTenant)
  console.log('Minimal: OK', result)
} catch (e: unknown) {
  console.log('Minimal: Error', (e as Error).message)
  console.log('Stack:', (e as Error).stack)
}

// Test with actual data
console.log('\nActual tenant test:')
try {
  const result = TenantSchema.parse(tenants[0])
  console.log('Actual: OK', result.id)
} catch (e: unknown) {
  console.log('Actual: Error', (e as Error).message?.substring(0, 500))
  console.log('Stack:', (e as Error).stack?.substring(0, 1000))
}
