"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRightLeft, CalendarRange, Clock3, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AppointmentRecord } from "@/lib/mock-store";

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
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export function RescheduleClient({ token }: { token: string }) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentRecord>();
  const [currentSlot, setCurrentSlot] = useState<{ dayDate: string; startTime: string; endTime: string }>();
  const [availableSlots, setAvailableSlots] = useState<Array<{ id: string; dayDate: string; startTime: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [adminPhone, setAdminPhone] = useState("");
  const [selectedDayDate, setSelectedDayDate] = useState("");
  const [submittingSlotId, setSubmittingSlotId] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/reschedule?token=${encodeURIComponent(token)}`, { cache: "no-store" }).then(async (response) => ({ ok: response.ok, data: await response.json() })).then(({ ok, data }) => {
      if (ok) { setAppointment(data.appointment); setCurrentSlot(data.currentSlot); setAvailableSlots(data.availableSlots); setSelectedDayDate(data.availableSlots[0]?.dayDate ?? ""); setAdminPhone(data.adminPhone ?? ""); } setLoading(false);
    });
  }, [token]);

  if (loading) return <div className="mx-auto max-w-xl p-8 text-center">Loading appointment…</div>;

  if (!appointment) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">This reschedule link is invalid</h1>
        <p className="mt-3 text-slate-600">The appointment could not be found or is no longer available. Please contact the Executive Secretary for assistance.</p>
      </div>
    );
  }

  const handleReschedule = async (slotId: string) => {
    try {
      setSubmittingSlotId(slotId);
      setNotice(null);
      const response = await fetch("/api/reschedule", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, slotId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      router.push(`/reschedule/confirmation?token=${encodeURIComponent(token)}&email=${data.emailDelivered === false ? "unavailable" : "sent"}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to change this appointment.");
      setSubmittingSlotId(null);
    }
  };

  const availableDays = Array.from(new Set(availableSlots.map((slot) => slot.dayDate))).sort();
  const selectedDaySlots = availableSlots.filter((slot) => slot.dayDate === selectedDayDate);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          <ArrowRightLeft className="h-4 w-4" />
          Reschedule appointment
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">Current appointment</p>
            <div className="mt-3 space-y-2 text-slate-800">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-slate-500" />
                {appointment.memberName}
              </div>
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-slate-500" />
                {currentSlot ? formatDate(currentSlot.dayDate) : "Unavailable"}
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-slate-500" />
                {currentSlot ? `${formatTime(currentSlot.startTime)}–${formatTime(currentSlot.endTime)}` : "Unavailable"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Need to cancel completely?</p>
            <p className="mt-2">Please call or text the Executive Secretary directly{adminPhone ? <> at <a className="font-semibold underline" href={`tel:${adminPhone}`}>{adminPhone}</a></> : " for assistance"}.</p>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Choose a new open time</h2>
        {availableDays.length ? <>
          <label className="mt-5 block text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Choose a date
            <select value={selectedDayDate} onChange={(event)=>setSelectedDayDate(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-medium normal-case tracking-normal text-slate-900">
              {availableDays.map((dayDate)=><option key={dayDate} value={dayDate}>{formatDate(dayDate)} — {availableSlots.filter((slot)=>slot.dayDate===dayDate).length} open</option>)}
            </select>
          </label>
          <div className="mx-auto mt-5 flex max-w-xl flex-col gap-2">
          {selectedDaySlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              disabled={submittingSlotId !== null}
              onClick={() => handleReschedule(slot.id)}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
            >
              <p className="text-xl font-bold text-slate-900">{formatTime(slot.startTime)}</p>
              <p className="mt-1 text-sm font-medium text-emerald-700">{submittingSlotId===slot.id?"Updating appointment…":"Open"}</p>
            </button>
          ))}
          </div>
        </>:<p className="mt-5 rounded-2xl bg-slate-50 p-4 text-slate-600">There are no other open times right now. Please contact the Executive Secretary for assistance.</p>}
      </div>
    </div>
  );
}
