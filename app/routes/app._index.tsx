import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Logged-in Shopify Admin session (this proves the merchant opened the app)
  const { session } = await authenticate.admin(request);

  // This is the most useful "ID" inside Shopify:
  const shopDomain = session.shop; // e.g. getinv.myshopify.com

  // Safe to show (NOT secret)
  const clientId = process.env.SHOPIFY_API_KEY || "";

  return json({
    shopDomain,
    clientId,
    externalUrl: "https://getinv.app/",
  });
}

export default function AppIndex() {
  const { shopDomain, clientId, externalUrl } = useLoaderData() as {
    shopDomain: string;
    clientId: string;
    externalUrl: string;
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ margin: "0 0 8px" }}>Welcome to GetInv</h1>
      <p style={{ margin: "0 0 16px", opacity: 0.8 }}>
        Open GetInv to manage inventory sync.
      </p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
          background: "#fafafa",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Shop Domain</div>
        <div style={{ fontWeight: 700, fontSize: 14, wordBreak: "break-all" }}>{shopDomain}</div>

        <div style={{ height: 10 }} />

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Shopify App Client ID</div>
        <div style={{ fontWeight: 700, fontSize: 14, wordBreak: "break-all" }}>{clientId || "—"}</div>

        <div style={{ height: 12 }} />

        <button
          onClick={() => navigator.clipboard.writeText(shopDomain)}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
            background: "white",
            marginRight: 8,
          }}
        >
          Copy shop domain
        </button>

        <button
          onClick={() => (window.location.href = externalUrl)}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #111",
            cursor: "pointer",
            background: "#111",
            color: "white",
          }}
        >
          Open GetInv
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        If the page below doesn’t load, it’s because the website blocks being shown inside Shopify (security setting).
        Use the “Open GetInv” button above.
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
        <iframe
          src={externalUrl}
          title="GetInv"
          style={{ width: "100%", height: "75vh", border: 0 }}
        />
      </div>
    </div>
  );
}
