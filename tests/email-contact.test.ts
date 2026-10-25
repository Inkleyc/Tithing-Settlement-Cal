import { afterEach, describe, expect, it, vi } from "vitest";
const { sendMail, createTransport, getAdminContact } = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "local-test" });
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })), getAdminContact: vi.fn().mockResolvedValue({ name: "Colton", email: "secretary@example.test" }) };
});
vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("../lib/repository", () => ({ getRepository: () => ({ getAdminContact }) }));
import { sendEmail } from "../lib/email";
const message = { to: "member@example.test", subject: "Test", text: "Test", html: "<p>Test</p>" };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("contact reply address", () => {
  it("keeps the authenticated Gmail sender and uses the contact email for replies", async () => {
    vi.stubEnv("GMAIL_USER", "sender@example.test"); vi.stubEnv("GMAIL_APP_PASSWORD", "test-password");
    await sendEmail(message);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: "Ward Tithing Declaration <sender@example.test>", replyTo: "secretary@example.test" }));
  });
  it("uses the sending account for replies when contact email is blank", async () => {
    vi.stubEnv("GMAIL_USER", "sender@example.test"); vi.stubEnv("GMAIL_APP_PASSWORD", "test-password");
    getAdminContact.mockResolvedValueOnce({ name: "", email: "" });
    await sendEmail(message);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: "sender@example.test" }));
  });
  it("passes the contact reply address to Resend without changing its verified sender", async () => {
    vi.stubEnv("GMAIL_USER", ""); vi.stubEnv("GMAIL_APP_PASSWORD", ""); vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("RESEND_FROM_EMAIL", "Ward <sender@example.test>");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "test" }) });
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail(message);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.from).toBe("Ward <sender@example.test>");
    expect(body.reply_to).toBe("secretary@example.test");
  });
});
