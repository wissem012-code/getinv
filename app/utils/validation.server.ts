/**
 * Enterprise-grade validation utilities
 * Provides input validation and sanitization for security
 */

// Valid Shopify shop domain pattern (e.g., myshop.myshopify.com)
const SHOP_DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]\.myshopify\.com$/;

// Valid intent values
const VALID_INTENTS = ["pull", "push_changed", "push_all", "toggle_auto"] as const;

export type ValidIntent = (typeof VALID_INTENTS)[number];

/**
 * Validates and sanitizes Shopify shop domain
 */
export function validateShopDomain(shopDomain: unknown): string {
  if (typeof shopDomain !== "string") {
    throw new Error("Shop domain must be a string");
  }

  const trimmed = shopDomain.trim().toLowerCase();

  if (!trimmed) {
    throw new Error("Shop domain cannot be empty");
  }

  if (trimmed.length > 255) {
    throw new Error("Shop domain is too long");
  }

  if (!SHOP_DOMAIN_PATTERN.test(trimmed)) {
    throw new Error("Invalid shop domain format. Must be in format: store.myshopify.com");
  }

  return trimmed;
}

/**
 * Validates intent value
 */
export function validateIntent(intent: unknown): ValidIntent {
  if (typeof intent !== "string") {
    throw new Error("Intent must be a string");
  }

  if (!VALID_INTENTS.includes(intent as ValidIntent)) {
    throw new Error(`Invalid intent. Must be one of: ${VALID_INTENTS.join(", ")}`);
  }

  return intent as ValidIntent;
}

/**
 * Validates interval minutes value
 */
export function validateIntervalMinutes(intervalMinutes: unknown, defaultValue = 15): number {
  if (intervalMinutes === undefined || intervalMinutes === null) {
    return defaultValue;
  }

  if (typeof intervalMinutes !== "number") {
    throw new Error("Interval minutes must be a number");
  }

  if (!Number.isInteger(intervalMinutes)) {
    throw new Error("Interval minutes must be an integer");
  }

  if (intervalMinutes < 1) {
    throw new Error("Interval minutes must be at least 1");
  }

  if (intervalMinutes > 1440) {
    // Max 24 hours (1440 minutes)
    throw new Error("Interval minutes cannot exceed 1440 (24 hours)");
  }

  return intervalMinutes;
}

/**
 * Validates admin ID format
 */
export function validateAdminId(adminId: unknown): string {
  if (typeof adminId !== "string") {
    throw new Error("Admin ID must be a string");
  }

  const trimmed = adminId.trim();

  if (!trimmed) {
    throw new Error("Admin ID cannot be empty");
  }

  if (trimmed.length > 255) {
    throw new Error("Admin ID is too long");
  }

  // Basic format validation - adjust based on your admin ID format
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
    throw new Error("Admin ID contains invalid characters");
  }

  return trimmed;
}

/**
 * Sanitizes error messages for production to prevent information leakage
 */
export function sanitizeErrorMessage(error: unknown, isProduction = process.env.NODE_ENV === "production"): string {
  if (isProduction) {
    // In production, don't expose internal error details
    if (error instanceof Error) {
      // Only show generic error messages in production
      const message = error.message;
      
      // Check if it's a validation error (safe to show)
      if (message.includes("must be") || message.includes("cannot") || message.includes("Invalid")) {
        return message;
      }
      
      // Otherwise, return generic error
      return "An error occurred processing your request. Please try again later.";
    }
    
    return "An unexpected error occurred. Please try again later.";
  }

  // In development, show full error details
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
