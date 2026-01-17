import { createClient } from "@supabase/supabase-js";

// --------------------
// Environment variable validation
// --------------------
function validateEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Please set it in your environment or .env file.`
    );
  }
  return value;
}

const SUPABASE_URL = validateEnvVar("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = validateEnvVar("SUPABASE_SERVICE_ROLE_KEY");
export const SUPABASE_EDGE_BASE_URL = process.env.SUPABASE_EDGE_BASE_URL || `${SUPABASE_URL}/functions/v1`;

// Validate URL format
if (!SUPABASE_URL.startsWith("http://") && !SUPABASE_URL.startsWith("https://")) {
  throw new Error(
    `Invalid SUPABASE_URL format: ${SUPABASE_URL}. Must start with http:// or https://`
  );
}

// Validate service role key format (Supabase keys are typically long JWT-like strings)
if (SUPABASE_SERVICE_ROLE_KEY.length < 50) {
  console.warn(
    `SUPABASE_SERVICE_ROLE_KEY seems too short (${SUPABASE_SERVICE_ROLE_KEY.length} chars). Ensure you're using the service_role key, not the anon key.`
  );
}

// --------------------
// Create Supabase admin client
// --------------------
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// --------------------
// Test connection on module load (non-blocking)
// --------------------
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  // Test connection asynchronously without blocking startup
  supabaseAdmin
    .from("_connection_test")
    .select("1")
    .limit(0)
    .then(() => {
      console.log("[supabase.server] Supabase connection validated successfully");
    })
    .catch((error) => {
      // Only log error, don't throw - connection might work for actual queries
      console.warn(
        `[supabase.server] Initial connection test failed (this may be normal): ${error.message}`
      );
    });
}
