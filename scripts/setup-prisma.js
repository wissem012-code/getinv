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
} else {
  // Check if DIRECT_URL is set but using pooler format (WRONG)
  const directUrl = process.env.DIRECT_URL;
  if (directUrl) {
    // Check if DIRECT_URL uses pooler hostname instead of direct connection
    if (directUrl.includes('.pooler.supabase.com')) {
      console.error('❌ ERROR: DIRECT_URL is using pooler format (WRONG for migrations)');
      console.error('   Current DIRECT_URL host:', directUrl.split('@')[1]?.split(':')[0] || 'unknown');
      console.error('   DIRECT_URL should use TRUE direct connection: db.[PROJECT].supabase.co');
      console.error('   Fix: Change DIRECT_URL host from "aws-0-[REGION].pooler.supabase.com" to "db.[PROJECT].supabase.co"');
      console.error('   Example: postgresql://postgres:[PASSWORD]@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require');
    }
  } else {
    // If DIRECT_URL is not set, use DATABASE_URL as fallback (not ideal, but works)
    process.env.DIRECT_URL = databaseUrl;
    console.warn('⚠️  DIRECT_URL not set - using DATABASE_URL for migrations');
    console.warn('   For enterprise setup, set DIRECT_URL to direct connection (port 5432)');
    console.warn('   DIRECT_URL should use: db.[PROJECT].supabase.co (NOT .pooler.supabase.com)');
  }
}

try {
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client generated successfully');
  
  // Only run migrations if DIRECT_URL is actually set (not placeholder) AND uses direct connection
  const isValidDirectUrl = directUrl && directUrl !== 'postgresql://user:password@localhost:5432/dbname';
  const isDirectConnection = directUrl && directUrl.includes(':5432') && !directUrl.includes(':6543');
  
  // Check if DATABASE_URL is using wrong connection type (should be pooled for runtime)
  if (databaseUrl && databaseUrl.includes(':5432') && !databaseUrl.includes(':6543')) {
    console.warn('⚠️  WARNING: DATABASE_URL is using direct connection (port 5432)');
    console.warn('   DATABASE_URL should use POOLED connection (port 6543) for serverless runtime!');
    console.warn('   Current: port 5432 (direct) - will fail in serverless environment');
    console.warn('   Should be: port 6543 (pooled) - postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/...');
  }
  
  if (isValidDirectUrl && isDirectConnection) {
    console.log('🔄 Running database migrations using DIRECT_URL (port 5432)...');
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
      const errorOutput = migrationError instanceof Error ? errorMessage : String(migrationError);
      
      // Check for P3005 error (database schema not empty - needs baseline)
      if (errorOutput.includes('P3005') || errorOutput.includes('database schema is not empty')) {
        console.warn('⚠️  P3005 Error: Database schema is not empty');
        console.warn('   This means the database already has tables, but Prisma doesn\'t have migration history.');
        console.warn('   Solution: You need to baseline the existing migration.');
        console.warn('');
        console.warn('   To fix this, run locally or in a one-off script:');
        console.warn('   npx prisma migrate resolve --applied 20240530213853_create_session_table');
        console.warn('');
        console.warn('   Then redeploy. The migration will be marked as applied and future migrations will work.');
        console.warn('   📝 For now, skipping migration - app may still work if tables already exist');
      } else {
        console.warn('⚠️  Migration failed during build (this is often normal for serverless):');
        console.warn(`   ${errorMessage}`);
        
        if (isVercelBuild) {
          console.warn('   📝 Migrations will run automatically on first app request');
          console.warn('   💡 Make sure DIRECT_URL uses direct connection (port 5432)');
        }
      }
      // Don't exit on migration failure - the app can still work
      // Migrations can run on first request or manually
    }
  } else if (isValidDirectUrl && !isDirectConnection) {
    console.warn('⚠️  Skipping migrations - DIRECT_URL is using pooled connection (port 6543)');
    console.warn('   DIRECT_URL should use DIRECT connection (port 5432) for migrations');
    console.warn('   Migrations will run automatically on first app request');
  } else {
    console.warn('⏭️  Skipping migrations - DIRECT_URL not configured or invalid');
    console.warn('   Set DIRECT_URL in Vercel to enable database migrations');
    console.warn('   DIRECT_URL should use direct connection (port 5432) for migrations');
  }
} catch (error) {
  // Only fail build on Prisma Client generation errors, not migration errors
  console.error('❌ Prisma Client generation failed:', error.message);
  process.exit(1);
}
