import { describe, expect, it } from "vitest";
import { email, phone, text } from "../lib/validation";
describe("server input validation", () => {
  it("normalizes valid values", () => { expect(text("  Ward Member  ", "Name", 150)).toBe("Ward Member"); expect(email(" PERSON@EXAMPLE.COM ")).toBe("person@example.com"); expect(phone("(801) 555-0100")).toBe("(801) 555-0100"); });
  it("rejects malformed and oversized values", () => { expect(() => email("not-an-email")).toThrow(/valid email/); expect(() => phone("call-me")).toThrow(/valid phone/); expect(() => text("x".repeat(151), "Name", 150)).toThrow(/too long/); });
});
