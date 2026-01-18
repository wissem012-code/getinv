import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

/**
 * Lazy-loaded Prisma Client initialization
 * 
 * The client is NOT created at module load time. Instead, it's created
 * on first access. This prevents serverless function crashes when
 * DATABASE_URL is missing or invalid during module initialization.
 * 
 * The crash used to happen in the import chain:
 *   entry.server.tsx -> shopify.server.ts -> db.server.ts -> CRASH
 * 
 * Now the Prisma client is only instantiated when actually used.
 */

let prismaInstance: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  // Return existing instance if available
  if (prismaInstance) {
    return prismaInstance;
  }

  // In development, use global to preserve client across hot reloads
  if (process.env.NODE_ENV !== "production" && global.__prismaClient) {
    prismaInstance = global.__prismaClient;
    return prismaInstance;
  }

  // Create new client on first access
  try {
    console.log("[Prisma] Initializing database client (lazy-loaded)...");
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
    });

    // Store in global for development hot reloads
    if (process.env.NODE_ENV !== "production") {
      global.__prismaClient = prismaInstance;
    }

    return prismaInstance;
  } catch (error) {
    console.error("❌ [Prisma] Failed to initialize database client:");
    console.error("   Error:", error instanceof Error ? error.message : String(error));
    console.error("   Fix: Ensure DATABASE_URL is set correctly in environment variables");
    console.error("   For Supabase: postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true");
    throw error;
  }
}

/**
 * Lazy-loaded Prisma client using Proxy
 * 
 * This Proxy looks and behaves exactly like a PrismaClient, but defers
 * actual client creation until a property or method is accessed.
 * 
 * This prevents crashes at module load time when DATABASE_URL is unavailable.
 */
const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = client[property as keyof PrismaClient];
    // Bind methods to the client instance
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
