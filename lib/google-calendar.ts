import "server-only";

import type { AdminSchedule } from "./repository";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const APP_MARKER = "tithing-settlement";
const TIME_ZONE = "America/Denver";

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

export type CalendarSyncResult = { created: number; updated: number; deleted: number; unchanged: number };

const configuration = () => ({
  clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() ?? "",
  clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() ?? "",
  refreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim() ?? "",
  calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || "primary",
});

export const isGoogleCalendarConfigured = () => {
  const config = configuration();
  return Boolean(config.clientId && config.clientSecret && config.refreshToken);
};

async function accessToken() {
  const config = configuration();
  if (!isGoogleCalendarConfigured()) throw new Error("Google Calendar is not configured yet.");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as { access_token?: string; error_description?: string } | null;
  if (!response.ok || !body?.access_token) throw new Error(body?.error_description || "Google rejected the calendar credentials.");
  return body.access_token;
}

async function calendarRequest(token: string, path: string, init?: RequestInit) {
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    cache: "no-store",
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(body?.error?.message || `Google Calendar request failed (${response.status}).`);
  return body;
}

function desiredEvents(schedule: AdminSchedule, wardName: string) {
  return schedule.flatMap(({ day, slots }) => slots.flatMap((slot) => {
    const appointment = slot.appointment;
    if (!appointment || appointment.timeSlotId !== slot.id) return [];
    const paired = appointment.pairedSlotId ? slots.find((candidate) => candidate.id === appointment.pairedSlotId) : undefined;
    const event: GoogleEvent = {
      summary: `${wardName ? `${wardName} ` : ""}Tithing declaration — ${appointment.memberName}`,
      description: `Tithing declaration appointment for ${appointment.memberName}.\nPhone: ${appointment.phone}\nEmail: ${appointment.email}`,
      location: "Bishop's Office",
      start: { dateTime: `${day.date}T${slot.startTime}:00`, timeZone: TIME_ZONE },
      end: { dateTime: `${day.date}T${paired?.endTime ?? slot.endTime}:00`, timeZone: TIME_ZONE },
      extendedProperties: { private: { source: APP_MARKER, appointmentId: appointment.id } },
    };
    return [{ appointmentId: appointment.id, event }];
  }));
}

const eventMatches = (current: GoogleEvent, desired: GoogleEvent) =>
  current.summary === desired.summary && current.description === desired.description && current.location === desired.location &&
  current.start?.dateTime?.slice(0, 16) === desired.start?.dateTime?.slice(0, 16) &&
  current.end?.dateTime?.slice(0, 16) === desired.end?.dateTime?.slice(0, 16) && current.status !== "cancelled";

const eventIdentityMatches = (current: GoogleEvent, desired: GoogleEvent) =>
  current.summary === desired.summary && current.start?.dateTime?.slice(0, 16) === desired.start?.dateTime?.slice(0, 16) &&
  current.end?.dateTime?.slice(0, 16) === desired.end?.dateTime?.slice(0, 16) && current.status !== "cancelled";

async function listEvents(token: string, calendarId: string, managedOnly: boolean) {
  const events: GoogleEvent[] = [];
  let pageToken = "";
  do {
    const query = new URLSearchParams({ singleEvents: "true", showDeleted: "false", maxResults: "2500", timeMin: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString() });
    if (managedOnly) query.set("privateExtendedProperty", `source=${APP_MARKER}`);
    if (pageToken) query.set("pageToken", pageToken);
    const body = await calendarRequest(token, `/calendars/${encodeURIComponent(calendarId)}/events?${query}`) as { items?: GoogleEvent[]; nextPageToken?: string };
    events.push(...(body.items ?? []));
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return events;
}

export async function syncGoogleCalendar(schedule: AdminSchedule, wardName: string): Promise<CalendarSyncResult> {
  const config = configuration();
  const token = await accessToken();
  const desired = desiredEvents(schedule, wardName);
  const managed = await listEvents(token, config.calendarId, true);
  const managedByAppointment = new Map(managed.map((event) => [event.extendedProperties?.private?.appointmentId, event]));
  const desiredIds = new Set(desired.map((item) => item.appointmentId));
  const result: CalendarSyncResult = { created: 0, updated: 0, deleted: 0, unchanged: 0 };

  let allEvents: GoogleEvent[] | null = null;
  for (const item of desired) {
    let current = managedByAppointment.get(item.appointmentId);
    if (!current) {
      allEvents ??= await listEvents(token, config.calendarId, false);
      const candidates = allEvents.filter((event) => !event.extendedProperties?.private?.source && eventIdentityMatches(event, item.event));
      current = candidates.length === 1 ? candidates[0] : undefined;
    }
    if (!current?.id) {
      await calendarRequest(token, `/calendars/${encodeURIComponent(config.calendarId)}/events`, { method: "POST", body: JSON.stringify(item.event) });
      result.created += 1;
    } else if (!eventMatches(current, item.event) || current.extendedProperties?.private?.appointmentId !== item.appointmentId) {
      await calendarRequest(token, `/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(current.id)}`, { method: "PATCH", body: JSON.stringify(item.event) });
      result.updated += 1;
    } else result.unchanged += 1;
  }

  for (const event of managed) {
    const appointmentId = event.extendedProperties?.private?.appointmentId;
    if (!event.id || !appointmentId || desiredIds.has(appointmentId)) continue;
    const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
    if (end && end.getTime() <= Date.now()) continue;
    await calendarRequest(token, `/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(event.id)}`, { method: "DELETE" });
    result.deleted += 1;
  }
  return result;
}

