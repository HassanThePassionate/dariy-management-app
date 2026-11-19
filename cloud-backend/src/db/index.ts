import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Allows fetch cache and connection reuse in serverless environments
neonConfig.fetchConnectionCache = true;

const databaseUrl = process.env.DATABASE_URL || '';

export const isDbConfigured = Boolean(
  databaseUrl && !databaseUrl.includes('ep-sample-pooler') && databaseUrl.startsWith('postgres')
);

// Lazy/safe initialization: creates client if configured, returns mock-safe client otherwise
let dbInstance: any = null;

export function getDb() {
  if (!isDbConfigured) {
    return null;
  }
  if (!dbInstance) {
    const sql = neon(databaseUrl);
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

export { schema };
