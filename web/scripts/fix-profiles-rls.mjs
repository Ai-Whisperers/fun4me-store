#!/usr/bin/env node
/**
 * Fix profiles RLS policy for service_role
 * 
 * This script manually executes the RLS policy fix using Supabase client.
 * Run: node scripts/fix-profiles-rls.mjs
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.test') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL in .env.test');
  process.exit(1);
}

async function fixProfilesRLS() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('📋 Checking current RLS policies on profiles table...');
    const checkPolicies = await client.query(`
      SELECT policyname, roles, cmd 
      FROM pg_policies 
      WHERE tablename = 'profiles' 
      ORDER BY policyname;
    `);
    
    console.log(`Found ${checkPolicies.rows.length} policies:`);
    checkPolicies.rows.forEach(row => {
      const roles = Array.isArray(row.roles) ? row.roles.join(', ') : row.roles;
      console.log(`  - ${row.policyname} (${row.cmd}) for roles: ${roles}`);
    });
    console.log('');

    // Drop and recreate service_role policy
    console.log('🔧 Dropping existing service_role policy...');
    await client.query(`
      DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
    `);
    console.log('✅ Dropped\n');

    console.log('🔨 Creating new service_role policy with explicit precedence...');
    await client.query(`
      CREATE POLICY "Service role full access" ON public.profiles
        FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    `);
    console.log('✅ Created\n');

    console.log('💬 Adding policy comment...');
    await client.query(`
      COMMENT ON POLICY "Service role full access" ON public.profiles IS 
      'Allows service_role to bypass all RLS restrictions. Required for test suite, admin operations, and background jobs.';
    `);
    console.log('✅ Comment added\n');

    // Verify RLS is enabled
    console.log('🔍 Verifying RLS is enabled...');
    const rlsCheck = await client.query(`
      SELECT relrowsecurity 
      FROM pg_class 
      WHERE relname = 'profiles';
    `);
    
    if (rlsCheck.rows[0]?.relrowsecurity) {
      console.log('✅ RLS is enabled on profiles table\n');
    } else {
      console.log('⚠️  RLS not enabled, enabling now...');
      await client.query(`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`);
      console.log('✅ RLS enabled\n');
    }

    // Verify the new policy
    console.log('🔍 Verifying new policy...');
    const verifyPolicy = await client.query(`
      SELECT 
        policyname,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies 
      WHERE tablename = 'profiles' 
      AND policyname = 'Service role full access';
    `);

    if (verifyPolicy.rows.length > 0) {
      const policy = verifyPolicy.rows[0];
      const roles = Array.isArray(policy.roles) ? policy.roles.join(', ') : policy.roles;
      console.log('✅ Policy verified:');
      console.log(`   Name: ${policy.policyname}`);
      console.log(`   Roles: ${roles}`);
      console.log(`   Command: ${policy.cmd}`);
      console.log(`   USING: ${policy.qual || 'true'}`);
      console.log(`   WITH CHECK: ${policy.with_check || 'true'}`);
    } else {
      console.error('❌ Policy not found after creation!');
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✨ RLS policy fix completed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixProfilesRLS();
