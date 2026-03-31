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

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const suppliers = await client.query('SELECT COUNT(*) as count FROM suppliers');
  const brands = await client.query('SELECT COUNT(*) as count FROM store_brands');
  const categories = await client.query('SELECT COUNT(*) as count FROM store_categories');
  const products = await client.query('SELECT COUNT(*) as count FROM store_products');

  console.log('Database counts:');
  console.log('- Suppliers:', suppliers.rows[0].count);
  console.log('- Brands:', brands.rows[0].count);
  console.log('- Categories:', categories.rows[0].count);
  console.log('- Products:', products.rows[0].count);

  // Show all brand names
  const brandNames = await client.query('SELECT name FROM store_brands ORDER BY name');
  console.log('\nAll brands in database:');
  brandNames.rows.forEach(r => console.log(' -', r.name));

  // Show all supplier names
  const supplierNames = await client.query('SELECT name FROM suppliers ORDER BY name');
  console.log('\nAll suppliers in database:');
  supplierNames.rows.forEach(r => console.log(' -', r.name));

  await client.end();
}

check().catch(console.error);
