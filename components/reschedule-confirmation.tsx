"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CalendarRange, CheckCircle2, Clock3, Mail, MapPin } from "lucide-react";

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const formatTime = (value: string) => { const [hour,minute]=value.split(":").map(Number);const date=new Date();date.setHours(hour,minute,0,0);return date.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}); };

type ConfirmationData = { appointment: { memberName: string }; currentSlot: { dayDate: string; startTime: string; endTime: string }; wardName: string };

export function RescheduleConfirmation({ token, emailDelivered }: { token: string; emailDelivered: boolean }) {
  const [data,setData]=useState<ConfirmationData>();
  const [failed,setFailed]=useState(false);

  useEffect(()=>{void fetch(`/api/reschedule?token=${encodeURIComponent(token)}`,{cache:"no-store"}).then(async(response)=>{if(!response.ok)throw new Error();setData(await response.json());}).catch(()=>setFailed(true));},[token]);

  if(failed)return <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm"><AlertTriangle className="mx-auto h-10 w-10 text-amber-600"/><h1 className="mt-4 text-2xl font-bold text-slate-900">Confirmation unavailable</h1><p className="mt-3 text-slate-600">The appointment was updated, but its confirmation details could not be loaded. Please use the link in your email or contact the Executive Secretary.</p></div>;
  if(!data)return <div className="mx-auto max-w-xl p-8 text-center text-slate-600">Loading confirmation…</div>;

  return <main className="mx-auto max-w-2xl px-4 py-10">
    <section className="rounded-3xl border border-emerald-200 bg-white p-7 shadow-sm">
      <CheckCircle2 className="h-12 w-12 text-emerald-600"/>
      {data.wardName&&<p className="mt-5 font-semibold text-slate-700">{data.wardName}</p>}
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Your appointment has been updated</h1>
      <p className="mt-3 text-slate-600">Thanks, {data.appointment.memberName}. Your new appointment time is confirmed.</p>
      <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-5 text-slate-800">
        <p className="flex items-center gap-3"><CalendarRange className="h-5 w-5 text-emerald-700"/>{formatDate(data.currentSlot.dayDate)}</p>
        <p className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-emerald-700"/>{formatTime(data.currentSlot.startTime)}–{formatTime(data.currentSlot.endTime)}</p>
        <p className="flex items-center gap-3"><MapPin className="h-5 w-5 text-emerald-700"/>Bishop&apos;s Office</p>
      </div>
      <div className={`mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm ${emailDelivered?"bg-emerald-50 text-emerald-800":"bg-amber-50 text-amber-900"}`}><Mail className="mt-0.5 h-5 w-5 shrink-0"/><p>{emailDelivered?"A new confirmation email has been sent with your updated appointment details.":"Your appointment is confirmed, but the new email could not be delivered. Please save this page."}</p></div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href="/" className="rounded-xl bg-slate-900 px-4 py-3 text-center font-semibold text-white">Done</Link><Link href={`/reschedule?token=${encodeURIComponent(token)}`} className="rounded-xl border border-slate-300 px-4 py-3 text-center font-semibold text-slate-700">Choose another time</Link></div>
    </section>
  </main>;
}
