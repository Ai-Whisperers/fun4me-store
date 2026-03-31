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

  console.log('Updating store_categories level constraint...');

  // Drop and recreate the constraint
  await client.query('ALTER TABLE store_categories DROP CONSTRAINT IF EXISTS store_categories_level_check');
  await client.query('ALTER TABLE store_categories ADD CONSTRAINT store_categories_level_check CHECK (level BETWEEN 1 AND 5)');

  console.log('✓ Constraint updated to allow levels 1-5');

  await client.end();
}

main().catch(console.error);
