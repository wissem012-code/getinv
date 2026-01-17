import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { createClient } from "@supabase/supabase-js";
import { validateShopDomain, sanitizeErrorMessage } from "../utils/validation.server";

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

// Helper to get admin ID for shop (reused from api.sync.ts logic)
interface ConnectionError {
  type: "configuration" | "connection" | "unknown";
  message: string;
}

async function getAdminIdForShop(shopDomain: string): Promise<{ adminId: string | null; error?: ConnectionError }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      adminId: null,
      error: {
        type: "configuration",
        message: "Supabase configuration missing",
      },
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  try {
    const { data, error } = await supabase
      .schema("app_private")
      .from("shopify_shops")
      .select("admin_id")
      .eq("shop_domain", shopDomain)
      .maybeSingle();

    if (error) {
      return {
        adminId: null,
        error: {
          type: "connection",
          message: error.message,
        },
      };
    }

    // Validate admin ID format if found
    if (data?.admin_id) {
      try {
        const { validateAdminId } = await import("../utils/validation.server");
        return { adminId: validateAdminId(data.admin_id) };
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
    return {
      adminId: null,
      error: {
        type: "unknown",
        message: e instanceof Error ? e.message : "Unknown error",
      },
    };
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
      // Logged-in Shopify Admin session (this proves the merchant opened the app)
      let session;
      try {
        const authResult = await authenticate.admin(request);
        session = authResult.session;
      } catch (authError) {
        console.error(`[loader] Authentication error:`, authError);
        
        // Check if it's a database connection error
        const errorMessage = authError instanceof Error ? authError.message : String(authError);
        if (errorMessage.includes("DATABASE_URL") || errorMessage.includes("Can't reach database server") || errorMessage.includes("P1001")) {
          return json({
            shopDomain: "unknown",
            clientId: process.env.SHOPIFY_API_KEY || "",
            externalUrl: "https://getinv.app/",
            connectionStatus: {
              connected: false,
              shopDomain: "unknown",
              error: "Database connection failed. Please set DATABASE_URL in Vercel environment variables.",
              errorType: "database",
              errorDetails: "The app cannot connect to the database. This is required for session management.",
              troubleshooting: {
                step1: "Go to Vercel Dashboard → Project Settings → Environment Variables",
                step2: "Add DATABASE_URL with connection pooling URL (port 6543)",
                step3: "Format: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require",
                step4: "Redeploy the app after adding DATABASE_URL",
              },
            },
          }, { status: 500 });
        }
        
        // Re-throw other authentication errors
        throw authError;
      }

      // This is the most useful "ID" inside Shopify:
      // Validate shop domain for security
      let shopDomain: string;
      try {
        shopDomain = validateShopDomain(session.shop);
      } catch (error) {
        console.error(`[loader] Invalid shop domain:`, { shop: session.shop, error });
        return json({
          shopDomain: session.shop || "unknown",
          clientId: process.env.SHOPIFY_API_KEY || "",
          externalUrl: "https://getinv.app/",
          connectionStatus: {
            connected: false,
            shopDomain: session.shop || "unknown",
            error: sanitizeErrorMessage(error),
            errorType: "validation",
          },
        });
      }

  // Safe to show (NOT secret)
  const clientId = process.env.SHOPIFY_API_KEY || "";

  // Check connection status
  interface ConnectionStatus {
    connected: boolean;
    shopDomain: string;
    adminId?: string;
    reason?: string;
    error?: string;
    errorType?: string;
    errorDetails?: string;
    troubleshooting?: Record<string, string>;
    settings?: {
      auto_sync_enabled: boolean;
      auto_sync_interval_minutes: number;
      last_pull_at: string | null;
      last_push_at: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    } | null;
  }

  let connectionStatus: ConnectionStatus | null = null;
  try {
    const { adminId, error } = await getAdminIdForShop(shopDomain);

    if (error) {
      connectionStatus = {
        connected: false,
        shopDomain,
        error: error.message,
        errorType: error.type,
      };
    } else if (!adminId) {
      connectionStatus = {
        connected: false,
        shopDomain,
        reason:
          "This Shopify store is installed, but it is not linked to a GetInv tenant yet. Link it from your GetInv app first.",
      };
    } else {
      // Try to get settings
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });
        const { data: settings } = await supabase
          .from("shopify_settings")
          .select("auto_sync_enabled, auto_sync_interval_minutes, last_pull_at, last_push_at, created_at, updated_at")
          .eq("admin_id", adminId)
          .maybeSingle();

        connectionStatus = {
          connected: true,
          shopDomain,
          adminId,
          settings: settings ?? null,
        };
      } else {
        connectionStatus = {
          connected: true,
          shopDomain,
          adminId,
          settings: null,
        };
      }
    }
  } catch (e) {
    console.error(`[loader] Unexpected error:`, e);
    const errorMessage = sanitizeErrorMessage(e);
    const errorType = e instanceof Error && e.message.includes("DATABASE_URL") ? "database" : "unknown";
    
    connectionStatus = {
      connected: false,
      shopDomain: shopDomain || "unknown",
      error: errorMessage,
      errorType,
      errorDetails: process.env.NODE_ENV === "production" 
        ? undefined 
        : (e instanceof Error ? e.stack : String(e)),
    };
  }

  return json({
    shopDomain: shopDomain || "unknown",
    clientId,
    externalUrl: "https://getinv.app/",
    connectionStatus,
  });
}

