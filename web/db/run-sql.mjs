#!/usr/bin/env node
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
function loadEnv() {
  const envPaths = [
    join(__dirname, '..', '.env.local'),
    join(__dirname, '..', '.env'),
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^([^#][^=]*)=(.*)$/);
        if (match && !process.env[match[1].trim()]) {
          let value = match[2].trim();
          value = value.replace(/^["']|["']$/g, '');
          process.env[match[1].trim()] = value;
        }
      }
    }
  }
}

async function main() {
  loadEnv();

  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node run-sql.mjs <sql-file>');
    process.exit(1);
  }

  const sqlPath = join(__dirname, sqlFile);
  if (!existsSync(sqlPath)) {
    console.error(`File not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = readFileSync(sqlPath, 'utf-8');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    await client.query(sql);
    console.log(`Executed: ${sqlFile}`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
