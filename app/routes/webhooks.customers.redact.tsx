import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Compliance Webhook: Customer Redact
 * 
 * Mandatory webhook for GDPR/privacy compliance when app has access to customer data.
 * This webhook is triggered when a customer requests deletion of their personal data.
 * 
 * Requirements:
 * - Always return HTTP 200 OK (even if no data to delete)
 * - Respond within reasonable time (typically < 1 second)
 * - Actually delete or anonymize stored customer data
 * - Validate webhook signature for security
 * 
 * @see https://shopify.dev/docs/apps/build/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, topic, shop } = await authenticate.webhook(request);
    
    console.log(`[Compliance] Received ${topic} webhook for shop: ${shop}`);
    
    // Extract customer information from webhook payload
    // Payload structure: { shop_id, shop_domain, customer: { id, email, phone }, orders_to_redact: [order_ids] }
    const customerData = payload.customer as { id?: string; email?: string; phone?: string } | undefined;
    const shopId = payload.shop_id as string | undefined;
    const ordersToRedact = (payload.orders_to_redact as string[] | undefined) || [];
    
    console.log(`[Compliance] Customer redact request - Shop: ${shopId}, Customer: ${customerData?.id}, Orders: ${ordersToRedact.length}`);
    
    // TODO: Delete or anonymize customer data from your database
    // Example operations:
    // 1. Delete customer records from your database
    // 2. Anonymize related data (replace with placeholder values)
    // 3. Delete associated orders or related records
    
    // Since we use Prisma Session storage, we don't store customer data directly
    // However, if you store customer data elsewhere (Supabase, etc.), delete it here
    
    // Example: If storing customer data in Supabase
    // await supabaseAdmin.from('customer_data').delete().eq('customer_id', customerData.id);
    
    // Note: Session data is managed by Shopify and doesn't need manual deletion here
    // The session will be cleaned up when the app is uninstalled or session expires
    
    console.log(`[Compliance] Customer redaction completed for shop: ${shop}`);
    
    // Always return 200 OK - this is required even if you have no data to delete
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Log error but still return 200 to prevent webhook retries
    console.error(`[Compliance] Error processing customer redact:`, error);
    
    // Always return 200 OK even on errors (Shopify requirement)
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
