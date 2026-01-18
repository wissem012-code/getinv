import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import type { Session } from "@shopify/shopify-api";
import prisma from "./db.server";

/**
 * Lazy Session Storage Wrapper
 * 
 * This wrapper defers the creation of PrismaSessionStorage until a session
 * operation is actually performed. This prevents the Prisma client from being
 * initialized at module load time, which would cause serverless function crashes
 * when DATABASE_URL is missing or invalid.
 * 
 * The PrismaSessionStorage is only created on first use of any session method.
 */
let prismaSessionStorage: PrismaSessionStorage | null = null;

function getSessionStorage(): PrismaSessionStorage {
  if (!prismaSessionStorage) {
    console.log("[SessionStorage] Initializing PrismaSessionStorage (lazy-loaded)...");
    prismaSessionStorage = new PrismaSessionStorage(prisma);
  }
  return prismaSessionStorage;
}

const lazySessionStorage = {
  async storeSession(session: Session): Promise<boolean> {
    return getSessionStorage().storeSession(session);
  },
  async loadSession(id: string): Promise<Session | undefined> {
    return getSessionStorage().loadSession(id);
  },
  async deleteSession(id: string): Promise<boolean> {
    return getSessionStorage().deleteSession(id);
  },
  async deleteSessions(ids: string[]): Promise<boolean> {
    return getSessionStorage().deleteSessions(ids);
  },
  async findSessionsByShop(shop: string): Promise<Session[]> {
    return getSessionStorage().findSessionsByShop(shop);
  },
};

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: lazySessionStorage,
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
