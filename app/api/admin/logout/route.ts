import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
