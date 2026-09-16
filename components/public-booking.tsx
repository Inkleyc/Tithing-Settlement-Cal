"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, Check, CheckCircle2, ChevronDown, Clock3, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { availableBookingStarts } from "@/lib/availability";
import type { DayRecord, PublicSlotView } from "@/lib/mock-store";

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

export function PublicBooking() {
  const [wardName, setWardName] = useState("");
  const [days, setDays] = useState<DayRecord[]>([]);
  const [slotsByDay, setSlotsByDay] = useState<Record<string, PublicSlotView[]>>({});
  const [selectedDayId, setSelectedDayId] = useState("");
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    memberName: "",
    email: "",
    phone: "",
    isLargeFamily: false,
  });
  const [success, setSuccess] = useState<null | {
    name: string;
    date: string;
    time: string;
    token: string;
    emailDelivered: boolean;
  }>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = async () => {
    const response = await fetch("/api/schedule", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(data?.message ?? "The schedule could not be loaded. Please refresh the page.");
    setWardName(data.wardName ?? "");
    setDays(data.days);
    setSlotsByDay(data.slots);
    setSelectedDayId((current) => current || data.days[0]?.id || "");
  };
  useEffect(() => {
    void fetch("/api/schedule", { cache: "no-store" }).then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) throw new Error(data?.message ?? "The schedule could not be loaded. Please refresh the page.");
      setWardName(data.wardName ?? ""); setDays(data.days); setSlotsByDay(data.slots); setSelectedDayId(data.days[0]?.id || "");
    }).catch((caught) => setError(caught instanceof Error ? caught.message : "The schedule could not be loaded."));
  }, []);
  useEffect(() => {
    if (!isDateMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => { if (!dateMenuRef.current?.contains(event.target as Node)) setIsDateMenuOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setIsDateMenuOpen(false); };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, [isDateMenuOpen]);

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? days[0];
  const slots = selectedDay ? slotsByDay[selectedDay.id] ?? [] : [];
  const availableStartsFor = (dayId: string) => availableBookingStarts(slotsByDay[dayId] ?? [], form.isLargeFamily);
  const openCountFor = (dayId: string) => availableStartsFor(dayId).length;

  const handleOpenBooking = (slotId: string) => {
    if (selectedDay) {
      setSelectedSlotId(slotId);
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDay || !selectedSlotId) return;

    try {
    const response = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      dayId: selectedDay.id,
      slotId: selectedSlotId,
      memberName: form.memberName,
      email: form.email,
      phone: form.phone,
      isLargeFamily: form.isLargeFamily,
    }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message);
    const appointment = payload.appointment;

    const slot = slots.find((item) => item.id === selectedSlotId);
    const pairedSlot = form.isLargeFamily ? slots.find((item) => item.startTime === slot?.endTime) : undefined;

    setSuccess({
      name: form.memberName,
      date: formatDate(selectedDay.date),
      time: pairedSlot ? `${formatTime(slot?.startTime ?? "")}–${formatTime(pairedSlot.endTime)}` : formatTime(slot?.startTime ?? ""),
      token: appointment.rescheduleToken,
      emailDelivered: payload.emailDelivered !== false,
    });

    setForm({ memberName: "", email: "", phone: "", isLargeFamily: false });
    setSelectedSlotId(null);
    setIsModalOpen(false);
    await loadSchedule();
    setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reserve this appointment.");
    }
  };

  const openSlots = selectedDay ? availableStartsFor(selectedDay.id) : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            {wardName && <p className="text-xl font-bold text-slate-900">{wardName}</p>}
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Ward tithing declaration</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Choose your appointment</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <MapPin className="h-4 w-4" />
            Bishop&apos;s Office
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          <CalendarRange className="h-4 w-4" />
          Choose a date
        </div>

        <select
          value={selectedDayId}
          onChange={(event) => setSelectedDayId(event.target.value)}
          className="hidden"
        >
          {days.map((day) => {
            const openCount = (slotsByDay[day.id] ?? []).filter((slot) => !slot.isReserved && !slot.isBuffer && !slot.isBlocked).length;
            return <option key={day.id} value={day.id}>{formatDate(day.date)} — {openCount} open</option>;
          })}
        </select>

        <div className="hidden">
          {days.map((day) => {
            const daySlots = slotsByDay[day.id] ?? [];
            const openCount = daySlots.filter((slot) => !slot.isReserved && !slot.isBuffer && !slot.isBlocked).length;
            const isSelected = day.id === selectedDayId;

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDayId(day.id)}
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  isSelected
                    ? "border-emerald-600 bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{formatDate(day.date)}</p>
                    <p className="mt-1 text-sm text-slate-500">{day.notes}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-700">
                    {openCount} open
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div ref={dateMenuRef} className="relative mt-4">
          <button type="button" aria-haspopup="listbox" aria-expanded={isDateMenuOpen} onClick={() => setIsDateMenuOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100">
            <span>
              <span className="block text-base font-semibold text-slate-900">{selectedDay ? formatDate(selectedDay.date) : "Choose a date"}</span>
              {selectedDay && <span className="mt-0.5 block text-sm text-slate-500">{openCountFor(selectedDay.id)} open appointments</span>}
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${isDateMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {isDateMenuOpen && <div role="listbox" aria-label="Available appointment dates" className="absolute left-0 right-0 z-30 mt-2 max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            {days.map((day) => {
              const openCount = openCountFor(day.id);
              const isSelected = day.id === selectedDayId;
              return <button key={day.id} role="option" aria-selected={isSelected} type="button" onClick={() => { setSelectedDayId(day.id); setIsDateMenuOpen(false); }} className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${isSelected ? "border-emerald-300 bg-emerald-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}>
                <span>
                  <span className="block font-semibold text-slate-900">{formatDate(day.date)}</span>
                  {day.notes && <span className="mt-0.5 block text-sm text-slate-500">{day.notes}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${openCount ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{openCount} open</span>
                  {isSelected && <Check className="h-4 w-4 text-emerald-700" />}
                </span>
              </button>;
            })}
          </div>}
        </div>
      </section>

      {selectedDay && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Selected day</p>
              <h2 className="text-2xl font-bold text-slate-900">{formatDate(selectedDay.date)}</h2>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <fieldset title="Choose 20 minutes to show only times with two consecutive openings" className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                <legend className="sr-only">Appointment length</legend>
                <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" name="appointment-length" checked={!form.isLargeFamily} onChange={() => setForm((current) => ({ ...current, isLargeFamily: false }))} className="h-3.5 w-3.5 accent-emerald-600" />10 min</label>
                <label className="flex cursor-pointer items-center gap-1.5"><input type="radio" name="appointment-length" checked={form.isLargeFamily} onChange={() => setForm((current) => ({ ...current, isLargeFamily: true }))} className="h-3.5 w-3.5 accent-emerald-600" />20 min</label>
              </fieldset>
              <div className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{openSlots.length} available</div>
            </div>
          </div>

          <div className="mx-auto flex max-w-xl flex-col gap-2">
            {openSlots.map((slot) => {
              const reserved = slot.isReserved;
              const unavailable = slot.isBuffer || slot.isBlocked || reserved;

              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => handleOpenBooking(slot.id)}
                  className={[
                    "rounded-2xl border p-4 text-left transition",
                    reserved
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                      : slot.isBuffer
                        ? "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-700"
                        : slot.isBlocked
                          ? "cursor-not-allowed border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-500 hover:bg-emerald-100",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.12em]">
                      {reserved ? "Reserved" : slot.isBuffer ? "Buffer / Catch-up" : slot.isBlocked ? "Blocked" : "Open"}
                    </span>
                  </div>
                  <p className="mt-4 text-xl font-semibold">{form.isLargeFamily ? `${formatTime(slot.startTime)}–${formatTime(slots.find((item) => item.startTime === slot.endTime)?.endTime ?? slot.endTime)}` : formatTime(slot.startTime)}</p>
                  {form.isLargeFamily && <p className="mt-1 text-sm text-emerald-700">20-minute appointment</p>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {isModalOpen && selectedSlotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Book appointment</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{selectedDay ? formatDate(selectedDay.date) : "Selected Day"}</h3>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-medium text-slate-500">
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Full Name
                <input
                  required
                  value={form.memberName}
                  onChange={(event) => setForm((current) => ({ ...current, memberName: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  placeholder="Your full name"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Email Address
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  placeholder="name@example.com"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Cell Phone
                <input
                  required
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                  placeholder="(801) 555-1234"
                />
              </label>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">{form.isLargeFamily ? "20-minute appointment — two consecutive times will be reserved." : "10-minute appointment"}</div>

              {error && <p className="text-sm font-medium text-red-600">{error}</p>}
              <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700">
                Confirm reservation
              </button>
            </form>
          </div>
        </div>
      )}

      {success && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="text-xl font-bold text-emerald-900">Appointment reserved for {success.name}</h3>
              <p className="mt-2 text-emerald-800">
                {success.date} at {success.time} in the Bishop&apos;s Office.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                  <UserRound className="mb-2 h-4 w-4 text-slate-500" />
                  {success.name}
                </div>
                <div className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                  <CalendarRange className="mb-2 h-4 w-4 text-slate-500" />
                  {success.date}
                </div>
                <div className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                  <Clock3 className="mb-2 h-4 w-4 text-slate-500" />
                  {success.time}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-emerald-900">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                  <Mail className="h-4 w-4" />
                  {success.emailDelivered ? "Confirmation email sent" : "Email unavailable — save the link below"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2">
                  <Phone className="h-4 w-4" />
                  Need to reschedule? Use the secure link below
                </span>
              </div>
              <p className="mt-4 text-sm text-emerald-800">
                Reschedule link: <a className="font-semibold underline" href={`/reschedule?token=${success.token}`}>{`/reschedule?token=${success.token}`}</a>
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
