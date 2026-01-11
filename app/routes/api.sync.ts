import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { authenticate } from "../shopify.server";

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
// Find the GetInv tenant admin_id linked to this Shopify shop
// (reads app_private.shopify_shops)
// --------------------
async function getAdminIdForShop(shopDomain: string): Promise<string | null> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .schema("app_private")
    .from("shopify_shops")
    .select("admin_id")
    .eq("shop_domain", shopDomain)
    .maybeSingle();

  if (error) {
    // Most common cause: app_private not in "Exposed schemas"
    throw new Error(
      `Failed to read app_private.shopify_shops. If you see 404/permission issues, add "app_private" to Supabase API -> Exposed schemas. Details: ${error.message}`
    );
  }

  return data?.admin_id ?? null;
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
  let data: any = null;
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

    const adminId = await getAdminIdForShop(shopDomain);

    if (!adminId) {
      return jsonResponse({
        connected: false,
        shopDomain,
        reason:
          "This Shopify store is installed, but it is not linked to a GetInv tenant yet. Link it from your GetInv app first.",
      });
    }

    const supabase = supabaseAdmin();
    const { data: settings, error } = await supabase
      .from("shopify_settings")
      .select(
        "auto_sync_enabled, auto_sync_interval_minutes, last_pull_at, last_push_at, created_at, updated_at"
      )
      .eq("admin_id", adminId)
      .maybeSingle();

    if (error) {
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
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ error: msg }, { status: 500 });
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

    const adminId = await getAdminIdForShop(shopDomain);
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

    const body = await request.json().catch(() => ({} as any));
    const intent = String((body as any)?.intent || "");

    // Create your custom JWT (server-side)
    const jwt = await mintAppJwt(adminId);

    if (intent === "pull") {
      const r = await callEdgeFunction("shopify-pull-products", jwt, {});
      return jsonResponse(r.data, { status: r.status });
    }

    if (intent === "push_changed") {
      const r = await callEdgeFunction("shopify-push-products", jwt, { mode: "changed" });
      return jsonResponse(r.data, { status: r.status });
    }

    if (intent === "push_all") {
      const r = await callEdgeFunction("shopify-push-products", jwt, { mode: "all", force: true });
      return jsonResponse(r.data, { status: r.status });
    }

    if (intent === "toggle_auto") {
      const enabled = Boolean((body as any)?.enabled);
      const intervalMinutes =
        typeof (body as any)?.intervalMinutes === "number"
          ? (body as any).intervalMinutes
          : 15;

      const supabase = supabaseAdmin();
      const { error } = await supabase
        .from("shopify_settings")
        .upsert(
          {
            admin_id: adminId,
            auto_sync_enabled: enabled,
            auto_sync_interval_minutes: intervalMinutes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "admin_id" }
        );

      if (error) {
        return jsonResponse({ ok: false, error: error.message }, { status: 500 });
      }

      return jsonResponse({
        ok: true,
        auto_sync_enabled: enabled,
        auto_sync_interval_minutes: intervalMinutes,
      });
    }

    return jsonResponse({ ok: false, error: "Unknown intent" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonResponse({ ok: false, error: msg }, { status: 500 });
  }
}
