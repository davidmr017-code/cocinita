import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});

export async function inicializarDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL (Postgres de Railway)');
  }
  // gen_random_uuid() viene en pgcrypto / PG 13+
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  const schema = readFileSync(join(__dirname, '..', 'schema.sql'), 'utf8');
  await pool.query(schema);
}
