#!/usr/bin/env node
/**
 * Run migration 095 - Fix profiles RLS service_role policy
 * 
 * Usage: node scripts/run-migration-095.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.test
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.test') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.test');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🚀 Running migration 095: Fix profiles RLS service_role policy\n');

  // Read migration SQL
  const migrationPath = join(projectRoot, 'db', 'migrations', '095_fix_profiles_rls_service_role.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Remove comments and split into individual statements
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
    .join('\n')
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip comments and verification queries
    if (stmt.includes('Verification Query') || stmt.startsWith('COMMENT ON')) {
      continue;
    }

    console.log(`[${i + 1}/${statements.length}] Executing statement...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      
      if (error) {
        // Check if it's a "does not exist" error which is expected for DROP IF EXISTS
        if (error.message.includes('does not exist')) {
          console.log(`   ℹ️  ${error.message} (expected)`);
          successCount++;
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          errorCount++;
        }
      } else {
        console.log('   ✅ Success');
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${err.message}`);
      errorCount++;
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`📊 Migration Results:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (errorCount > 0) {
    console.error('⚠️  Some statements failed. Check errors above.');
    process.exit(1);
  } else {
    console.log('✨ Migration completed successfully!');
    
    // Verify the policy was created
    console.log('\n🔍 Verifying policy...');
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'profiles')
      .eq('policyname', 'Service role full access');
    
    if (error) {
      console.error('❌ Failed to verify policy:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Policy verified in pg_policies');
      console.log('   Policy details:');
      console.log(`   - Table: ${data[0].tablename}`);
      console.log(`   - Name: ${data[0].policyname}`);
      console.log(`   - Roles: ${data[0].roles}`);
      console.log(`   - Command: ${data[0].cmd}`);
    } else {
      console.warn('⚠️  Policy not found in pg_policies (may need manual verification)');
    }
  }
}

runMigration().catch((err) => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
