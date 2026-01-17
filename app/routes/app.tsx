import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
  } catch (authError) {
    // If authentication fails due to database error, let it bubble up
    // but provide better error context
    const errorMessage = authError instanceof Error ? authError.message : String(authError);
    
    if (errorMessage.includes("DATABASE_URL") || errorMessage.includes("Can't reach database server") || errorMessage.includes("P1001")) {
      console.error(`[app.tsx] Database connection error during authentication:`, authError);
      // Throw a Response object so React Router can handle it properly
      throw new Response(
        JSON.stringify({
          error: "Database connection failed",
          message: "The app cannot connect to the database. Please set DATABASE_URL in Vercel environment variables.",
          type: "database",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Re-throw other authentication errors
    throw authError;
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
