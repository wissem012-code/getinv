/**
 * Enterprise-grade environment variable validation
 * Validates all required environment variables at startup
 */

interface EnvConfig {
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SHOPIFY_APP_URL: string;
  SCOPES: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  APP_JWT_SECRET: string;
  NODE_ENV?: string;
  SHOP_CUSTOM_DOMAIN?: string;
  SUPABASE_FUNCTIONS_BASE?: string;
}

class EnvValidationError extends Error {
  constructor(message: string) {
    super(`Environment validation failed: ${message}`);
    this.name = "EnvValidationError";
  }
}

/**
 * Validates URL format
 */
function validateUrl(url: string, name: string): void {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new EnvValidationError(`${name} must use http:// or https:// protocol`);
    }
  } catch {
    throw new EnvValidationError(`${name} must be a valid URL`);
  }
}

/**
 * Validates that a value is not empty
 */
function validateRequired(value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new EnvValidationError(`${name} is required but not set`);
  }
  return value.trim();
}

/**
 * Validates Shopify API credentials
 */
function validateShopifyConfig(apiKey: string, apiSecret: string): void {
  if (apiKey.length < 10) {
    throw new EnvValidationError("SHOPIFY_API_KEY appears to be invalid (too short)");
  }
  if (apiSecret.length < 10) {
    throw new EnvValidationError("SHOPIFY_API_SECRET appears to be invalid (too short)");
  }
}

/**
 * Validates Supabase credentials
 */
function validateSupabaseConfig(url: string, serviceKey: string): void {
  validateUrl(url, "SUPABASE_URL");
  
  // Supabase service role keys are typically long JWT-like strings
  if (serviceKey.length < 50) {
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY seems too short. Ensure you're using the service_role key, not the anon key."
    );
  }
}

/**
 * Validates JWT secret
 */
function validateJwtSecret(secret: string): void {
  if (secret.length < 32) {
    throw new EnvValidationError("APP_JWT_SECRET must be at least 32 characters long for security");
  }
}

/**
 * Validates scopes format
 */
function validateScopes(scopes: string): void {
  const scopeList = scopes.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  
  if (scopeList.length === 0) {
    throw new EnvValidationError("SCOPES must contain at least one scope");
  }
  
  // Validate scope format (basic check)
  const invalidScopes = scopeList.filter((scope) => !/^[a-z_]+$/.test(scope));
  if (invalidScopes.length > 0) {
    throw new EnvValidationError(`Invalid scope format(s): ${invalidScopes.join(", ")}`);
  }
}

/**
 * Validates all environment variables and returns typed config
 */
export function validateEnv(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV || "development";
  
  // Required variables
  const SHOPIFY_API_KEY = validateRequired(process.env.SHOPIFY_API_KEY, "SHOPIFY_API_KEY");
  const SHOPIFY_API_SECRET = validateRequired(process.env.SHOPIFY_API_SECRET, "SHOPIFY_API_SECRET");
  const SHOPIFY_APP_URL = validateRequired(process.env.SHOPIFY_APP_URL, "SHOPIFY_APP_URL");
  const SCOPES = validateRequired(process.env.SCOPES, "SCOPES");
  const SUPABASE_URL = validateRequired(process.env.SUPABASE_URL, "SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = validateRequired(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY"
  );
  const APP_JWT_SECRET = validateRequired(process.env.APP_JWT_SECRET, "APP_JWT_SECRET");
  
  // Optional variables
  const SHOP_CUSTOM_DOMAIN = process.env.SHOP_CUSTOM_DOMAIN;
  const SUPABASE_FUNCTIONS_BASE = process.env.SUPABASE_FUNCTIONS_BASE;
  
  // Validate each variable
  validateUrl(SHOPIFY_APP_URL, "SHOPIFY_APP_URL");
  validateShopifyConfig(SHOPIFY_API_KEY, SHOPIFY_API_SECRET);
  validateSupabaseConfig(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  validateJwtSecret(APP_JWT_SECRET);
  validateScopes(SCOPES);
  
  if (SHOP_CUSTOM_DOMAIN) {
    // Basic domain validation
    if (!SHOP_CUSTOM_DOMAIN.includes(".")) {
      throw new EnvValidationError("SHOP_CUSTOM_DOMAIN must be a valid domain name");
    }
  }
  
  if (SUPABASE_FUNCTIONS_BASE) {
    validateUrl(SUPABASE_FUNCTIONS_BASE, "SUPABASE_FUNCTIONS_BASE");
  }
  
  if (nodeEnv === "production") {
    // Additional production checks
    if (SHOPIFY_APP_URL.includes("localhost") || SHOPIFY_APP_URL.includes("127.0.0.1")) {
      throw new EnvValidationError("SHOPIFY_APP_URL cannot use localhost in production");
    }
  }
  
  return {
    SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET,
    SHOPIFY_APP_URL,
    SCOPES,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    APP_JWT_SECRET,
    NODE_ENV: nodeEnv,
    SHOP_CUSTOM_DOMAIN,
    SUPABASE_FUNCTIONS_BASE,
  };
}

/**
 * Get validated environment config
 * Throws if validation fails
 */
let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

// Validate on module load (non-blocking warning in development)
if (process.env.NODE_ENV !== "test") {
  try {
    getEnv();
    if (process.env.NODE_ENV === "development") {
      console.log("✓ Environment variables validated successfully");
    }
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(`✗ ${error.message}`);
      if (process.env.NODE_ENV === "production") {
        // In production, fail fast
        throw error;
      }
      // In development, warn but continue
      console.warn("Environment validation failed. The app may not work correctly.");
    } else {
      throw error;
    }
  }
}
