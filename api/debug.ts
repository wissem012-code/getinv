import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/debug
 * 
 * True Vercel API function that returns JSON directly (no React Router SSR).
 * Used for debugging environment configuration on Vercel.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const debug = {
    timestamp: new Date().toISOString(),
    message: "Debug endpoint working",
    runtime: "vercel-serverless",
    requestInfo: {
      method: req.method,
      url: req.url,
      host: req.headers.host,
    },
    env: {
      NODE_ENV: process.env.NODE_ENV || "not_set",
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
      hasShopifyApiKey: !!process.env.SHOPIFY_API_KEY,
      hasShopifyApiSecret: !!process.env.SHOPIFY_API_SECRET,
      hasShopifyAppUrl: !!process.env.SHOPIFY_APP_URL,
      shopifyAppUrl: process.env.SHOPIFY_APP_URL || "not_set",
      hasScopes: !!process.env.SCOPES,
      // Show DATABASE_URL format (hide password)
      databaseUrlPreview: process.env.DATABASE_URL 
        ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@').substring(0, 80) + "..."
        : "not_set",
    },
    nodeVersion: process.version,
  };

  return res.status(200).json(debug);
}
