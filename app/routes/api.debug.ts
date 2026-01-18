import type { LoaderFunctionArgs } from "react-router";

/**
 * GET /api/debug
 * Super simple debug endpoint - no dependencies
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  const debug = {
    timestamp: new Date().toISOString(),
    message: "Debug endpoint working",
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
  };

  return new Response(JSON.stringify(debug, null, 2), {
    status: 200,
    headers,
  });
}

export default function Debug() {
  return null;
}
