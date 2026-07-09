const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Vercel Postgres injects POSTGRES_PRISMA_URL
if (process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}

const databaseUrl = process.env.DATABASE_URL || '';
const isPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (isPostgres) {
  console.log('--- VERCEL BUILD: POSTGRESQL DETECTED ---');
  // Replace provider = "sqlite" with provider = "postgresql"
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('Switched datasource provider to "postgresql".');
} else {
  console.log('--- LOCAL BUILD: SQLITE DETECTED ---');
}

console.log('Generating Prisma Client...');
execSync('npx prisma generate', { stdio: 'inherit' });

if (isPostgres) {
  console.log('Applying migrations / pushing schema to database...');
  // Use prisma db push to apply the schema to the remote database non-interactively
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  
  console.log('Running database seeding...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
}
