import { describe, expect, it } from "vitest";
import { createAdminSession, verifyAdminSession } from "../lib/admin-session";

describe("admin sessions", () => {
  it("accepts an authentic unexpired session", () => expect(verifyAdminSession(createAdminSession())).toBe(true));
  it("rejects forged and expired sessions", () => {
    expect(verifyAdminSession(`${Date.now() + 10000}.forged`)).toBe(false);
    expect(verifyAdminSession(createAdminSession(Date.now() - 1))).toBe(false);
  });
});
