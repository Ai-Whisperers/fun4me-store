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

  // Get schema
  const schema = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'store_categories'
    ORDER BY ordinal_position
  `);

  console.log('=== STORE_CATEGORIES SCHEMA ===\n');
  schema.rows.forEach(r => {
    const nullable = r.is_nullable === 'NO' ? 'NOT NULL' : 'nullable';
    const def = r.column_default ? ` DEFAULT ${r.column_default}` : '';
    console.log(`  ${r.column_name.padEnd(20)} ${r.data_type.padEnd(25)} ${nullable}${def}`);
  });

  // Get all categories with hierarchy
  const cats = await client.query(`
    SELECT c.id, c.name, c.slug, c.description, c.parent_id, c.level, c.display_order, c.is_active,
           p.slug as parent_slug
    FROM store_categories c
    LEFT JOIN store_categories p ON c.parent_id = p.id
    ORDER BY c.level, c.display_order, c.name
  `);

  console.log(`\n=== CURRENT CATEGORIES (${cats.rows.length} total) ===\n`);
  console.log('Lvl | Slug                           | Parent Slug                    | Name');
  console.log('----|--------------------------------|--------------------------------|---------------------------');
  cats.rows.forEach(c => {
    const indent = '  '.repeat(c.level - 1);
    console.log(` ${c.level}  | ${c.slug.padEnd(30)} | ${(c.parent_slug || '-').padEnd(30)} | ${indent}${c.name}`);
  });

  // Count by level
  const counts = await client.query(`
    SELECT level, COUNT(*) as count
    FROM store_categories
    GROUP BY level
    ORDER BY level
  `);
  console.log('\n=== COUNTS BY LEVEL ===');
  counts.rows.forEach(r => console.log(`  Level ${r.level}: ${r.count} categories`));

  await client.end();
}

main().catch(console.error);
