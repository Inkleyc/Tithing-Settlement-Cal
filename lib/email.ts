import "server-only";
import nodemailer from "nodemailer";
import { getRepository } from "./repository";

export type EmailPayload = { to: string; subject: string; html: string; text: string };
export type EmailResult = { id: string; transport: "gmail" | "resend" | "console" };

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const { email: contactEmail } = await getRepository().getAdminContact();
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailAppPassword) {
    const transport = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailAppPassword.replace(/\s/g, "") } });
    const result = await transport.sendMail({ from: `Ward Tithing Declaration <${gmailUser}>`, replyTo: contactEmail || gmailUser, ...payload });
    return { id: result.messageId, transport: "gmail" };
  }

  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, ...(contactEmail ? { reply_to: contactEmail } : {}), ...payload }) });
    if (!response.ok) throw new Error(`Email delivery failed (${response.status}).`);
    const result = await response.json() as { id: string };
    return { id: result.id, transport: "resend" };
  }

  console.log(`[Console Email] ${new Date().toISOString()}\n${JSON.stringify(payload, null, 2)}`);
  return { id: `console-email-${Date.now()}`, transport: "console" };
}
