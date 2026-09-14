import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";
export async function requireAdmin() {
  if (!verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) throw new Error("Unauthorized");
}
