/**
 * Copy api/ and build/server/ directories to build/client/ for Vercel deployment
 * 
 * Vercel with outputDirectory only deploys files from that directory.
 * Since serverless functions need to be in the deployment, we copy:
 * 1. api/ -> build/client/api/ (serverless functions)
 * 2. build/server/ -> build/client/server/ (React Router server build needed by functions)
 */

import { cpSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const apiSource = join(process.cwd(), 'api');
const apiDest = join(process.cwd(), 'build', 'client', 'api');

const serverSource = join(process.cwd(), 'build', 'server');
const serverDest = join(process.cwd(), 'build', 'client', 'server');

// Create build/client directory if it doesn't exist
const clientDir = join(process.cwd(), 'build', 'client');
if (!existsSync(clientDir)) {
  mkdirSync(clientDir, { recursive: true });
}

// Copy api/ directory to build/client/api/
try {
  if (existsSync(apiSource)) {
    if (!existsSync(apiDest)) {
      mkdirSync(apiDest, { recursive: true });
    }
    cpSync(apiSource, apiDest, { recursive: true, force: true });
    console.log('✅ Copied api/ directory to build/client/api/ for Vercel deployment');
  } else {
    console.warn('⚠️  api/ directory not found - skipping copy');
  }
} catch (error) {
  console.error('❌ Failed to copy api/ directory:', error.message);
  process.exit(1);
}

// Copy build/server/ directory to build/client/server/
try {
  if (existsSync(serverSource)) {
    if (!existsSync(serverDest)) {
      mkdirSync(serverDest, { recursive: true });
    }
    cpSync(serverSource, serverDest, { recursive: true, force: true });
    console.log('✅ Copied build/server/ directory to build/client/server/ for Vercel deployment');
  } else {
    console.warn('⚠️  build/server/ directory not found - skipping copy');
    console.warn('   Make sure "npm run build" completed successfully before running this script');
  }
} catch (error) {
  console.error('❌ Failed to copy build/server/ directory:', error.message);
  process.exit(1);
}
