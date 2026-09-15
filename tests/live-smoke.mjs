import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => { const separator = line.indexOf("="); return [line.slice(0, separator), line.slice(separator + 1)]; }));
const base = process.env.APP_URL || "http://localhost:3010";
const marker = `Automated acceptance test ${Date.now()}`;
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const createdDayIds = [];
let cookie = "";
let originalWardName;

const request = async (path, options = {}, expected = 200) => {
  const response = await fetch(`${base}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
  const body = await response.json();
  if (response.status !== expected) throw new Error(`${options.method || "GET"} ${path}: expected ${expected}, received ${response.status}: ${JSON.stringify(body)}`);
  return { response, body };
};
const postAdmin = (body, expected = 200) => request("/api/admin/schedule", { method: "POST", body: JSON.stringify(body) }, expected);
const openSlots = (schedule, dayId) => schedule.slots[dayId].filter((slot) => !slot.isReserved && !slot.isBuffer && !slot.isBlocked);

try {
  const settings = await db.from("app_settings").select("ward_name").eq("id", true).single();
  if (settings.error) throw settings.error;
  originalWardName = settings.data.ward_name;
  await request("/api/admin/schedule", {}, 401);
  const login = await request("/api/admin/login", { method: "POST", body: JSON.stringify({ password: env.ADMIN_PASSWORD }) });
  cookie = login.response.headers.get("set-cookie")?.split(";", 1)[0] || "";
  if (!cookie) throw new Error("Admin login did not set a session cookie.");
  const testWardName = `Acceptance Test Ward ${Date.now()}`;
  await postAdmin({ action: "ward-name", name: testWardName });
  const publicSettings = (await request("/api/schedule")).body;
  if (publicSettings.wardName !== testWardName) throw new Error("Ward name was not returned by the public schedule API.");

  const dates = ["2098-10-17", "2098-10-18"];
  for (const [index, date] of dates.entries()) {
    const generated = await postAdmin({ action: "generate", date, startTime: "09:00", endTime: "11:00", intervalMinutes: 10, bufferEveryMinutes: 50, notes: `${marker} ${index + 1}` });
    const day = generated.body.schedule.find((entry) => entry.day.date === date)?.day;
    if (!day) throw new Error("Generated day was not returned by the admin API.");
    createdDayIds.push(day.id);
  }

  await postAdmin({ action: "edit-day", dayId: createdDayIds[0], date: dates[0], notes: `${marker} edited` });
  let editedSchedule = (await postAdmin({ action: "add-slot", dayId: createdDayIds[0], startTime: "11:10", endTime: "11:20", isBuffer: false })).body.schedule;
  const addedSlot = editedSchedule.find((entry) => entry.day.id === createdDayIds[0]).slots.find((slot) => slot.startTime === "11:10");
  if (!addedSlot) throw new Error("Individually added time slot was not returned.");
  editedSchedule = (await postAdmin({ action: "delete-slot", slotId: addedSlot.id })).body.schedule;
  if (editedSchedule.find((entry) => entry.day.id === createdDayIds[0]).slots.some((slot) => slot.id === addedSlot.id)) throw new Error("Deleted time slot is still present.");

  let schedule = (await request("/api/schedule")).body;
  const firstDay = createdDayIds[0], secondDay = createdDayIds[1];
  const first = openSlots(schedule, firstDay)[0];
  const normal = (await request("/api/appointments", { method: "POST", body: JSON.stringify({ dayId: firstDay, slotId: first.id, memberName: "Acceptance Test", email: "acceptance@example.com", phone: "801-555-0100", isLargeFamily: false }) })).body.appointment;
  await request("/api/appointments", { method: "POST", body: JSON.stringify({ dayId: firstDay, slotId: first.id, memberName: "Double Book", email: "double@example.com", phone: "801-555-0101", isLargeFamily: false }) }, 400);

  schedule = (await request("/api/schedule")).body;
  const candidates = openSlots(schedule, firstDay);
  const largeStart = candidates.find((slot) => candidates.some((next) => next.startTime === slot.endTime));
  if (!largeStart) throw new Error("No consecutive slots available for large-family test.");
  const large = (await request("/api/appointments", { method: "POST", body: JSON.stringify({ dayId: firstDay, slotId: largeStart.id, memberName: "Large Acceptance Family", email: "large@example.com", phone: "801-555-0102", isLargeFamily: true }) })).body.appointment;
  if (!large.pairedSlotId) throw new Error("Large-family booking did not reserve a paired slot.");

  const target = openSlots((await request("/api/schedule")).body, secondDay)[0];
  const moved = (await request("/api/reschedule", { method: "PATCH", body: JSON.stringify({ token: normal.rescheduleToken, slotId: target.id }) })).body.appointment;
  if (moved.timeSlotId !== target.id) throw new Error("Reschedule did not move the appointment.");

  const toggleTarget = openSlots((await request("/api/schedule")).body, secondDay).find((slot) => slot.id !== target.id);
  await postAdmin({ action: "toggle", slotId: toggleTarget.id });
  schedule = (await request("/api/schedule")).body;
  if (!schedule.slots[secondDay].find((slot) => slot.id === toggleTarget.id)?.isBlocked) throw new Error("Blocked slot was not reflected publicly.");
  await postAdmin({ action: "toggle", slotId: toggleTarget.id });

  const walkSlot = openSlots((await request("/api/schedule")).body, secondDay).find((slot) => slot.id !== target.id && slot.id !== toggleTarget.id);
  const walk = (await postAdmin({ action: "walk-in", slotId: walkSlot.id, name: "Walk In Test", phone: "801-555-0103" })).body.schedule.flatMap((entry) => entry.slots).find((slot) => slot.id === walkSlot.id).appointment;
  await postAdmin({ action: "cancel", appointmentId: walk.id });
  schedule = (await request("/api/schedule")).body;
  if (schedule.slots[secondDay].find((slot) => slot.id === walkSlot.id)?.isReserved) throw new Error("Cancellation did not release the slot.");

  await postAdmin({ action: "cancel", appointmentId: normal.id });
  await postAdmin({ action: "cancel", appointmentId: large.id });
  await request("/api/cron/reminders", {}, 401);
  await request("/api/cron/reminders", { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
  console.log("Live acceptance test passed.");
} finally {
  if (originalWardName !== undefined) {
    const restoreSettings = await db.from("app_settings").update({ ward_name: originalWardName }).eq("id", true);
    if (restoreSettings.error) throw restoreSettings.error;
  }
  if (createdDayIds.length) {
    const slots = await db.from("time_slots").select("id").in("day_id", createdDayIds);
    if (slots.error) throw slots.error;
    const slotIds = (slots.data ?? []).map((slot) => slot.id);
    if (slotIds.length) {
      const appointments = await db.from("appointments").delete().in("time_slot_id", slotIds);
      if (appointments.error) throw appointments.error;
    }
    const cleanup = await db.from("days").delete().in("id", createdDayIds);
    if (cleanup.error) throw cleanup.error;
  }
}
