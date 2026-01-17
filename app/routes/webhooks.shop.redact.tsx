import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Compliance Webhook: Shop Redact
 * 
 * Mandatory webhook for GDPR/privacy compliance when app has access to shop data.
 * This webhook is triggered when a shop requests deletion of their data (e.g., shop closure, GDPR request).
 * 
 * Requirements:
 * - Always return HTTP 200 OK (even if no data to delete)
 * - Respond within reasonable time (typically < 1 second)
 * - Actually delete or anonymize stored shop data
 * - Validate webhook signature for security
 * 
 * @see https://shopify.dev/docs/apps/build/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, topic, shop } = await authenticate.webhook(request);
    
    console.log(`[Compliance] Received ${topic} webhook for shop: ${shop}`);
    
    // Extract shop information from webhook payload
    // Payload structure: { shop_id, shop_domain }
    const shopId = payload.shop_id as string | undefined;
    const shopDomain = payload.shop_domain as string | undefined || shop;
    
    console.log(`[Compliance] Shop redact request - Shop ID: ${shopId}, Domain: ${shopDomain}`);
    
    // Delete all shop-related data from your database
    // This includes:
    // 1. Session data (already handled by app.uninstalled webhook, but safe to do here too)
    // 2. Shop configuration/settings
    // 3. Any cached data or analytics related to this shop
    
    try {
      // Delete all sessions for this shop
      if (shopDomain) {
        await db.session.deleteMany({ where: { shop: shopDomain } });
        console.log(`[Compliance] Deleted sessions for shop: ${shopDomain}`);
      }
      
      // TODO: Delete other shop-related data if stored elsewhere
      // Example: If storing shop data in Supabase
      // await supabaseAdmin.from('shop_settings').delete().eq('shop_id', shopId);
      // await supabaseAdmin.from('shop_analytics').delete().eq('shop_id', shopId);
      
      console.log(`[Compliance] Shop redaction completed for: ${shopDomain}`);
    } catch (deleteError) {
      // Log deletion errors but continue - we still need to return 200
      console.error(`[Compliance] Error during shop data deletion:`, deleteError);
    }
    
    // Always return 200 OK - this is required even if deletion fails
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Log error but still return 200 to prevent webhook retries
    console.error(`[Compliance] Error processing shop redact:`, error);
    
    // Always return 200 OK even on errors (Shopify requirement)
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