export default function AppIndex() {
  const { shopDomain, clientId, externalUrl, connectionStatus } = useLoaderData() as {
    shopDomain: string;
    clientId: string;
    externalUrl: string;
    connectionStatus: {
      connected: boolean;
      shopDomain: string;
      adminId?: string;
      reason?: string;
      error?: string;
      errorType?: string;
      errorDetails?: string;
      troubleshooting?: Record<string, string>;
      settings?: {
        auto_sync_enabled: boolean;
        auto_sync_interval_minutes: number;
        last_pull_at: string | null;
        last_push_at: string | null;
      } | null;
    } | null;
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, Arial", background: "white", minHeight: "100vh" }}>
      {/* Header Section with Blue and White Theme */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
          borderRadius: 12,
          padding: "32px 24px",
          marginBottom: 24,
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <img
            src="/logo.svg"
            alt="GetInv Logo"
            style={{
              height: "80px",
              width: "auto",
              maxWidth: "200px",
            }}
            onError={(e) => {
              // Fallback if logo.svg doesn't exist, try logo.png
              const target = e.target as HTMLImageElement;
              if (target.src.endsWith("/logo.svg")) {
                target.src = "/logo.png";
              }
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              fontWeight: 700,
              color: "white",
              flex: 1,
              minWidth: "200px",
            }}
          >
            Professional Inventory Management
          </h1>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "16px",
            lineHeight: 1.6,
            opacity: 0.95,
            color: "white",
          }}
        >
          Enterprise-grade inventory control with real-time tracking, automated workflows, and comprehensive analytics. Built for businesses that demand excellence.
        </p>
      </div>

      {/* Connection Status Card - Blue and White Theme */}
      {connectionStatus && (
        <div
          style={{
            border: `2px solid ${connectionStatus.connected ? "#3b82f6" : connectionStatus.error ? "#ef4444" : "#f59e0b"}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            background: connectionStatus.connected
              ? "#eff6ff"
              : connectionStatus.error
                ? "#fef2f2"
                : "#fffbeb",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: connectionStatus.connected ? 16 : 12,
              fontWeight: 700,
              fontSize: 18,
              color: connectionStatus.connected ? "#1e40af" : connectionStatus.error ? "#dc2626" : "#b45309",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: connectionStatus.connected
                  ? "#3b82f6"
                  : connectionStatus.error
                    ? "#ef4444"
                    : "#f59e0b",
                marginRight: 12,
                boxShadow: `0 0 0 3px ${
                  connectionStatus.connected
                    ? "rgba(59, 130, 246, 0.2)"
                    : connectionStatus.error
                      ? "rgba(239, 68, 68, 0.2)"
                      : "rgba(245, 158, 11, 0.2)"
                }`,
              }}
            />
            {connectionStatus.connected
              ? "Connected"
              : connectionStatus.error
                ? "Connection Error"
                : "Not Connected"}
          </div>

          {connectionStatus.connected && connectionStatus.adminId && (
            <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6, color: "#1e3a8a" }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Admin ID:</strong> {connectionStatus.adminId}
              </div>
              {connectionStatus.settings && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Auto-sync:</strong> {connectionStatus.settings.auto_sync_enabled ? "Enabled" : "Disabled"}
                    {connectionStatus.settings.auto_sync_enabled &&
                      ` (every ${connectionStatus.settings.auto_sync_interval_minutes} minutes)`}
                  </div>
                  {connectionStatus.settings.last_pull_at && (
                    <div style={{ marginBottom: 4 }}>
                      <strong>Last pull:</strong> {new Date(connectionStatus.settings.last_pull_at).toLocaleString()}
                    </div>
                  )}
                  {connectionStatus.settings.last_push_at && (
                    <div>
                      <strong>Last push:</strong> {new Date(connectionStatus.settings.last_push_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!connectionStatus.connected && connectionStatus.reason && (
            <div style={{ fontSize: 14, marginBottom: 8, color: "#1e3a8a", lineHeight: 1.5 }}>
              {connectionStatus.reason}
            </div>
          )}

          {connectionStatus.error && (
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#dc2626", fontSize: 15 }}>Error:</div>
              <div style={{ color: "#1e3a8a", marginBottom: 12, lineHeight: 1.5 }}>{connectionStatus.error}</div>

              {connectionStatus.errorType && connectionStatus.troubleshooting && (
                <div style={{ marginTop: 12, padding: 14, background: "white", borderRadius: 8, border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14, color: "#1e3a8a" }}>Troubleshooting:</div>
                  {connectionStatus.troubleshooting[connectionStatus.errorType] && (
                    <div style={{ fontSize: 13, color: "#1e3a8a", lineHeight: 1.5 }}>
                      {connectionStatus.troubleshooting[connectionStatus.errorType]}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          border: "1px solid #bfdbfe",
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          background: "white",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, color: "#1e3a8a" }}>Shop Domain</div>
        <div style={{ fontWeight: 700, fontSize: 14, wordBreak: "break-all", color: "#1e40af" }}>{shopDomain}</div>

        <div style={{ height: 10 }} />

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, color: "#1e3a8a" }}>Shopify App Client ID</div>
        <div style={{ fontWeight: 700, fontSize: 14, wordBreak: "break-all", color: "#1e40af" }}>{clientId || "—"}</div>

        <div style={{ height: 12 }} />

        <button
          onClick={() => navigator.clipboard.writeText(shopDomain)}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #3b82f6",
            cursor: "pointer",
            background: "white",
            color: "#3b82f6",
            fontWeight: 600,
            marginRight: 8,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#eff6ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
          }}
        >
          Copy shop domain
        </button>

        <button
          onClick={() => (window.location.href = externalUrl)}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: "#3b82f6",
            color: "white",
            fontWeight: 600,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#2563eb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#3b82f6";
          }}
        >
          Open GetInv
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8, color: "#1e3a8a" }}>
        If the page below doesn't load, it's because the website blocks being shown inside Shopify (security setting).
        Use the "Open GetInv" button above.
      </div>

      <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, overflow: "hidden", background: "white" }}>
        <iframe
          src={externalUrl}
          title="GetInv"
          style={{ width: "100%", height: "75vh", border: 0 }}
        />
      </div>
    </div>
  );
}
