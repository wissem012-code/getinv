/**
 * Prisma setup script that handles missing DATABASE_URL gracefully
 * Used during Vercel builds
 */

import { execSync } from 'child_process';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️  DATABASE_URL not set - using placeholder for Prisma Client generation');
  console.warn('   Make sure to set DATABASE_URL in Vercel environment variables!');
  // Use a placeholder URL just for schema validation during build
  // The actual connection will fail at runtime if DATABASE_URL is not set
  process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/dbname';
}

try {
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Only run migrations if DATABASE_URL is actually set (not placeholder)
  if (databaseUrl && databaseUrl !== 'postgresql://user:password@localhost:5432/dbname') {
    console.log('🔄 Running database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  } else {
    console.warn('⏭️  Skipping migrations - DATABASE_URL not configured');
    console.warn('   Set DATABASE_URL in Vercel to enable database migrations');
  }
} catch (error) {
  console.error('❌ Prisma setup failed:', error.message);
  process.exit(1);
}
