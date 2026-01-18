import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/health
 * 
 * True Vercel API function that returns JSON directly (no React Router SSR).
 * Checks database connectivity and Session table status.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Wrap everything in try-catch to catch any crash
  try {
    const diagnostics: {
      timestamp: string;
      runtime: string;
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
      runtime: "vercel-serverless",
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
      return res.status(503).json({ healthy: false, ...diagnostics });
    }

    diagnostics.database.configured = true;

    // Dynamically import Prisma to avoid module-level failures
    let prisma;
    try {
      const { PrismaClient } = await import('@prisma/client');
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });
    } catch (importError) {
      diagnostics.database.connection = "error";
      diagnostics.database.error = `Failed to initialize Prisma: ${importError instanceof Error ? importError.message : String(importError)}`;
      diagnostics.recommendations.push({
        issue: "Prisma initialization failed",
        fix: "Check DATABASE_URL format. It should be: postgresql://user:password@host:port/database",
      });
      return res.status(503).json({ healthy: false, ...diagnostics });
    }

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

      await prisma.$disconnect().catch(() => {});
      return res.status(503).json({ healthy: false, ...diagnostics });
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

    // Disconnect from database
    await prisma.$disconnect().catch(() => {});

    const isHealthy =
      diagnostics.database.connection === "ok" &&
      diagnostics.sessionTable.exists &&
      diagnostics.sessionTable.accessible;

    return res.status(isHealthy ? 200 : 503).json({ healthy: isHealthy, ...diagnostics });
  } catch (fatalError) {
    // Catch any unexpected crash and return details
    return res.status(500).json({
      healthy: false,
      error: "Fatal error in health check",
      message: fatalError instanceof Error ? fatalError.message : String(fatalError),
      stack: fatalError instanceof Error ? fatalError.stack : undefined,
      timestamp: new Date().toISOString(),
      runtime: "vercel-serverless",
    });
  }
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
