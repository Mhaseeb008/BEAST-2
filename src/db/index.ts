import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const databaseUrl =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.POSTGRES_URL;

    let poolConfig: PoolConfig;

    if (databaseUrl) {
      const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
      poolConfig = {
        connectionString: databaseUrl,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      };
    } else {
      const host = process.env.SQL_HOST || process.env.PGHOST;
      const isUnixSocket = host ? host.startsWith('/') : false;
      const isRemoteHost = !isUnixSocket && !!host && !host.includes('localhost') && !host.includes('127.0.0.1');
      const requireSsl =
        process.env.SQL_SSL === 'true' ||
        process.env.PGSSLMODE === 'require' ||
        isRemoteHost;

      poolConfig = {
        host: host,
        port: process.env.SQL_PORT
          ? parseInt(process.env.SQL_PORT, 10)
          : process.env.PGPORT
          ? parseInt(process.env.PGPORT, 10)
          : 5432,
        user: process.env.SQL_USER || process.env.PGUSER,
        password: process.env.SQL_PASSWORD || process.env.PGPASSWORD,
        database: process.env.SQL_DB_NAME || process.env.PGDATABASE,
        ssl: isUnixSocket ? false : (requireSsl ? { rejectUnauthorized: false } : false),
        max: 10,
        connectionTimeoutMillis: 15000,
      };
    }

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

export const db = drizzle(pool, { schema });

