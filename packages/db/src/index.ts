import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export * as schema from './schema.js';

let _db: ReturnType<typeof drizzle> | null = null;

export function db() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const client = postgres(url, { prepare: false });
  _db = drizzle(client);
  return _db;
}
