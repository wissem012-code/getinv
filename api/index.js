/**
 * Vercel serverless function handler for React Router app
 * This file handles all routes and delegates to React Router
 */

import { createRequestHandler } from "@react-router/node";
import * as build from "../build/server/index.js";

const handleRequest = createRequestHandler({
  build,
  mode: process.env.NODE_ENV || "production",
});

export default async function handler(req, res) {
  // Convert Vercel's req to Web API Request
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const url = new URL(req.url || "/", `${protocol}://${host}`);
  
  const request = new Request(url.toString(), {
    method: req.method,
    headers: new Headers(req.headers),
    body: req.method !== "GET" && req.method !== "HEAD" && req.body 
      ? JSON.stringify(req.body) 
      : undefined,
  });

  try {
    const response = await handleRequest(request);
    
    // Convert Response to Vercel's res format
    res.status(response.status);
    
    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Handle response body
    if (response.body) {
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(Buffer.from(value));
          }
        } catch (error) {
          console.error("Error streaming response:", error);
          res.end();
        }
      };
      pump();
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Request handler error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
