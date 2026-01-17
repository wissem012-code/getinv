import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { authenticate } from "../shopify.server";
import {
  validateShopDomain,
  validateIntent,
  validateIntervalMinutes,
  validateAdminId,
  sanitizeErrorMessage,
  type ValidIntent,
} from "../utils/validation.server";

// --------------------
// Small helper: JSON responses
// --------------------
function jsonResponse(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

// --------------------
// Env helpers
// --------------------
function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Server misconfigured: ${name} missing`);
  return v;
}

const SUPABASE_URL = () => mustEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = () => mustEnv("SUPABASE_SERVICE_ROLE_KEY");
const APP_JWT_SECRET = () => mustEnv("APP_JWT_SECRET");

// Optional override if you want, otherwise it uses SUPABASE_URL/functions/v1
const SUPABASE_FUNCTIONS_BASE = () =>
  process.env.SUPABASE_FUNCTIONS_BASE || `${SUPABASE_URL()}/functions/v1`;

// --------------------
// Supabase admin client (server-only)
// --------------------
function supabaseAdmin() {
  return createClient(SUPABASE_URL(), SUPABASE_SERVICE_ROLE_KEY(), {
    auth: { persistSession: false },
  });
}

// --------------------
// Error types for better diagnostics
// --------------------
export interface ConnectionError {
  type: "schema_not_exposed" | "permission_denied" | "table_not_found" | "network_error" | "unknown";
  message: string;
  details?: string;
  statusCode?: number;
}

// --------------------
// Find the GetInv tenant admin_id linked to this Shopify shop
// (reads app_private.shopify_shops)
// --------------------
async function getAdminIdForShop(shopDomain: unknown): Promise<{ adminId: string | null; error?: ConnectionError }> {
  let validatedShopDomain: string;
  
  try {
    validatedShopDomain = validateShopDomain(shopDomain);
  } catch (error) {
    return {
      adminId: null,
      error: {
        type: "unknown",
        message: error instanceof Error ? error.message : "Invalid shop domain",
      },
    };
  }

  const supabase = supabaseAdmin();

  try {
    const { data, error } = await supabase
      .schema("app_private")
      .from("shopify_shops")
      .select("admin_id")
      .eq("shop_domain", shopDomain)
      .maybeSingle();

    if (error) {
      // Log error details for debugging
      const errorMessage = error.message || "Unknown error";
      const errorCode = typeof (error as { code?: string }).code === "string" ? (error as { code: string }).code : "";
      const errorDetails = typeof (error as { details?: string }).details === "string" ? (error as { details: string }).details : "";

      console.error(`[getAdminIdForShop] Error querying shopify_shops:`, {
        shopDomain,
        errorMessage,
        errorCode,
        errorDetails,
        fullError: error,
      });

      // Determine error type based on error code/message
      let errorType: ConnectionError["type"] = "unknown";
      let statusCode: number | undefined;
      let message = errorMessage;

      // Check for common Supabase error patterns
      if (errorCode === "PGRST116" || errorMessage.includes("schema") || errorMessage.includes("does not exist")) {
        errorType = "schema_not_exposed";
        message = `Schema 'app_private' is not accessible. Add "app_private" to Supabase API -> Exposed schemas in your Supabase dashboard.`;
      } else if (errorCode === "PGRST301" || errorMessage.includes("permission") || errorMessage.includes("403")) {
        errorType = "permission_denied";
        statusCode = 403;
        message = `Permission denied accessing app_private.shopify_shops. Check that your SUPABASE_SERVICE_ROLE_KEY has proper permissions.`;
      } else if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
        errorType = "table_not_found";
        message = `Table 'app_private.shopify_shops' does not exist. Ensure the table is created in your Supabase database.`;
      } else if (errorMessage.includes("fetch") || errorMessage.includes("network") || errorMessage.includes("ECONNREFUSED")) {
        errorType = "network_error";
        message = `Network error connecting to Supabase: ${errorMessage}`;
      }

      return {
        adminId: null,
        error: {
          type: errorType,
          message,
          details: errorDetails || errorCode,
          statusCode,
        },
      };
    }

      // Log successful lookup (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(`[getAdminIdForShop] Lookup result:`, {
        shopDomain: validatedShopDomain,
        adminId: data?.admin_id || "not found",
      });
    }

    // Validate admin ID if found
    if (data?.admin_id) {
      try {
        const validatedAdminId = validateAdminId(data.admin_id);
        return { adminId: validatedAdminId };
      } catch (error) {
        console.error(`[getAdminIdForShop] Invalid admin ID format:`, error);
        return {
          adminId: null,
          error: {
            type: "unknown",
            message: "Invalid admin ID format returned from database",
          },
        };
      }
    }

    return { adminId: null };
  } catch (e) {
    // Catch any unexpected errors
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error(`[getAdminIdForShop] Unexpected error:`, {
      shopDomain,
      error: errorMessage,
      stack: e instanceof Error ? e.stack : undefined,
    });

    return {
      adminId: null,
      error: {
        type: "unknown",
        message: `Unexpected error: ${errorMessage}`,
        details: e instanceof Error ? e.stack : String(e),
      },
    };
  }
}

// --------------------
// Create a short-lived JWT that matches YOUR system:
// payload: { userId, role } signed HS256 with APP_JWT_SECRET
// --------------------
async function mintAppJwt(adminId: string): Promise<string> {
  const secret = new TextEncoder().encode(APP_JWT_SECRET());

  return await new SignJWT({ userId: adminId, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);
}

// --------------------
// Call your Supabase Edge Functions that already exist
// shopify-pull-products
// shopify-push-products
// shopify-auto-sync (cron only, not used here)
// --------------------
async function callEdgeFunction(fnName: string, jwt: string, body?: unknown) {
  const url = `${SUPABASE_FUNCTIONS_BASE()}/${fnName}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

// --------------------
// GET  /api/sync
// Returns connection + sync timestamps so your UI can show status
// --------------------
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    console.log(`[loader] Checking connection for shop: ${shopDomain}`);

    const { adminId, error: connectionError } = await getAdminIdForShop(shopDomain);

    // If there was a connection error (not just "not found"), return error details
    if (connectionError) {
      console.error(`[loader] Connection error:`, connectionError);
      return jsonResponse(
        {
          connected: false,
          shopDomain,
          error: connectionError.message,
          errorType: connectionError.type,
          errorDetails: connectionError.details,
          troubleshooting: {
            schema_not_exposed:
              "Go to Supabase Dashboard → API → Exposed schemas → Add 'app_private'",
            permission_denied:
              "Check that SUPABASE_SERVICE_ROLE_KEY has access to app_private schema",
            table_not_found:
              "Ensure app_private.shopify_shops table exists in your Supabase database",
            network_error: "Check SUPABASE_URL and network connectivity",
          },
        },
        { status: connectionError.statusCode || 500 }
      );
    }

    if (!adminId) {
      return jsonResponse({
        connected: false,
        shopDomain,
        reason:
          "This Shopify store is installed, but it is not linked to a GetInv tenant yet. Link it from your GetInv app first.",
      });
    }

    console.log(`[loader] Shop connected, adminId: ${adminId}`);

    const supabase = supabaseAdmin();
    const { data: settings, error } = await supabase
      .from("shopify_settings")
      .select(
        "auto_sync_enabled, auto_sync_interval_minutes, last_pull_at, last_push_at, created_at, updated_at"
      )
      .eq("admin_id", adminId)
      .maybeSingle();

    if (error) {
      console.error(`[loader] Error fetching settings:`, error);
      return jsonResponse(
        { connected: true, shopDomain, adminId, settings: null, error: error.message },
        { status: 200 }
      );
    }

    return jsonResponse({
      connected: true,
      shopDomain,
      adminId,
      settings: settings ?? null,
    });
  } catch (e) {
    const msg = sanitizeErrorMessage(e, process.env.NODE_ENV === "production");
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(`[loader] Unexpected error:`, { error: msg, stack });
    return jsonResponse({ error: msg, ...(process.env.NODE_ENV === "development" && { stack }) }, { status: 500 });
  }
}

