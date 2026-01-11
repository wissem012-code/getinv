import { SignJWT } from "jose";

export async function signAppJwt(input: { userId: string; role: "admin" | "super_admin" }) {
  const secretStr = process.env.APP_JWT_SECRET;
  if (!secretStr) throw new Error("Missing APP_JWT_SECRET env var");

  const secret = new TextEncoder().encode(secretStr);

  // Match your app: HS256, payload { userId, role }, 7 days expiry
  const jwt = await new SignJWT({ userId: input.userId, role: input.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return jwt;
}
