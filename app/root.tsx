import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Global Error Boundary - catches all unhandled errors
 * Displays meaningful error information instead of blank pages
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const isDev = process.env.NODE_ENV === "development";

  // Extract error details
  let title = "Application Error";
  let message = "An unexpected error occurred";
  let statusCode: number | null = null;
  let stack: string | undefined;
  let details: string | undefined;

  if (isRouteErrorResponse(error)) {
    // Route error (4xx, 5xx responses)
    statusCode = error.status;
    title = getErrorTitle(error.status);
    message = error.statusText || getErrorMessage(error.status);
    details = typeof error.data === "string" ? error.data : JSON.stringify(error.data, null, 2);
  } else if (error instanceof Error) {
    // JavaScript error
    message = error.message;
    stack = error.stack;
    
    // Check for common error patterns
    if (message.includes("DATABASE_URL")) {
      title = "Database Configuration Error";
      message = "The database connection is not properly configured.";
      details = isDev ? error.message : "Please check your environment variables.";
    } else if (message.includes("SHOPIFY") || message.includes("API_KEY")) {
      title = "Shopify Configuration Error";
      message = "Shopify app credentials are missing or invalid.";
      details = isDev ? error.message : "Please verify your Shopify app configuration.";
    } else if (message.includes("SUPABASE")) {
      title = "Supabase Configuration Error";
      message = "Supabase connection is not properly configured.";
      details = isDev ? error.message : "Please check your Supabase environment variables.";
    } else if (message.includes("fetch") || message.includes("network")) {
      title = "Network Error";
      message = "Failed to connect to external service.";
    }
  } else if (typeof error === "string") {
    message = error;
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{title}</title>
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <style dangerouslySetInnerHTML={{ __html: errorStyles }} />
      </head>
      <body>
        <div className="error-container">
          <div className="error-card">
            {/* Status badge */}
            {statusCode && (
              <div className="status-badge" data-status={getStatusCategory(statusCode)}>
                {statusCode}
              </div>
            )}

            {/* Error icon */}
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            {/* Error content */}
            <h1 className="error-title">{title}</h1>
            <p className="error-message">{message}</p>

            {/* Details section (dev mode or safe details) */}
            {details && (
              <details className="error-details">
                <summary>Technical Details</summary>
                <pre>{details}</pre>
              </details>
            )}

            {/* Stack trace (dev mode only) */}
            {isDev && stack && (
              <details className="error-stack">
                <summary>Stack Trace</summary>
                <pre>{stack}</pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="error-actions">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Retry
              </button>
              <a href="/" className="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Go Home
              </a>
            </div>

            {/* Timestamp */}
            <div className="error-timestamp">
              {new Date().toISOString()}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

// Helper functions
function getErrorTitle(status: number): string {
  const titles: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Page Not Found",
    405: "Method Not Allowed",
    408: "Request Timeout",
    429: "Too Many Requests",
    500: "Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return titles[status] || `Error ${status}`;
}

function getErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "The request could not be understood by the server.",
    401: "You need to be authenticated to access this resource.",
    403: "You don't have permission to access this resource.",
    404: "The page you're looking for doesn't exist or has been moved.",
    405: "This action is not allowed.",
    408: "The request took too long to complete.",
    429: "You've made too many requests. Please wait a moment.",
    500: "Something went wrong on our end. We're working to fix it.",
    502: "We're having trouble connecting to our services.",
    503: "The service is temporarily unavailable. Please try again later.",
    504: "The request timed out. Please try again.",
  };
  return messages[status] || "An unexpected error occurred.";
}

function getStatusCategory(status: number): string {
  if (status >= 500) return "server";
  if (status >= 400) return "client";
  return "unknown";
}

// Embedded styles for error boundary (works even if CSS fails to load)
const errorStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .error-container {
    width: 100%;
    max-width: 560px;
  }

  .error-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 48px 40px;
    text-align: center;
    box-shadow: 
      0 4px 24px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    position: relative;
    overflow: hidden;
  }

  .error-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent);
  }

  .status-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .status-badge[data-status="client"] {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(251, 191, 36, 0.3);
  }

  .status-badge[data-status="server"] {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .error-icon {
    width: 72px;
    height: 72px;
    margin: 0 auto 24px;
    color: #ef4444;
    animation: pulse 2s ease-in-out infinite;
  }

  .error-icon svg {
    width: 100%;
    height: 100%;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(0.95); }
  }

  .error-title {
    color: #f8fafc;
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 12px;
    letter-spacing: -0.5px;
  }

  .error-message {
    color: #94a3b8;
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 28px;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }

  .error-details,
  .error-stack {
    text-align: left;
    margin-bottom: 20px;
    border-radius: 12px;
    overflow: hidden;
  }

  .error-details summary,
  .error-stack summary {
    cursor: pointer;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.03);
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .error-details summary:hover,
  .error-stack summary:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
  }

  .error-details[open] summary,
  .error-stack[open] summary {
    border-radius: 12px 12px 0 0;
    border-bottom-color: transparent;
  }

  .error-details pre,
  .error-stack pre {
    padding: 16px;
    background: rgba(0, 0, 0, 0.3);
    color: #e2e8f0;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-top: none;
    border-radius: 0 0 12px 12px;
    max-height: 200px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .error-stack pre {
    color: #f87171;
  }

  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 8px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    border: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .error-timestamp {
    margin-top: 28px;
    font-size: 11px;
    color: #475569;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  }

  @media (max-width: 480px) {
    .error-card {
      padding: 32px 24px;
    }
    
    .error-title {
      font-size: 22px;
    }
    
    .error-message {
      font-size: 14px;
    }
    
    .error-actions {
      flex-direction: column;
    }
    
    .btn {
      width: 100%;
      justify-content: center;
    }
  }
`;
