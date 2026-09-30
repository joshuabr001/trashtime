import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL é obrigatório');
}

const here = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(join(here, '../sql/001_tracking.sql'), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(sql);
  console.log('Estrutura de rastreamento pronta.');
} finally {
  await client.end();
}
