import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "ward-admin-session";

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "demo-admin";

export function createAdminSession(expiresAt = Date.now() + 8 * 60 * 60 * 1000) {
  const payload = String(expiresAt);
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSession(value?: string) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || Number(payload) <= Date.now()) return false;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
