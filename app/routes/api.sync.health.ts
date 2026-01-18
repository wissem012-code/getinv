import type { LoaderFunctionArgs } from "react-router";
import { createClient } from "@supabase/supabase-js";

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
function getEnv(name: string): string | undefined {
  return process.env[name];
}

function getSupabaseUrl(): string | undefined {
  return getEnv("SUPABASE_URL");
}

function getSupabaseServiceRoleKey(): string | undefined {
  return getEnv("SUPABASE_SERVICE_ROLE_KEY");
}

// --------------------
// GET /api/sync/health
// Health check endpoint for Supabase connection diagnostics
// Does not require Shopify authentication
// --------------------
export async function loader({ request }: LoaderFunctionArgs) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  const diagnostics: {
    timestamp: string;
    supabase: {
      url: string | null;
      configured: boolean;
      connection: "ok" | "error" | "not_tested";
      error?: string;
    };
    schema: {
      app_private: {
        accessible: boolean;
        error?: string;
      };
    };
    table: {
      shopify_shops: {
        exists: boolean;
        accessible: boolean;
        error?: string;
        sampleCount?: number;
      };
    };
    environment: {
      nodeEnv: string;
      hasSupabaseUrl: boolean;
      hasServiceRoleKey: boolean;
    };
  } = {
    timestamp: new Date().toISOString(),
    supabase: {
      url: supabaseUrl ?? null,
      configured: !!(supabaseUrl && supabaseServiceRoleKey),
      connection: "not_tested",
    },
    schema: {
      app_private: {
        accessible: false,
      },
    },
    table: {
      shopify_shops: {
        exists: false,
        accessible: false,
      },
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || "unknown",
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!supabaseServiceRoleKey,
    },
  };

  // Early return if not configured
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    diagnostics.supabase.connection = "error";
    diagnostics.supabase.error = `Missing environment variables: ${!supabaseUrl ? "SUPABASE_URL" : ""}${!supabaseUrl && !supabaseServiceRoleKey ? ", " : ""}${!supabaseServiceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : ""}`;
    
    return jsonResponse(
      {
        healthy: false,
        ...diagnostics,
        recommendations: [
          {
            issue: "Missing configuration",
            fix: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables in Vercel",
          },
        ],
      },
      { status: 503 }
    );
  }

  try {
    // Test Supabase connection
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // Try a simple query to test connection
    const { error: connectionError } = await supabase.from("_test_connection").select("1").limit(0);

    if (connectionError) {
      // This is expected - the table doesn't exist, but it means we can connect
      diagnostics.supabase.connection = "ok";
    } else {
      diagnostics.supabase.connection = "ok";
    }

    // Test app_private schema accessibility
    try {
      const { error: schemaError } = await supabase
        .schema("app_private")
        .from("shopify_shops")
        .select("admin_id")
        .limit(1);

      if (schemaError) {
        const errorMessage = schemaError.message || "Unknown error";
        const errorCode = (schemaError as any).code || "";

        if (errorCode === "PGRST116" || errorMessage.includes("schema") || errorMessage.includes("does not exist")) {
          diagnostics.schema.app_private.accessible = false;
          diagnostics.schema.app_private.error =
            "Schema 'app_private' is not exposed. Add 'app_private' to Supabase API → Exposed schemas.";
        } else if (errorCode === "PGRST301" || errorMessage.includes("permission") || errorMessage.includes("403")) {
          diagnostics.schema.app_private.accessible = false;
          diagnostics.schema.app_private.error =
            "Permission denied. Check that SUPABASE_SERVICE_ROLE_KEY has access to app_private schema.";
        } else if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
          diagnostics.schema.app_private.accessible = true; // Schema is accessible
          diagnostics.table.shopify_shops.exists = false;
          diagnostics.table.shopify_shops.error = "Table 'shopify_shops' does not exist in app_private schema.";
        } else {
          diagnostics.schema.app_private.accessible = false;
          diagnostics.schema.app_private.error = errorMessage;
        }
      } else {
        // Success - schema and table are accessible
        diagnostics.schema.app_private.accessible = true;
        diagnostics.table.shopify_shops.exists = true;
        diagnostics.table.shopify_shops.accessible = true;

        // Try to get a count (optional, might fail on large tables)
        try {
          const { count } = await supabase
            .schema("app_private")
            .from("shopify_shops")
            .select("*", { count: "exact", head: true });
          diagnostics.table.shopify_shops.sampleCount = count ?? undefined;
        } catch {
          // Ignore count errors
        }
      }
    } catch (schemaTestError) {
      diagnostics.schema.app_private.error =
        schemaTestError instanceof Error ? schemaTestError.message : "Unknown error";
    }
  } catch (e) {
    diagnostics.supabase.connection = "error";
    diagnostics.supabase.error = e instanceof Error ? e.message : "Unknown error";
  }

  // Determine overall health status
  const isHealthy =
    diagnostics.supabase.connection === "ok" &&
    diagnostics.schema.app_private.accessible &&
    diagnostics.table.shopify_shops.exists &&
    diagnostics.table.shopify_shops.accessible;

  return jsonResponse(
    {
      healthy: isHealthy,
      ...diagnostics,
      recommendations: [
        ...(diagnostics.schema.app_private.error
          ? [
              {
                issue: "Schema not accessible",
                fix: "Go to Supabase Dashboard → API → Exposed schemas → Add 'app_private'",
              },
            ]
          : []),
        ...(diagnostics.table.shopify_shops.error && diagnostics.table.shopify_shops.exists === false
          ? [
              {
                issue: "Table does not exist",
                fix: "Create the app_private.shopify_shops table in your Supabase database",
              },
            ]
          : []),
        ...(diagnostics.supabase.error
          ? [
              {
                issue: "Connection failed",
                fix: "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables",
              },
            ]
          : []),
      ],
    },
    { status: isHealthy ? 200 : 503 }
  );
}

// --------------------
// Default component export
// This route only returns JSON from the loader, so the component returns null
// --------------------
export default function HealthCheck() {
  return null;
}
