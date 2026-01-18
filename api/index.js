/**
 * Vercel serverless function handler for React Router app
 * This file handles all routes and delegates to React Router
 * 
 * @see https://vercel.com/docs/functions/serverless-functions/runtimes/node-js
 * Config: maxDuration=30s, memory=1024MB
 */

import { createRequestHandler } from "@react-router/node";
// Import from build/server - this should be available at runtime
// With outputDirectory: "build/client", only build/client/ is deployed for static files
// But serverless functions (api/) are deployed separately from root
// build/server/ needs to be accessible - it's copied to build/client/server/ during build
// At runtime, build/client/ is the static root, so server/ inside it is accessible
// But api/index.js runs in a different context (serverless function root)
// So we import from build/server which should be preserved
import * as build from "../build/server/index.js";

const handleRequest = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || "production",
});

export default async function handler(req, res) {
  try {
    // Enterprise-grade path handling for Vercel serverless functions
    // Debug logging to understand what Vercel is sending
    console.log("[api/index] Request received:", {
      url: req.url,
      method: req.method,
      headers: {
        "x-vercel-original-url": req.headers["x-vercel-original-url"],
        "x-vercel-rewrite-path": req.headers["x-vercel-rewrite-path"],
        "x-invoke-path": req.headers["x-invoke-path"],
        host: req.headers.host,
      },
    });
    
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    
    // Enterprise-grade path extraction from Vercel rewrite
    // When rewrite "/(.*)" -> "/api/index", the original path is in x-vercel-matched-path header
    // Or we need to check x-vercel-original-url
    let originalPath = req.headers["x-vercel-matched-path"] 
      || req.headers["x-vercel-original-url"] 
      || req.headers["x-vercel-rewrite-path"] 
      || req.headers["x-invoke-path"];
    
    // Extract path from full URL if header contains full URL
    if (originalPath && originalPath.startsWith("http")) {
      try {
        const urlObj = new URL(originalPath);
        originalPath = urlObj.pathname + urlObj.search;
      } catch {
        // Invalid URL, use default
        originalPath = "/";
      }
    }
    
    // If still no original path and req.url is /api/index, we've lost the path
    // In this case, default to "/" and React Router will handle routing
    if (!originalPath || originalPath === "/api/index" || originalPath.startsWith("/api/index")) {
      // When all else fails, default to root
      // This will cause 404s for deep routes, but at least the app will load
      originalPath = "/";
      
      // Log this case so we can debug
      console.warn("[api/index] Could not extract original path from rewrite, defaulting to /", {
        reqUrl: req.url,
        headers: Object.keys(req.headers).filter(h => h.toLowerCase().includes("vercel") || h.toLowerCase().includes("path")),
      });
    }
    
    // Ensure path starts with /
    if (!originalPath.startsWith("/")) {
      originalPath = `/${originalPath}`;
    }
    
    // Remove any /api prefix if present
    if (originalPath.startsWith("/api")) {
      originalPath = originalPath.replace(/^\/api/, "") || "/";
    }
    
    // Build full URL for React Router
    // Use the host from headers and construct the full URL
    const url = new URL(originalPath, `${protocol}://${host}`);
    
    // Preserve query string from original request
    // Check both req.url and headers for query string
    let queryString = null;
    if (req.url && req.url.includes("?")) {
      queryString = req.url.split("?")[1];
    } else if (req.headers["x-vercel-original-url"] && req.headers["x-vercel-original-url"].includes("?")) {
      queryString = req.headers["x-vercel-original-url"].split("?")[1];
    }
    
    if (queryString) {
      url.search = queryString;
    }
    
    console.log("[api/index] Final URL for React Router:", url.toString());
    
    // Handle body parsing for POST/PUT requests
    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
      } catch {
        body = undefined;
      }
    }
    
    const request = new Request(url.toString(), {
      method: req.method,
      headers: new Headers(req.headers),
      body: body,
    });

    const response = await handleRequest(request);
    
    // Convert Response to Vercel's res format
    res.status(response.status);
    
    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Handle response body - wait for stream to complete
    if (response.body) {
      const reader = response.body.getReader();
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine chunks and send
      const allChunks = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, offset);
        offset += chunk.length;
      }
      
      res.end(Buffer.from(allChunks));
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Request handler error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      url: req.url,
      method: req.method,
    });
    
    res.status(500).json({ 
      error: process.env.NODE_ENV === "production" 
        ? "Internal Server Error" 
        : errorMessage,
      ...(process.env.NODE_ENV !== "production" && { stack: errorStack })
    });
  }
}
