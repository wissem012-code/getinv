/**
 * One-time script to baseline existing Prisma migration
 * 
 * This fixes P3005 error when database already has tables but Prisma
 * doesn't have migration history recorded.
 * 
 * Usage:
 *   node scripts/baseline-migration.js
 * 
 * Or with DIRECT_URL:
 *   DIRECT_URL="postgresql://..." node scripts/baseline-migration.js
 */

import { execSync } from 'child_process';

const migrationName = '20240530213853_create_session_table';
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  console.error('❌ DIRECT_URL or DATABASE_URL not set');
  console.error('   Set DIRECT_URL to your direct connection (port 5432)');
  console.error('   Example: DIRECT_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"');
  process.exit(1);
}

// Check if DIRECT_URL is using correct connection type
if (directUrl.includes(':6543')) {
  console.warn('⚠️  WARNING: DIRECT_URL is using pooled connection (port 6543)');
  console.warn('   Migrations should use direct connection (port 5432)');
  console.warn('   This may work, but direct connection is recommended');
}

console.log('🔧 Baslining Prisma migration...');
console.log(`   Migration: ${migrationName}`);
console.log(`   Connection: ${directUrl.replace(/:[^:@]+@/, ':****@')}`); // Hide password
console.log('');

try {
  // Mark the migration as applied
  execSync(`npx prisma migrate resolve --applied ${migrationName}`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: directUrl, // Prisma uses DATABASE_URL for migrations
      DIRECT_URL: directUrl,   // Also set DIRECT_URL for consistency
    },
  });
  
  console.log('');
  console.log('✅ Migration baselined successfully!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Commit and push to GitHub');
  console.log('   2. Vercel will auto-redeploy');
  console.log('   3. Build should now succeed');
  console.log('   4. Future migrations will work correctly');
  
} catch (error) {
  console.error('');
  console.error('❌ Failed to baseline migration:', error.message);
  console.error('');
  console.error('💡 Troubleshooting:');
  console.error('   - Verify DIRECT_URL is correct (port 5432)');
  console.error('   - Check database connection (IPv4 add-on enabled?)');
  console.error('   - Ensure database is accessible from your network');
  console.error('');
  process.exit(1);
}
