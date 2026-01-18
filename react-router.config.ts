import type { Config } from "@react-router/dev/config";

/**
 * React Router configuration for enterprise-grade Vercel deployment
 * This config suppresses the vercelPreset warning by explicitly defining
 * the server build and runtime configuration
 */
export default {
  // Explicitly configure server build
  // serverBuildFile is relative to build output directory (build/)
  // So "server/index.js" means build/server/index.js
  // DO NOT use path.join or absolute paths - React Router handles this internally
  serverBuildFile: "server/index.js",
  
  // Configure for serverless deployment (Vercel)
  // We use a custom handler in api/index.js, so we don't need the vercelPreset
  // This config makes it explicit that we're handling the serverless adapter ourselves
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },

  // Tailwind config (if needed in future)
  // tailwind: true,

  // PostCSS config (if needed in future)
  // postcss: true,
} satisfies Config;
