import { neon } from '@neondatabase/serverless';

// Used in API routes (pooled connection via PgBouncer)
export const sql = neon(process.env.DATABASE_URL!);

// Used in migration/seed scripts (direct connection, bypasses PgBouncer)
export const directSql = () =>
  neon(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);
