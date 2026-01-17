import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Compliance Webhook: Customer Data Request
 * 
 * Mandatory webhook for GDPR/privacy compliance when app has access to customer data.
 * This webhook is triggered when a customer requests to see what data your app has stored about them.
 * 
 * Requirements:
 * - Always return HTTP 200 OK (even if no data is stored)
 * - Respond within reasonable time (typically < 1 second)
 * - Validate webhook signature for security
 * 
 * @see https://shopify.dev/docs/apps/build/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, topic, shop } = await authenticate.webhook(request);
    
    console.log(`[Compliance] Received ${topic} webhook for shop: ${shop}`);
    
    // Extract customer information from webhook payload
    // Payload structure: { shop_id, shop_domain, orders_requested: [order_ids], customer: { id, email, phone } }
    const customerData = payload.customer as { id?: string; email?: string; phone?: string } | undefined;
    const shopId = payload.shop_id as string | undefined;
    const ordersRequested = (payload.orders_requested as string[] | undefined) || [];
    
    console.log(`[Compliance] Customer data request - Shop: ${shopId}, Customer: ${customerData?.id}, Orders: ${ordersRequested.length}`);
    
    // TODO: If your app stores customer data, retrieve and provide it here
    // Example:
    // - Query your database for customer records
    // - Return relevant data in a structured format
    // - For now, we return empty response (app stores no customer data)
    
    // Always return 200 OK - this is required even if you have no data to return
    // If you do store customer data, you should return it here (though Shopify doesn't require specific format)
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Log error but still return 200 to prevent webhook retries
    console.error(`[Compliance] Error processing customer data request:`, error);
    
    // Always return 200 OK even on errors (Shopify requirement)
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
