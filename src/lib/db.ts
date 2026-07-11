import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

// Resolve DATABASE_URL from various providers (Supabase, Vercel Postgres, etc.)
if (!process.env.DATABASE_URL) {
  const fallback =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.postgres_POSTGRES_URL_NON_POOLING ||
    process.env.postgres_POSTGRES_URL;
  if (fallback) process.env.DATABASE_URL = fallback;
}

const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') || process.env.DATABASE_URL?.startsWith('postgresql');

function cleanDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('sslcert');
    parsed.searchParams.delete('sslkey');
    parsed.searchParams.delete('sslrootcert');
    return parsed.toString();
  } catch (err) {
    return url;
  }
}

if (process.env.NODE_ENV === 'production') {
  if (isPostgres) {
    // In production with PostgreSQL, use standard PrismaPg adapter
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({
      connectionString: cleanDatabaseUrl(process.env.DATABASE_URL),
      ssl: {
        rejectUnauthorized: false,
      },
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  } else {
    // Fallback to SQLite adapter
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    const adapter = new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL || 'file:./dev.db',
    });
    prisma = new PrismaClient({ adapter });
  }
} else {
  // In development, bind Prisma to global scope to prevent duplicate instances during hot-reload
  const globalWithPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
    pgPool?: any;
  };
  if (!globalWithPrisma.prisma) {
    if (isPostgres) {
      const { Pool } = require('pg');
      const { PrismaPg } = require('@prisma/adapter-pg');
      globalWithPrisma.pgPool = new Pool({
        connectionString: cleanDatabaseUrl(process.env.DATABASE_URL),
        ssl: {
          rejectUnauthorized: false,
        },
      });
      const adapter = new PrismaPg(globalWithPrisma.pgPool);
      globalWithPrisma.prisma = new PrismaClient({ adapter });
    } else {
      const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
      const adapter = new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL || 'file:./dev.db',
      });
      globalWithPrisma.prisma = new PrismaClient({ adapter });
    }
  }
  prisma = globalWithPrisma.prisma;
}

export { prisma };
