const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

let prisma;

// Resolve DATABASE_URL from various providers (Supabase, Vercel Postgres, etc.)
if (!process.env.DATABASE_URL) {
  const fallback =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.postgres_POSTGRES_URL_NON_POOLING ||
    process.env.postgres_POSTGRES_URL;
  if (fallback) process.env.DATABASE_URL = fallback;
}

const databaseUrl = process.env.DATABASE_URL || '';
const isPostgres = databaseUrl.startsWith('postgres') || databaseUrl.startsWith('postgresql');

function cleanDatabaseUrl(url) {
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

if (isPostgres) {
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const pool = new Pool({
    connectionString: cleanDatabaseUrl(databaseUrl),
    ssl: {
      rejectUnauthorized: false,
    },
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl || 'file:./dev.db',
  });
  prisma = new PrismaClient({ adapter });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Seeding database...');

  const usersCount = await prisma.user.count();
  if (usersCount === 0) {
    // Default passwords for initial configuration
    const ownerPassword = 'OwnerPassword123!';
    const associatePassword = 'AssociatePassword123!';

    const owner = await prisma.user.create({
      data: {
        name: 'Propriétaire',
        email: 'owner@cod.sn',
        passwordHash: hashPassword(ownerPassword),
        role: 'admin',
      },
    });

    const associate = await prisma.user.create({
      data: {
        name: 'Associé',
        email: 'associate@cod.sn',
        passwordHash: hashPassword(associatePassword),
        role: 'user',
      },
    });

    console.log('Database seeded successfully!');
    console.log('--------------------------------------------------');
    console.log('Comptes créés :');
    console.log(`- Propriétaire : owner@cod.sn / ${ownerPassword}`);
    console.log(`- Associé : associate@cod.sn / ${associatePassword}`);
    console.log('--------------------------------------------------');
  } else {
    console.log('Database already has users. Skipping seed.');
  }
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
