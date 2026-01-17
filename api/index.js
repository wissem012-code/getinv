/**
 * Vercel serverless function handler for React Router app
 * This file handles all routes and delegates to React Router
 * 
 * @see https://vercel.com/docs/functions/serverless-functions/runtimes/node-js
 * Config: maxDuration=30s, memory=1024MB
 */

import { createRequestHandler } from "@react-router/node";
import * as build from "../build/server/index.js";

const handleRequest = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || "production",
});

export default async function handler(req, res) {
  try {
    // Enterprise-grade path handling for Vercel serverless functions
    // Preserve original request path from rewrite using Vercel headers
    
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    
    // Vercel provides the original URL in x-vercel-original-url header after rewrite
    // This is the enterprise-grade way to preserve the path
    let requestUrl = req.headers["x-vercel-original-url"] || req.url || "/";
    
    // If we're being called via rewrite to /api/index, extract original path
    if (requestUrl === "/api/index" || requestUrl.startsWith("/api/index")) {
      // Check if original path is in headers
      requestUrl = req.headers["x-invoke-path"] || req.headers["x-vercel-rewrite-path"] || "/";
    }
    
    // Ensure we have a valid URL
    if (!requestUrl.startsWith("http")) {
      // Construct full URL if we only have a path
      const urlObj = new URL(requestUrl, `${protocol}://${host}`);
      requestUrl = urlObj.toString();
    }
    
    const url = new URL(requestUrl);
    
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