// --------------------
// POST /api/sync
// Body:
//   { intent: "pull" }
//   { intent: "push_changed" }
//   { intent: "push_all" }
//   { intent: "toggle_auto", enabled: boolean, intervalMinutes?: number }
// --------------------
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    console.log(`[action] Processing request for shop: ${shopDomain}`);

    const { adminId, error: connectionError } = await getAdminIdForShop(shopDomain);

    // If there was a connection error, return it
    if (connectionError) {
      console.error(`[action] Connection error:`, connectionError);
      return jsonResponse(
        {
          ok: false,
          error: connectionError.message,
          errorType: connectionError.type,
          errorDetails: connectionError.details,
        },
        { status: connectionError.statusCode || 500 }
      );
    }

    if (!adminId) {
      return jsonResponse(
        {
          ok: false,
          error:
            "Shop not linked to GetInv tenant yet. Go to your GetInv app and connect this shop first.",
        },
        { status: 409 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON in request body" }, { status: 400 });
    }

    // Validate intent
    let intent: ValidIntent;
    try {
      intent = validateIntent(body.intent);
    } catch (error) {
      return jsonResponse(
        { ok: false, error: sanitizeErrorMessage(error) },
        { status: 400 }
      );
    }

    // Validate admin ID before using it
    let validatedAdminId: string;
    try {
      validatedAdminId = validateAdminId(adminId);
    } catch (error) {
      return jsonResponse(
        { ok: false, error: "Invalid admin ID format" },
        { status: 500 }
      );
    }

    console.log(`[action] Intent: ${intent}, adminId: ${validatedAdminId}`);

    // Create your custom JWT (server-side)
    const jwt = await mintAppJwt(validatedAdminId);

    if (intent === "pull") {
      console.log(`[action] Calling shopify-pull-products`);
      const r = await callEdgeFunction("shopify-pull-products", jwt, {});
      console.log(`[action] Pull result:`, { ok: r.ok, status: r.status });
      return jsonResponse(r.data, { status: r.status });
    }

    if (intent === "push_changed") {
      console.log(`[action] Calling shopify-push-products (changed)`);
      const r = await callEdgeFunction("shopify-push-products", jwt, { mode: "changed" });
      console.log(`[action] Push changed result:`, { ok: r.ok, status: r.status });
      return jsonResponse(r.data, { status: r.status });
    }

    if (intent === "push_all") {
      console.log(`[action] Calling shopify-push-products (all)`);
      const r = await callEdgeFunction("shopify-push-products", jwt, { mode: "all", force: true });
      console.log(`[action] Push all result:`, { ok: r.ok, status: r.status });
      return jsonResponse(r.data, { status: r.status });
    }

    if (intent === "toggle_auto") {
      const enabled = Boolean(body.enabled);
      
      let intervalMinutes: number;
      try {
        intervalMinutes = validateIntervalMinutes(body.intervalMinutes, 15);
      } catch (error) {
        return jsonResponse(
          { ok: false, error: sanitizeErrorMessage(error) },
          { status: 400 }
        );
      }

      console.log(`[action] Toggling auto-sync:`, { enabled, intervalMinutes });

      const supabase = supabaseAdmin();
      const { error } = await supabase
        .from("shopify_settings")
        .upsert(
          {
            admin_id: validatedAdminId,
            auto_sync_enabled: enabled,
            auto_sync_interval_minutes: intervalMinutes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "admin_id" }
        );

      if (error) {
        console.error(`[action] Error updating settings:`, error);
        return jsonResponse({ ok: false, error: error.message }, { status: 500 });
      }

      console.log(`[action] Auto-sync updated successfully`);
      return jsonResponse({
        ok: true,
        auto_sync_enabled: enabled,
        auto_sync_interval_minutes: intervalMinutes,
      });
    }

    console.warn(`[action] Unknown intent: ${intent}`);
    return jsonResponse({ ok: false, error: "Unknown intent" }, { status: 400 });
  } catch (e) {
    const msg = sanitizeErrorMessage(e, process.env.NODE_ENV === "production");
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(`[action] Unexpected error:`, { error: msg, stack });
    return jsonResponse(
      {
        ok: false,
        error: msg,
        ...(process.env.NODE_ENV === "development" && { stack }),
      },
      { status: 500 }
    );
  }
}

// --------------------
// Default component export
// This route only returns JSON from loader/action, so the component returns null
// --------------------
export default function SyncApi() {
  return null;
}
