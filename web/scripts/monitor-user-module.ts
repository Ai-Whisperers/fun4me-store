/**
 * User Module Health Monitor
 * 
 * Checks health of user domain module in production
 * Run: node web/scripts/monitor-user-module.ts
 */

import { createClient } from '../lib/supabase/server';
import { createUserService } from '../lib/domain/users';

interface HealthCheck {
  name: string;
  success: boolean;
  duration_ms: number;
  error?: string;
  data_count?: number;
}

interface MonitorResults {
  timestamp: string;
  checks: HealthCheck[];
  status: 'healthy' | 'degraded' | 'down';
  total_duration_ms: number;
  summary: {
    total_checks: number;
    passed: number;
    failed: number;
    average_duration_ms: number;
  };
}

export async function monitorUserModule(tenantId: string = 'terrapet'): Promise<MonitorResults> {
  const startTime = Date.now();
  const results: MonitorResults = {
    timestamp: new Date().toISOString(),
    checks: [],
    status: 'healthy',
    total_duration_ms: 0,
    summary: {
      total_checks: 0,
      passed: 0,
      failed: 0,
      average_duration_ms: 0,
    },
  };

  try {
    const supabase = await createClient();
    const service = createUserService(supabase);

    // Check 1: Can list users
    const listStart = Date.now();
    try {
      const listResult = await service.list(tenantId);
      results.checks.push({
        name: 'list_users',
        success: listResult.success,
        duration_ms: Date.now() - listStart,
        error: listResult.error,
        data_count: listResult.data?.length,
      });
    } catch (error) {
      results.checks.push({
        name: 'list_users',
        success: false,
        duration_ms: Date.now() - listStart,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Check 2: Can get user stats
    const statsStart = Date.now();
    try {
      const statsResult = await service.listStaff(tenantId);
      results.checks.push({
        name: 'list_staff',
        success: statsResult.success,
        duration_ms: Date.now() - statsStart,
        error: statsResult.error,
        data_count: statsResult.data?.length,
      });
    } catch (error) {
      results.checks.push({
        name: 'list_staff',
        success: false,
        duration_ms: Date.now() - statsStart,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Check 3: Can query by role (owners)
    const roleQueryStart = Date.now();
    try {
      const roleResult = await service.listOwners(tenantId);
      results.checks.push({
        name: 'list_owners',
        success: roleResult.success,
        duration_ms: Date.now() - roleQueryStart,
        error: roleResult.error,
        data_count: roleResult.data?.length,
      });
    } catch (error) {
      results.checks.push({
        name: 'list_owners',
        success: false,
        duration_ms: Date.now() - roleQueryStart,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Check 4: Can query vets
    const vetsStart = Date.now();
    try {
      const vetsResult = await service.listVets(tenantId);
      results.checks.push({
        name: 'list_vets',
        success: vetsResult.success,
        duration_ms: Date.now() - vetsStart,
        error: vetsResult.error,
        data_count: vetsResult.data?.length,
      });
    } catch (error) {
      results.checks.push({
        name: 'list_vets',
        success: false,
        duration_ms: Date.now() - vetsStart,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Check 5: Can query admins
    const adminsStart = Date.now();
    try {
      const adminsResult = await service.listAdmins(tenantId);
      results.checks.push({
        name: 'list_admins',
        success: adminsResult.success,
        duration_ms: Date.now() - adminsStart,
        error: adminsResult.error,
        data_count: adminsResult.data?.length,
      });
    } catch (error) {
      results.checks.push({
        name: 'list_admins',
        success: false,
        duration_ms: Date.now() - adminsStart,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Calculate summary
    results.summary.total_checks = results.checks.length;
    results.summary.passed = results.checks.filter(c => c.success).length;
    results.summary.failed = results.checks.filter(c => !c.success).length;
    results.summary.average_duration_ms = 
      results.checks.reduce((sum, c) => sum + c.duration_ms, 0) / results.checks.length;

    // Determine overall status
    const failureRate = results.summary.failed / results.summary.total_checks;
    if (failureRate === 0) {
      results.status = 'healthy';
    } else if (failureRate >= 0.5) {
      results.status = 'down';
    } else {
      results.status = 'degraded';
    }

  } catch (error) {
    results.status = 'down';
    results.checks.push({
      name: 'module_initialization',
      success: false,
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  results.total_duration_ms = Date.now() - startTime;

  return results;
}

// CLI usage
if (require.main === module) {
  const tenantId = process.argv[2] || 'terrapet';
  
  console.log(`🔍 Running User Module Health Check for tenant: ${tenantId}\n`);
  
  monitorUserModule(tenantId)
    .then(results => {
      // Print results
      console.log('📊 User Module Health Check Results');
      console.log('=' .repeat(50));
      console.log(`Timestamp: ${results.timestamp}`);
      console.log(`Status: ${getStatusEmoji(results.status)} ${results.status.toUpperCase()}`);
      console.log(`Total Duration: ${results.total_duration_ms}ms\n`);

      console.log('Summary:');
      console.log(`  Total Checks: ${results.summary.total_checks}`);
      console.log(`  ✅ Passed: ${results.summary.passed}`);
      console.log(`  ❌ Failed: ${results.summary.failed}`);
      console.log(`  ⏱️  Average Duration: ${results.summary.average_duration_ms.toFixed(2)}ms\n`);

      console.log('Individual Checks:');
      results.checks.forEach(check => {
        const icon = check.success ? '✅' : '❌';
        console.log(`  ${icon} ${check.name.padEnd(20)} - ${check.duration_ms}ms`);
        if (check.data_count !== undefined) {
          console.log(`     └─ Data count: ${check.data_count}`);
        }
        if (check.error) {
          console.log(`     └─ Error: ${check.error}`);
        }
      });

      console.log('\n' + '='.repeat(50));
      
      // Exit with appropriate code
      process.exit(results.status === 'healthy' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Monitor execution failed:', error);
      console.error(error);
      process.exit(1);
    });
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'degraded': return '⚠️';
    case 'down': return '❌';
    default: return '❓';
  }
}

export default monitorUserModule;
