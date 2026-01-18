/**
 * Copy build/server/ directory to build/client/server/ for Vercel deployment
 * 
 * Vercel with outputDirectory only deploys files from build/client/.
 * The api/index.js function needs access to build/server/index.js,
 * so we copy it to build/client/server/ so it's included in deployment.
 */

import { cpSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const serverSource = join(process.cwd(), 'build', 'server');
const serverDest = join(process.cwd(), 'build', 'client', 'server');

// Create build/client/server directory if it doesn't exist
const clientDir = join(process.cwd(), 'build', 'client');
if (!existsSync(clientDir)) {
  mkdirSync(clientDir, { recursive: true });
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
