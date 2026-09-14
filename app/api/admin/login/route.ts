import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSession } from "@/lib/admin-session";
import { jsonBody } from "@/lib/validation";

export async function POST(request: Request) {
  const { password } = await jsonBody(request);
  const expectedPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "demo-admin");

  if (!expectedPassword || typeof password !== "string" || password !== expectedPassword) {
    return NextResponse.json({ message: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
