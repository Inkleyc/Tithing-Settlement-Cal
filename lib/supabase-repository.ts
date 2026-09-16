import "server-only";

import { createSupabaseAdminClient } from "./supabase";
import type { ScheduleRepository } from "./repository";
import type { AppointmentRecord, DayRecord, PublicSlotView, TimeSlotRecord } from "./mock-store";

type Row = Record<string, unknown>;
const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
const day = (row: Row): DayRecord => ({ id: String(row.id), date: String(row.date), isActive: Boolean(row.is_active), notes: String(row.notes ?? "") });
const slot = (row: Row): TimeSlotRecord => ({ id: String(row.id), dayId: String(row.day_id), startTime: String(row.start_time).slice(0, 5), endTime: String(row.end_time).slice(0, 5), isBuffer: Boolean(row.is_buffer), isBlocked: Boolean(row.is_blocked), createdAt: String(row.created_at) });
const appointment = (row: Row): AppointmentRecord => ({ id: String(row.id), timeSlotId: String(row.time_slot_id), pairedSlotId: row.paired_slot_id ? String(row.paired_slot_id) : null, memberName: String(row.member_name), email: String(row.email), phone: String(row.phone), isLargeFamily: Boolean(row.is_large_family), rescheduleToken: String(row.reschedule_token), status: row.status as AppointmentRecord["status"], reminderEmailSent: Boolean(row.reminder_email_sent), createdAt: String(row.created_at), updatedAt: String(row.updated_at) });

async function activeDays() {
  const result = await createSupabaseAdminClient().from("days").select("*").eq("is_active", true).order("date");
  fail(result.error); return (result.data ?? []).map((row) => day(row as Row));
}

async function slotsForDay(dayId: string): Promise<PublicSlotView[]> {
  const client = createSupabaseAdminClient();
  const [slots, appointments] = await Promise.all([
    client.from("time_slots").select("*").eq("day_id", dayId).order("start_time"),
    client.from("appointments").select("id,time_slot_id,paired_slot_id").eq("status", "confirmed"),
  ]);
  fail(slots.error); fail(appointments.error);
  const owners = new Map<string, string>();
  for (const value of appointments.data ?? []) { owners.set(value.time_slot_id, value.id); if (value.paired_slot_id) owners.set(value.paired_slot_id, value.id); }
  return (slots.data ?? []).map((row) => { const value = slot(row as Row); const appointmentId = owners.get(value.id); return { ...value, isReserved: Boolean(appointmentId), ...(appointmentId ? { appointmentId } : {}) }; });
}

async function byToken(token: string) {
  const result = await createSupabaseAdminClient().from("appointments").select("*").eq("reschedule_token", token).eq("status", "confirmed").maybeSingle();
  fail(result.error); return result.data ? appointment(result.data as Row) : undefined;
}

