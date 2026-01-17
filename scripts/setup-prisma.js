/**
 * Prisma setup script that handles missing DATABASE_URL gracefully
 * Used during Vercel builds
 */

import { execSync } from 'child_process';

const databaseUrl = process.env.DATABASE_URL;
const isVercelBuild = process.env.VERCEL === '1';

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
  console.log('✅ Prisma Client generated successfully');
  
  // Only run migrations if DATABASE_URL is actually set (not placeholder)
  const isValidDbUrl = databaseUrl && databaseUrl !== 'postgresql://user:password@localhost:5432/dbname';
  
  if (isValidDbUrl) {
    console.log('🔄 Attempting database migrations...');
    try {
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        timeout: 30000, // 30 second timeout
      });
      console.log('✅ Database migrations completed successfully');
    } catch (migrationError) {
      // Migration failures during build are not critical - they can run at runtime
      console.warn('⚠️  Migration failed during build (this is often normal for serverless):');
      console.warn(`   ${migrationError.message}`);
      if (isVercelBuild) {
        console.warn('   📝 Migrations will run automatically on first app request');
        console.warn('   💡 If using port 5432, try connection pooling (port 6543) instead');
        console.warn('   🔗 Connection pooling URL format: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true');
      } else {
        console.warn('   ⚠️  Make sure your database is accessible and DATABASE_URL is correct');
      }
      // Don't exit on migration failure - the app can still work
      // Migrations can run on first request or manually
    }
  } else {
    console.warn('⏭️  Skipping migrations - DATABASE_URL not configured');
    console.warn('   Set DATABASE_URL in Vercel to enable database migrations');
  }
} catch (error) {
  // Only fail build on Prisma Client generation errors, not migration errors
  console.error('❌ Prisma Client generation failed:', error.message);
  process.exit(1);
}
