import { cookies } from "next/headers";
import { AdminDashboard } from "@/components/admin-dashboard";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);

  return <AdminDashboard isAuthenticated={isAuthenticated} />;
}