export const supabaseRepository: ScheduleRepository = {
  async getWardName(){const result=await createSupabaseAdminClient().from("app_settings").select("ward_name").eq("id",true).maybeSingle();if(result.error?.code==="PGRST205")return "";fail(result.error);return String(result.data?.ward_name??"");},
  async updateWardName(name){const result=await createSupabaseAdminClient().from("app_settings").upsert({id:true,ward_name:name,updated_at:new Date().toISOString()}).select("ward_name").single();fail(result.error);return String(result.data?.ward_name??name);},
  async getAdminPhone(){const result=await createSupabaseAdminClient().from("app_settings").select("executive_secretary_phone").eq("id",true).maybeSingle();fail(result.error);return String(result.data?.executive_secretary_phone??"");},
  async updateAdminPhone(phone){const result=await createSupabaseAdminClient().from("app_settings").update({executive_secretary_phone:phone,updated_at:new Date().toISOString()}).eq("id",true).select("executive_secretary_phone").single();fail(result.error);return String(result.data?.executive_secretary_phone??phone);},
  getDays: activeDays,
  getSlotsForDay: slotsForDay,
  async getAllPublicSlots() { const days = await activeDays(); return (await Promise.all(days.map(async (value) => (await slotsForDay(value.id)).map((item) => ({ ...item, dayDate: value.date }))))).flat(); },
  getAppointmentByToken: byToken,
  async getAppointmentSlot(value) { const result = await createSupabaseAdminClient().from("time_slots").select("*, days!inner(date)").eq("id", value.timeSlotId).maybeSingle(); fail(result.error); if (!result.data) return undefined; return { ...slot(result.data as Row), dayDate: String((result.data.days as { date: string }).date) }; },
  async getAdminSchedule() {
    const days = await activeDays();
    const result = await createSupabaseAdminClient().from("appointments").select("*").eq("status", "confirmed"); fail(result.error);
    const appointments = (result.data ?? []).map((row) => appointment(row as Row));
    return Promise.all(days.map(async (value) => ({ day: value, slots: (await slotsForDay(value.id)).map((item) => ({ ...item, appointment: appointments.find((a) => a.timeSlotId === item.id || a.pairedSlotId === item.id) })) })));
  },
  async generateScheduleForDay(date, startTime, endTime, intervalMinutes, bufferEveryMinutes, notes = "Auto-generated") {
    const result = await createSupabaseAdminClient().rpc("generate_schedule", { p_date: date, p_start_time: startTime, p_end_time: endTime, p_interval_minutes: intervalMinutes, p_buffer_every_minutes: bufferEveryMinutes, p_notes: notes }); fail(result.error); return result.data;
  },
  async updateDay(id,date,notes){const result=await createSupabaseAdminClient().from("days").update({date,notes}).eq("id",id).select().maybeSingle();fail(result.error);if(!result.data)throw new Error("Declaration day not found.");return day(result.data as Row);},
  async deleteDay(id){
    const client=createSupabaseAdminClient();
    const slots=await client.from("time_slots").select("id").eq("day_id",id);
    fail(slots.error);
    const slotIds=(slots.data??[]).map((item)=>String(item.id));
    if(slotIds.length){
      const active=await client.from("appointments").select("id").eq("status","confirmed").or(`time_slot_id.in.(${slotIds.join(",")}),paired_slot_id.in.(${slotIds.join(",")})`).limit(1);
      fail(active.error);
      if(active.data?.length)throw new Error("Cancel all active appointments before deleting this day.");
      const history=await client.from("appointments").delete().or(`time_slot_id.in.(${slotIds.join(",")}),paired_slot_id.in.(${slotIds.join(",")})`);
      fail(history.error);
    }
    const result=await client.from("days").delete().eq("id",id).select("id").maybeSingle();
    fail(result.error);
    if(!result.data)throw new Error("Declaration day not found.");
  },
  async addTimeSlot(dayId,startTime,endTime,isBuffer){const result=await createSupabaseAdminClient().from("time_slots").insert({day_id:dayId,start_time:startTime,end_time:endTime,is_buffer:isBuffer}).select().single();fail(result.error);return slot(result.data as Row);},
  async deleteTimeSlot(id){
    const client=createSupabaseAdminClient();
    const active=await client.from("appointments").select("id").eq("status","confirmed").or(`time_slot_id.eq.${id},paired_slot_id.eq.${id}`).limit(1);
    fail(active.error);
    if(active.data?.length)throw new Error("Cancel the active appointment before deleting this time.");
    const history=await client.from("appointments").delete().eq("status","cancelled").or(`time_slot_id.eq.${id},paired_slot_id.eq.${id}`);
    fail(history.error);
    const result=await client.from("time_slots").delete().eq("id",id).select("id").maybeSingle();
    fail(result.error);
    if(!result.data)throw new Error("Time slot not found.");
  },
  async toggleSlotBlocked(id) { const client = createSupabaseAdminClient(); const [current, bookings] = await Promise.all([client.from("time_slots").select("is_blocked").eq("id", id).maybeSingle(), client.from("appointments").select("id").eq("status", "confirmed").or(`time_slot_id.eq.${id},paired_slot_id.eq.${id}`).limit(1)]); fail(current.error); fail(bookings.error); if (!current.data) throw new Error("Selected time slot no longer exists."); if (bookings.data?.length) throw new Error("A reserved slot cannot be blocked."); const result = await client.from("time_slots").update({ is_blocked: !current.data.is_blocked }).eq("id", id).select().single(); fail(result.error); return result.data; },
  async cancelAppointment(id) { const result = await createSupabaseAdminClient().from("appointments").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle(); fail(result.error); if (!result.data) throw new Error("Appointment not found."); return appointment(result.data as Row); },
  async createWalkInAppointment(slotId, memberName, phone) { return this.createReservation({ dayId: "", slotId, memberName, phone, email: "walk-in@ward.local", isLargeFamily: false }); },
  async createReservation(input) { const result = await createSupabaseAdminClient().rpc("book_appointment", { p_day_id: input.dayId || null, p_slot_id: input.slotId, p_member_name: input.memberName, p_email: input.email, p_phone: input.phone, p_is_large_family: input.isLargeFamily }); fail(result.error); return appointment(result.data as Row); },
  async rescheduleAppointment(token, newSlotId) { const result = await createSupabaseAdminClient().rpc("reschedule_appointment", { p_token: token, p_new_slot_id: newSlotId }); fail(result.error); return appointment(result.data as Row); },
  async getAppointmentsForDate(date) { const client=createSupabaseAdminClient(); const days=await client.from("days").select("id").eq("date",date); fail(days.error); const dayIds=(days.data??[]).map((value)=>value.id); if(!dayIds.length)return []; const slots=await client.from("time_slots").select("id").in("day_id",dayIds); fail(slots.error); const slotIds=(slots.data??[]).map((value)=>value.id); if(!slotIds.length)return []; const result=await client.from("appointments").select("*").eq("status","confirmed").eq("reminder_email_sent",false).in("time_slot_id",slotIds); fail(result.error); return (result.data??[]).map((row)=>appointment(row as Row)); },
  async markReminderSent(id) { const result = await createSupabaseAdminClient().from("appointments").update({ reminder_email_sent: true, updated_at: new Date().toISOString() }).eq("id", id); fail(result.error); },
};
