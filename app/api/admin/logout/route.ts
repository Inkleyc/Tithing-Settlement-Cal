import { PUBLIC_APP_URL } from "@/lib/public-links";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.redirect(new URL("/admin", PUBLIC_APP_URL));
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
