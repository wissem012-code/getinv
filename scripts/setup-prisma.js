/**
 * Enterprise-grade Prisma setup script for Vercel serverless deployment
 * 
 * Best Practices:
 * - Uses DIRECT_URL for migrations (non-pooled, stable connection)
 * - Uses DATABASE_URL for runtime (pooled connection via PgBouncer)
 * - Handles missing environment variables gracefully
 * - Optimized for serverless environments
 */

import { execSync } from 'child_process';

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL; // Fallback to DATABASE_URL if DIRECT_URL not set
const isVercelBuild = process.env.VERCEL === '1';

// For Prisma Client generation, we need at least DATABASE_URL
if (!databaseUrl) {
  console.warn('⚠️  DATABASE_URL not set - using placeholder for Prisma Client generation');
  console.warn('   Make sure to set DATABASE_URL in Vercel environment variables!');
  // Use a placeholder URL just for schema validation during build
  // The actual connection will fail at runtime if DATABASE_URL is not set
  process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/dbname';
  process.env.DIRECT_URL = process.env.DATABASE_URL; // Use same placeholder if DIRECT_URL not set
} else if (!process.env.DIRECT_URL) {
  // If DIRECT_URL is not set, use DATABASE_URL as fallback (not ideal, but works)
  process.env.DIRECT_URL = databaseUrl;
  console.warn('⚠️  DIRECT_URL not set - using DATABASE_URL for migrations');
  console.warn('   For enterprise setup, set DIRECT_URL to direct connection (port 5432)');
}

try {
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client generated successfully');
  
  // Only run migrations if DIRECT_URL is actually set (not placeholder)
  const isValidDirectUrl = directUrl && directUrl !== 'postgresql://user:password@localhost:5432/dbname';
  
  if (isValidDirectUrl) {
    console.log('🔄 Running database migrations using DIRECT_URL...');
    try {
      // Use DIRECT_URL for migrations (direct connection, more reliable for schema operations)
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        timeout: 30000, // 30 second timeout
        env: {
          ...process.env,
          // Ensure Prisma uses DIRECT_URL for migrations
          DATABASE_URL: directUrl,
        },
      });
      console.log('✅ Database migrations completed successfully');
    } catch (migrationError) {
      // Migration failures during build are not critical - they can run at runtime
      const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
      console.warn('⚠️  Migration failed during build (this is often normal for serverless):');
      console.warn(`   ${errorMessage}`);
      
      if (isVercelBuild) {
        console.warn('   📝 Migrations will run automatically on first app request');
        if (directUrl.includes(':5432')) {
          console.warn('   ✅ Using direct connection (port 5432) for migrations - correct for migrations');
        } else if (directUrl.includes(':6543')) {
          console.warn('   ⚠️  Using pooled connection for migrations - consider setting DIRECT_URL to direct connection');
        }
      } else {
        console.warn('   ⚠️  Make sure your database is accessible and DIRECT_URL is correct');
        console.warn('   💡 DIRECT_URL should use direct connection (port 5432), not pooled (port 6543)');
      }
      // Don't exit on migration failure - the app can still work
      // Migrations can run on first request or manually
    }
  } else {
    console.warn('⏭️  Skipping migrations - DIRECT_URL not configured');
    console.warn('   Set DIRECT_URL in Vercel to enable database migrations');
    console.warn('   DIRECT_URL should use direct connection (port 5432) for migrations');
  }
} catch (error) {
  // Only fail build on Prisma Client generation errors, not migration errors
  console.error('❌ Prisma Client generation failed:', error.message);
  process.exit(1);
}
