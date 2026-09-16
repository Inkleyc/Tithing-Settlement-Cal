"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Lock, MessageSquareText, PlusCircle, Printer, Shield, Trash2, X } from "lucide-react";
import type { DayRecord, PublicSlotView, AppointmentRecord } from "@/lib/mock-store";

type AdminSchedule = Array<{ day: DayRecord; slots: Array<PublicSlotView & { appointment?: AppointmentRecord }> }>;

const formatDate = (dateValue: string) => {
  const parsed = new Date(`${dateValue}T00:00:00`);
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (timeValue: string) => {
  const [hour, minute] = timeValue.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export function AdminDashboard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [activeTab, setActiveTab] = useState<"appointments" | "setup">("appointments");
  const [status, setStatus] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wardName, setWardName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [dayId, setDayId] = useState("");
  const [schedule, setSchedule] = useState<AdminSchedule>([]);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [walkInForm, setWalkInForm] = useState({ name: "", phone: "" });
  const [dayForm, setDayForm] = useState({ date: "", notes: "" });
  const [slotForm, setSlotForm] = useState({ startTime: "", endTime: "", isBuffer: false });
  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    startTime: "13:00",
    endTime: "17:00",
    intervalMinutes: 10,
    bufferEveryMinutes: 50,
    notes: "",
  });

  const mutate = async (body: object) => { const response = await fetch("/api/admin/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setSchedule(data.schedule); setWardName(data.wardName ?? ""); setAdminPhone(data.adminPhone ?? ""); return data.schedule as AdminSchedule; };
  useEffect(() => { if (!isAuthenticated) return; void fetch("/api/admin/schedule", { cache: "no-store" }).then((r) => r.json()).then((data) => { const initial=data.schedule?.[0]; setSchedule(data.schedule ?? []); setWardName(data.wardName ?? ""); setAdminPhone(data.adminPhone ?? ""); setDayId((value) => value || initial?.day.id || ""); if(initial)setDayForm({date:initial.day.date,notes:initial.day.notes}); }); }, [isAuthenticated]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setError("The password is incorrect.");
      return;
    }

    window.location.reload();
  };

  const handleGenerate = async () => {
    if (!scheduleForm.date) {
      setStatus("Please choose a date first.");
      return;
    }

    try {
    const next = await mutate({ action: "generate", ...scheduleForm });
    const created = next.find((item) => item.day.date === scheduleForm.date)!;
    setStatus(`Generated slots for ${formatDate(created.day.date)}.`); setDayId(created.day.id); setDayForm({date:created.day.date,notes:created.day.notes});
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "Unable to generate schedule.");
    }
  };

  const handleToggle = async (slotId: string) => {
    await mutate({ action: "toggle", slotId });
    setStatus("Slot toggled.");
  };

  const handleCancel = async (appointmentId: string) => {
    await mutate({ action: "cancel", appointmentId });
    setStatus("Appointment cancelled and slot released.");
  };

  const handleWalkInSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSlotId) return;

    await mutate({ action: "walk-in", slotId: selectedSlotId, name: walkInForm.name, phone: walkInForm.phone });
    setWalkInForm({ name: "", phone: "" });
    setSelectedSlotId(null);
    setIsWalkInOpen(false);
    setStatus("Walk-in appointment added.");
  };

  const handleWardName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await mutate({action:"ward-name",name:wardName}); setStatus("Ward name saved."); }
    catch(caught){setStatus(caught instanceof Error?caught.message:"Unable to save the ward name.");}
  };

  const handleAdminPhone = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await mutate({action:"admin-phone",phone:adminPhone}); setStatus("Executive Secretary phone saved."); }
    catch(caught){setStatus(caught instanceof Error?caught.message:"Unable to save the phone number.");}
  };

  const handleEditDay = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await mutate({ action: "edit-day", dayId, ...dayForm }); setStatus("Declaration day updated."); }
    catch (caught) { setStatus(caught instanceof Error ? caught.message : "Unable to update the day."); }
  };

  const handleAddSlot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await mutate({ action: "add-slot", dayId, ...slotForm }); setSlotForm({ startTime: "", endTime: "", isBuffer: false }); setStatus("Time slot added."); }
    catch (caught) { setStatus(caught instanceof Error ? caught.message : "Unable to add the slot."); }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm("Delete this time from the schedule?")) return;
    setStatus("Deleting time...");
    try { await mutate({ action: "delete-slot", slotId }); setStatus("Time slot deleted."); }
    catch (caught) { setStatus(caught instanceof Error ? caught.message : "Unable to delete the slot."); }
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3 text-slate-900">
          <Shield className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Admin access</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              placeholder="Enter admin password"
            />
          </label>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button type="submit" className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">
            Unlock dashboard
          </button>
        </form>
      </div>
    );
  }

  const selectedDay = schedule.find((item) => item.day.id === dayId) ?? schedule[0];
  const daySlots = selectedDay ? selectedDay.slots : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Admin dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Ward declaration schedule</h1>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "appointments" && <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
            <Printer className="h-4 w-4" />
            Print selected day
          </button>}
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              Log out
            </button>
          </form>
        </div>
      </div>

      <div role="tablist" aria-label="Admin sections" className="mb-6 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button role="tab" aria-selected={activeTab === "appointments"} type="button" onClick={() => setActiveTab("appointments")} className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === "appointments" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Appointments</button>
        <button role="tab" aria-selected={activeTab === "setup"} type="button" onClick={() => setActiveTab("setup")} className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${activeTab === "setup" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Schedule setup</button>
      </div>

      <div className={`grid gap-6 ${activeTab === "setup" ? "lg:grid-cols-[380px_minmax(0,1fr)]" : ""}`}>
        {activeTab === "setup" && <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleWardName} className="mb-6 border-b border-slate-200 pb-6">
            <label className="block text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Ward name<input required maxLength={150} value={wardName} onChange={(event)=>setWardName(event.target.value)} placeholder="Example 3rd Ward" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base font-normal normal-case tracking-normal text-slate-900" /></label>
            <button type="submit" className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Save ward name</button>
          </form>
          <form onSubmit={handleAdminPhone} className="mb-6 border-b border-slate-200 pb-6">
            <label className="block text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Executive Secretary phone<input required maxLength={25} value={adminPhone} onChange={(event)=>setAdminPhone(event.target.value)} placeholder="(801) 555-1234" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base font-normal normal-case tracking-normal text-slate-900" /></label>
            <button type="submit" className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800">Save phone number</button>
          </form>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            <CalendarClock className="h-4 w-4" />
            Generate schedule
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Date
              <input type="date" value={scheduleForm.date} onChange={(event) => setScheduleForm((current) => ({ ...current, date: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Start time
                <input type="time" value={scheduleForm.startTime} onChange={(event) => setScheduleForm((current) => ({ ...current, startTime: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                End time
                <input type="time" value={scheduleForm.endTime} onChange={(event) => setScheduleForm((current) => ({ ...current, endTime: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Interval (min)
                <input type="number" min={5} max={60} step={5} value={scheduleForm.intervalMinutes} onChange={(event) => setScheduleForm((current) => ({ ...current, intervalMinutes: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Buffer every (min)
                <input type="number" min={10} max={180} step={10} value={scheduleForm.bufferEveryMinutes} onChange={(event) => setScheduleForm((current) => ({ ...current, bufferEveryMinutes: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Notes
              <input type="text" value={scheduleForm.notes} onChange={(event) => setScheduleForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Sunday Block 1" />
            </label>

            <button type="button" onClick={handleGenerate} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700">
              <PlusCircle className="h-4 w-4" />
              Generate slots
            </button>

            {status && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</p>}
          </div>
        </aside>}

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Current date</p>
              <h2 className="text-2xl font-bold text-slate-900">{selectedDay ? formatDate(selectedDay.day.date) : "No dates"}</h2>
            </div>
            <div className="flex gap-2">
              {schedule.map((item) => (
                <button key={item.day.id} type="button" onClick={() => { setDayId(item.day.id); setDayForm({date:item.day.date,notes:item.day.notes}); }} className={[
                  "rounded-xl border px-3 py-2 text-sm font-medium",
                  item.day.id === dayId ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700",
                ].join(" ")}>
                  {formatDate(item.day.date)}
                </button>
              ))}
            </div>
          </div>

          {status && <p role="status" className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</p>}

          {activeTab === "setup" && selectedDay && (
            <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-2">
              <form onSubmit={handleEditDay} className="space-y-3">
                <h3 className="font-semibold text-slate-900">Edit selected day</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">Date<input required type="date" value={dayForm.date} onChange={(event)=>setDayForm((current)=>({...current,date:event.target.value}))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
                  <label className="text-sm font-medium text-slate-700">Notes<input value={dayForm.notes} maxLength={255} onChange={(event)=>setDayForm((current)=>({...current,notes:event.target.value}))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
                </div>
                <button type="submit" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Save day</button>
              </form>
              <form onSubmit={handleAddSlot} className="space-y-3">
                <h3 className="font-semibold text-slate-900">Add one time slot</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">Start<input required type="time" value={slotForm.startTime} onChange={(event)=>setSlotForm((current)=>({...current,startTime:event.target.value}))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
                  <label className="text-sm font-medium text-slate-700">End<input required type="time" value={slotForm.endTime} onChange={(event)=>setSlotForm((current)=>({...current,endTime:event.target.value}))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={slotForm.isBuffer} onChange={(event)=>setSlotForm((current)=>({...current,isBuffer:event.target.checked}))} />Buffer / catch-up time</label>
                <button type="submit" className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Add time</button>
              </form>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {daySlots.map((slot) => {
              const appointment = slot.appointment;
              if (appointment?.pairedSlotId === slot.id && appointment.timeSlotId !== slot.id) return null;
              const pairedSlot = appointment?.pairedSlotId ? daySlots.find((item) => item.id === appointment.pairedSlotId) : undefined;
              const reserved = slot.isReserved || Boolean(appointment);
              const appointmentTime = pairedSlot ? `${formatTime(slot.startTime)} – ${formatTime(pairedSlot.endTime)}` : formatTime(slot.startTime);

              return (
                <div key={slot.id} className={[
                  "rounded-2xl border p-4",
                  pairedSlot ? "sm:col-span-2" : "",
                  slot.isBlocked ? "border-red-200 bg-red-50" : slot.isBuffer ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50",
                ].join(" ")}>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <span>{slot.isBuffer ? "Buffer" : slot.isBlocked ? "Blocked" : reserved ? "Reserved" : "Open"}</span>
                    {activeTab === "setup" && <button type="button" onClick={() => handleToggle(slot.id)} className="text-slate-700 underline">
                      {slot.isBlocked ? "Unblock" : "Block"}
                    </button>}
                  </div>
                  <p className="mt-3 text-xl font-bold text-slate-900">{slot.isBuffer || slot.isBlocked ? "—" : appointmentTime}</p>

                  {appointment && (
                    <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{appointment.memberName}</p>
                      {pairedSlot && <p className="font-medium text-emerald-700">20-minute appointment</p>}
                      <p>{appointment.phone}</p>
                      <p>{appointment.email}</p>
                      {activeTab === "appointments" && <div className="mt-3 flex flex-wrap gap-2">
                        <a href={`sms:${appointment.phone}?body=${encodeURIComponent(`Hi ${appointment.memberName.split(" ")[0]}, this is the ward executive secretary reminding you of your tithing declaration with the Bishop tomorrow at ${formatTime(slot.startTime)} in the Bishop's office.`)}`} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white">
                          <MessageSquareText className="h-3.5 w-3.5" />
                          Text Reminder
                        </a>
                        <button type="button" onClick={() => handleCancel(appointment.id)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700">
                          <Trash2 className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </div>}
                    </div>
                  )}

                  {activeTab === "appointments" && !appointment && !slot.isBuffer && !slot.isBlocked && (
                    <button type="button" onClick={() => { setSelectedSlotId(slot.id); setIsWalkInOpen(true); }} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add walk-in
                    </button>
                  )}
                  {activeTab === "setup" && !appointment && (
                    <button type="button" onClick={() => handleDeleteSlot(slot.id)} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700"><Trash2 className="h-3.5 w-3.5" />Delete time</button>
                  )}
                </div>
              );
            })}
          </div>

          {activeTab === "appointments" && <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-4 print-area">
            <div className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Lock className="h-4 w-4" />
              Master schedule
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="mb-4 hidden print:block print:text-black">
                <h1 className="text-2xl font-bold">Tithing declaration roster</h1>
                <p className="mt-1 text-lg">{selectedDay ? formatDate(selectedDay.day.date) : "Selected day"}</p>
                {selectedDay?.day.notes && <p className="text-sm">{selectedDay.day.notes}</p>}
              </div>
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Time</th>
                    <th className="px-3 py-2 font-semibold">Member</th>
                    <th className="print-private px-3 py-2 font-semibold">Phone</th>
                    <th className="print-private px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {selectedDay?.slots.filter((slot) => !slot.appointment?.pairedSlotId || slot.appointment.timeSlotId === slot.id).map((slot) => (
                      <tr key={`${selectedDay.day.id}-${slot.id}`}>
                        <td className="px-3 py-2">{slot.isBuffer ? "Buffer" : slot.appointment?.pairedSlotId ? `${formatTime(slot.startTime)} – ${formatTime(selectedDay.slots.find((item) => item.id === slot.appointment?.pairedSlotId)?.endTime ?? slot.endTime)}` : formatTime(slot.startTime)}</td>
                        <td className="px-3 py-2">{slot.appointment?.memberName ?? "—"}</td>
                        <td className="print-private px-3 py-2">{slot.appointment?.phone ?? "—"}</td>
                        <td className="print-private px-3 py-2">{slot.appointment?.email ?? "—"}</td>
                        <td className="px-3 py-2">
                          {slot.appointment ? (slot.appointment.status === "confirmed" ? "Confirmed" : "Cancelled") : slot.isBlocked ? "Blocked" : slot.isBuffer ? "Buffer" : "Open"}
                        </td>
                        <td className="px-3 py-2">
                          {slot.appointment ? (
                            <button type="button" onClick={() => handleCancel(slot.appointment!.id)} className="text-red-700 underline">Cancel</button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>}
        </div>
      </div>

      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Add walk-in</h3>
              <button type="button" onClick={() => setIsWalkInOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Member name
                <input value={walkInForm.name} onChange={(event) => setWalkInForm((current) => ({ ...current, name: event.target.value }))} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Phone
                <input value={walkInForm.phone} onChange={(event) => setWalkInForm((current) => ({ ...current, phone: event.target.value }))} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </label>
              <button type="submit" className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Add appointment</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
