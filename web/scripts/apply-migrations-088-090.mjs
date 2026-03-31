#!/usr/bin/env node
/**
 * Migration Runner for 088-090
 * 
 * Applies atomic operation migrations to eliminate race conditions:
 * - 088: Atomic appointment booking
 * - 089: Atomic appointment reschedule
 * - 090: Atomic cart merge
 * 
 * Usage:
 *   node scripts/apply-migrations-088-090.mjs
 * 
 * Environment:
 *   Requires DATABASE_URL in environment or .env.local
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));

async function applyMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('   Make sure .env.local exists with DATABASE_URL');
    process.exit(1);
  }

  console.log('🔍 Database URL found (hidden for security)');
  console.log(`   Host: ${new URL(databaseUrl).hostname}`);
  console.log('');

  // Import postgres dynamically
  let postgres;
  try {
    const pg = await import('postgres');
    postgres = pg.default;
  } catch (error) {
    console.error('❌ postgres package not installed');
    console.error('   Run: npm install postgres');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  const migrations = [
    { file: '088_atomic_appointment_booking.sql', name: 'Atomic Appointment Booking' },
    { file: '089_atomic_appointment_reschedule.sql', name: 'Atomic Appointment Reschedule' },
    { file: '090_atomic_cart_merge.sql', name: 'Atomic Cart Merge' },
  ];

  console.log('📋 Migrations to apply:');
  migrations.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.name} (${m.file})`);
  });
  console.log('');

  try {
    for (const migration of migrations) {
      console.log(`⏳ Applying ${migration.name}...`);
      
      const migrationPath = join(__dirname, '../db/migrations', migration.file);
      
      let migrationSql;
      try {
        migrationSql = await readFile(migrationPath, 'utf-8');
      } catch (error) {
        console.error(`❌ Failed to read ${migration.file}`);
        console.error(`   Path: ${migrationPath}`);
        throw error;
      }
      
      // Execute migration
      try {
        await sql.unsafe(migrationSql);
        console.log(`✅ ${migration.name} applied successfully`);
      } catch (error) {
        // Check if function already exists (not an error)
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${migration.name} already applied (function exists)`);
        } else {
          throw error;
        }
      }
      console.log('');
    }

    console.log('🎉 All migrations applied successfully!');
    console.log('');
    
    // Verify functions exist
    console.log('🔍 Verifying functions...');
    const functions = await sql`
      SELECT proname, pg_get_function_arguments(oid) as args
      FROM pg_proc
      WHERE proname IN (
        'book_appointment_atomic',
        'reschedule_appointment_atomic',
        'merge_cart_atomic'
      )
      ORDER BY proname
    `;

    if (functions.length === 3) {
      console.log('✅ All 3 atomic functions verified:');
      functions.forEach(fn => {
        console.log(`   - ${fn.proname}(${fn.args})`);
      });
    } else {
      console.warn(`⚠️  Only ${functions.length}/3 functions found`);
      console.warn('   Expected: book_appointment_atomic, reschedule_appointment_atomic, merge_cart_atomic');
    }

    console.log('');
    console.log('📚 Next steps:');
    console.log('   1. Run load tests: npm run test:load:appointments');
    console.log('   2. Manual testing via UI (book/reschedule appointments, cart merge)');
    console.log('   3. Monitor application logs for errors');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed!');
    console.error('');
    console.error('Error details:');
    console.error('  Message:', error.message);
    if (error.code) {
      console.error('  Code:', error.code);
    }
    if (error.hint) {
      console.error('  Hint:', error.hint);
    }
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Check DATABASE_URL is correct in .env.local');
    console.error('  2. Verify database is accessible');
    console.error('  3. Check migration files exist in db/migrations/');
    console.error('  4. Review error message above for specific issue');
    
    throw error;
  } finally {
    await sql.end();
  }
}

// Run migrations
applyMigrations().catch((err) => {
  console.error('');
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
