// The ward's stable, publicly accessible production origin. Keep this shared by
// server emails and browser sharing; never derive member links from a request,
// preview deployment, or environment variable. Update here if the domain changes.
export const PUBLIC_APP_URL = "https://tithing-settlement-cal.vercel.app";

export function rescheduleUrl(token: string): string {
  const url = new URL("/reschedule", PUBLIC_APP_URL);
  url.searchParams.set("token", token);
  return url.toString();
}
