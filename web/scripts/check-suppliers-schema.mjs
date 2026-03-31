#!/usr/bin/env node
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#][^=]*)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      let value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[match[1].trim()] = value;
    }
  }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // Get suppliers table schema
  const schema = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'suppliers'
    ORDER BY ordinal_position
  `);

  console.log('=== SUPPLIERS TABLE SCHEMA ===\n');
  schema.rows.forEach(r => {
    const nullable = r.is_nullable === 'NO' ? 'NOT NULL' : 'nullable';
    const def = r.column_default ? ` DEFAULT ${r.column_default}` : '';
    console.log(`  ${r.column_name.padEnd(25)} ${r.data_type.padEnd(20)} ${nullable}${def}`);
  });

  // Get a sample supplier to see contact_info structure
  const sample = await client.query(`
    SELECT name, contact_info FROM suppliers LIMIT 3
  `);
  console.log('\n=== SAMPLE contact_info STRUCTURE ===\n');
  sample.rows.forEach(r => {
    console.log(`${r.name}:`);
    console.log(JSON.stringify(r.contact_info, null, 2));
    console.log('');
  });

  await client.end();
}

main().catch(console.error);
