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

if (process.env.NODE_ENV === 'production') {
  if (isPostgres) {
    // In production with PostgreSQL, pass datasourceUrl explicitly (prisma.config.ts is not loaded at runtime)
    prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
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
  };
  if (!globalWithPrisma.prisma) {
    if (isPostgres) {
      globalWithPrisma.prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
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
