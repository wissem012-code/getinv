/**
 * Copy api/ directory to build/client/api/ for Vercel deployment
 * 
 * Vercel with outputDirectory only deploys files from that directory.
 * Since serverless functions need to be in the deployment, we copy
 * api/ to build/client/api/ so it's included.
 */

import { cpSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const apiSource = join(process.cwd(), 'api');
const apiDest = join(process.cwd(), 'build', 'client', 'api');

// Create build/client/api directory if it doesn't exist
if (!existsSync(join(process.cwd(), 'build', 'client'))) {
  mkdirSync(join(process.cwd(), 'build', 'client'), { recursive: true });
}

if (!existsSync(apiDest)) {
  mkdirSync(apiDest, { recursive: true });
}

// Copy api/ directory to build/client/api/
try {
  if (existsSync(apiSource)) {
    cpSync(apiSource, apiDest, { recursive: true, force: true });
    console.log('✅ Copied api/ directory to build/client/api/ for Vercel deployment');
  } else {
    console.warn('⚠️  api/ directory not found - skipping copy');
  }
} catch (error) {
  console.error('❌ Failed to copy api/ directory:', error.message);
  process.exit(1);
}
