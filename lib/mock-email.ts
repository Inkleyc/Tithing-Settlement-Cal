export type MockEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMockEmail(payload: MockEmailPayload) {
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, ...payload }),
    });
    if (!response.ok) throw new Error(`Email delivery failed (${response.status}).`);
    return { ...(await response.json()), status: "sent" };
  }
  const timestamp = new Date().toISOString();

  console.log(`[Mock Resend Email] ${timestamp}`);
  console.log(JSON.stringify(payload, null, 2));

  return {
    id: `mock-email-${Date.now()}`,
    status: "queued",
  };
}
