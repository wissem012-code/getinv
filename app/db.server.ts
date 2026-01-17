import { PrismaClient } from "@prisma/client";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient;
}

/**
 * Enterprise-grade Prisma Client initialization with error handling
 * Handles missing DATABASE_URL gracefully for better error messages
 */
function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
    });
  } catch (error) {
    // Check if error is due to missing DATABASE_URL
    if (error instanceof PrismaClientInitializationError) {
      if (error.errorCode === "P1001" || error.message.includes("DATABASE_URL") || error.message.includes("Can't reach database server")) {
        console.error("❌ [Prisma] DATABASE_URL is missing or invalid:");
        console.error("   Error:", error.message);
        console.error("   Fix: Set DATABASE_URL in Vercel environment variables");
        console.error("   Use connection pooling (port 6543) for serverless: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true");
        throw new Error("Database connection failed: DATABASE_URL is missing or invalid. Check Vercel environment variables.");
      }
    }
    throw error;
  }
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = createPrismaClient();
  }
}

const prisma = global.prismaGlobal ?? createPrismaClient();

export default prisma;
