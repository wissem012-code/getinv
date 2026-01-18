import { createClient, SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var __supabaseAdmin: SupabaseClient | undefined;
}

/**
 * Lazy-loaded Supabase Admin Client
 * 
 * The client is NOT created at module load time. Instead, it's created
 * on first access. This prevents serverless function crashes when
 * SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing during module initialization.
 * 
 * The crash used to happen in the import chain:
 *   entry.server.tsx -> some-module -> supabase.server.ts -> CRASH
 * 
 * Now the Supabase client is only instantiated when actually used.
 */

let supabaseInstance: SupabaseClient | undefined;
let connectionTested = false;

/**
 * Validates an environment variable exists and returns its value
 * Only called during lazy initialization, not at module load time
 */
function validateEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Please set it in your environment or .env file.`
    );
  }
  return value;
}

/**
 * Creates and returns the Supabase admin client
 * Validates environment variables and URL format on first access only
 */
function getSupabaseAdmin(): SupabaseClient {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // In development, use global to preserve client across hot reloads
  if (process.env.NODE_ENV !== "production" && global.__supabaseAdmin) {
    supabaseInstance = global.__supabaseAdmin;
    return supabaseInstance;
  }

  // Validate environment variables (only on first access)
  console.log("[Supabase] Initializing admin client (lazy-loaded)...");
  
  const supabaseUrl = validateEnvVar("SUPABASE_URL");
  const supabaseServiceRoleKey = validateEnvVar("SUPABASE_SERVICE_ROLE_KEY");

  // Validate URL format
  if (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://")) {
    throw new Error(
      `Invalid SUPABASE_URL format: ${supabaseUrl}. Must start with http:// or https://`
    );
  }

  // Validate service role key format (Supabase keys are typically long JWT-like strings)
  if (supabaseServiceRoleKey.length < 50) {
    console.warn(
      `[Supabase] SUPABASE_SERVICE_ROLE_KEY seems too short (${supabaseServiceRoleKey.length} chars). Ensure you're using the service_role key, not the anon key.`
    );
  }

  // Create the Supabase admin client
  supabaseInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  // Store in global for development hot reloads
  if (process.env.NODE_ENV !== "production") {
    global.__supabaseAdmin = supabaseInstance;
  }

  // Test connection asynchronously without blocking (only once)
  if (!connectionTested && typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
    connectionTested = true;
    supabaseInstance
      .from("_connection_test")
      .select("1")
      .limit(0)
      .then(() => {
        console.log("[Supabase] Connection validated successfully");
      })
      .catch((error) => {
        // Only log error, don't throw - connection might work for actual queries
        console.warn(
          `[Supabase] Initial connection test failed (this may be normal): ${error.message}`
        );
      });
  }

  return supabaseInstance;
}

/**
 * Lazy-loaded Supabase admin client using Proxy
 * 
 * This Proxy looks and behaves exactly like a SupabaseClient, but defers
 * actual client creation until a property or method is accessed.
 * 
 * This prevents crashes at module load time when env vars are unavailable.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseAdmin();
    const value = client[property as keyof SupabaseClient];
    // Bind methods to the client instance
    if (typeof value === "function") {
      return (value as Function).bind(client);
    }
    return value;
  },
});

/**
 * Get the Supabase Edge Function base URL
 * Also lazy-loaded to prevent accessing SUPABASE_URL at module load time
 */
export function getSupabaseEdgeBaseUrl(): string {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      "Missing required environment variable: SUPABASE_URL. Cannot construct edge function URL."
    );
  }
  return process.env.SUPABASE_EDGE_BASE_URL || `${supabaseUrl}/functions/v1`;
}

// For backwards compatibility, also export as a getter
// (some code might import SUPABASE_EDGE_BASE_URL directly)
export const SUPABASE_EDGE_BASE_URL = new Proxy({} as { toString(): string; valueOf(): string }, {
  get(_target, property) {
    if (property === "toString" || property === "valueOf" || property === Symbol.toPrimitive) {
      return () => getSupabaseEdgeBaseUrl();
    }
    // For string operations, return the actual URL
    return getSupabaseEdgeBaseUrl();
  },
}) as unknown as string;
