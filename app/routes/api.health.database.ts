import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";

/**
 * GET /api/health/database
 * 
 * Diagnostic endpoint to verify DATABASE_URL is correctly configured
 * and Prisma can connect to the database.
 * 
 * This helps diagnose 500 errors on /app routes caused by database issues.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const diagnostics: {
    timestamp: string;
    database: {
      configured: boolean;
      connection: "ok" | "error" | "not_tested";
      error?: string;
      errorCode?: string;
    };
    sessionTable: {
      exists: boolean;
      accessible: boolean;
      error?: string;
      rowCount?: number;
    };
    environment: {
      nodeEnv: string;
      hasDatabaseUrl: boolean;
      hasDirectUrl: boolean;
      databaseUrlFormat: string;
    };
    recommendations: Array<{ issue: string; fix: string }>;
  } = {
    timestamp: new Date().toISOString(),
    database: {
      configured: false,
      connection: "not_tested",
    },
    sessionTable: {
      exists: false,
      accessible: false,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || "unknown",
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
      databaseUrlFormat: getDatabaseUrlFormat(),
    },
    recommendations: [],
  };

  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    diagnostics.database.error = "DATABASE_URL environment variable is not set";
    diagnostics.recommendations.push({
      issue: "DATABASE_URL not configured",
      fix: "Add DATABASE_URL to Vercel Environment Variables. Use the pooled connection (port 6543) from Supabase.",
    });
    return jsonResponse({ healthy: false, ...diagnostics }, { status: 503 });
  }

  diagnostics.database.configured = true;

  // Try to connect to the database
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1 as test`;
    diagnostics.database.connection = "ok";
  } catch (error) {
    diagnostics.database.connection = "error";
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code || (error as any)?.errorCode;
    
    diagnostics.database.error = errorMessage;
    diagnostics.database.errorCode = errorCode;

    // Provide specific recommendations based on error
    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("Can't reach database server")) {
      diagnostics.recommendations.push({
        issue: "Cannot connect to database server",
        fix: "Check that DATABASE_URL is correct. For Supabase, use the pooled connection string (port 6543).",
      });
    } else if (errorMessage.includes("authentication failed") || errorMessage.includes("password")) {
      diagnostics.recommendations.push({
        issue: "Database authentication failed",
        fix: "Verify the password in DATABASE_URL is correct. Get the connection string from Supabase Dashboard → Settings → Database.",
      });
    } else if (errorMessage.includes("SSL") || errorMessage.includes("sslmode")) {
      diagnostics.recommendations.push({
        issue: "SSL connection issue",
        fix: "Make sure DATABASE_URL includes ?sslmode=require at the end.",
      });
    } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      diagnostics.recommendations.push({
        issue: "Connection timeout",
        fix: "Check network connectivity. For Vercel, ensure you're using the pooled connection (port 6543) with ?pgbouncer=true.",
      });
    }

    return jsonResponse({ healthy: false, ...diagnostics }, { status: 503 });
  }

  // Test if Session table exists and is accessible
  try {
    const count = await prisma.session.count();
    diagnostics.sessionTable.exists = true;
    diagnostics.sessionTable.accessible = true;
    diagnostics.sessionTable.rowCount = count;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("does not exist") || errorMessage.includes("relation") || errorMessage.includes("P2021")) {
      diagnostics.sessionTable.exists = false;
      diagnostics.sessionTable.error = "Session table does not exist";
      diagnostics.recommendations.push({
        issue: "Session table not found",
        fix: "Run 'npx prisma migrate deploy' locally with DIRECT_URL set, or create the Session table manually in Supabase SQL Editor.",
      });
    } else {
      diagnostics.sessionTable.error = errorMessage;
      diagnostics.recommendations.push({
        issue: "Cannot access Session table",
        fix: "Check database permissions for the Session table.",
      });
    }
  }

  const isHealthy =
    diagnostics.database.connection === "ok" &&
    diagnostics.sessionTable.exists &&
    diagnostics.sessionTable.accessible;

  return jsonResponse({ healthy: isHealthy, ...diagnostics }, { status: isHealthy ? 200 : 503 });
}

/**
 * Analyzes DATABASE_URL format without exposing sensitive data
 */
function getDatabaseUrlFormat(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return "not_set";

  try {
    // Parse without exposing credentials
    if (url.includes("pooler.supabase.com:6543")) {
      return "supabase_pooled_correct";
    } else if (url.includes("pooler.supabase.com:5432")) {
      return "supabase_wrong_port_should_be_6543";
    } else if (url.includes("supabase.com") && url.includes(":5432")) {
      return "supabase_direct_not_pooled";
    } else if (url.includes("supabase.com")) {
      return "supabase_format";
    } else if (url.includes("localhost") || url.includes("127.0.0.1")) {
      return "localhost";
    } else {
      return "custom_postgres";
    }
  } catch {
    return "invalid_format";
  }
}

function jsonResponse(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data, null, 2), { ...init, headers });
}

export default function HealthDatabase() {
  return null;
}
