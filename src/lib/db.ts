import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') || process.env.DATABASE_URL?.startsWith('postgresql');
  if (isPostgres) {
    // In production with PostgreSQL, use the standard pre-compiled Prisma engine
    prisma = new PrismaClient();
  } else {
    // Fallback to SQLite adapter
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
    const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') || process.env.DATABASE_URL?.startsWith('postgresql');
    if (isPostgres) {
      globalWithPrisma.prisma = new PrismaClient();
    } else {
      const adapter = new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL || 'file:./dev.db',
      });
      globalWithPrisma.prisma = new PrismaClient({ adapter });
    }
  }
  prisma = globalWithPrisma.prisma;
}

export { prisma };
