"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Printer, Share2 } from "lucide-react";

export function ShareSchedule({ wardName }: { wardName: string }) {
  const [publicUrl]=useState(()=>(process.env.NEXT_PUBLIC_APP_URL||(typeof window!=="undefined"?window.location.origin:"")).replace(/\/$/,""));
  const [qrCode,setQrCode]=useState("");
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    if(publicUrl)void QRCode.toDataURL(publicUrl,{width:640,margin:2,color:{dark:"#0f172a",light:"#ffffff"}}).then(setQrCode);
  },[publicUrl]);

  const copyLink=async()=>{
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(()=>setCopied(false),2000);
  };

  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500"><Share2 className="h-4 w-4"/>Share with the ward</div>
    <h2 className="mt-2 text-2xl font-bold text-slate-900">Scheduling link and QR code</h2>
    <p className="mt-2 text-slate-600">Use these materials in LCR Send a Message, the ward bulletin, or an approved announcement.</p>

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <label className="text-sm font-semibold text-slate-700">Public scheduling link</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={publicUrl} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"/>
          <button type="button" disabled={!publicUrl} onClick={copyLink} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}{copied?"Copied":"Copy link"}</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"><Printer className="h-4 w-4"/>Print announcement</button>
          {qrCode&&<a href={qrCode} download="ward-tithing-declaration-qr.png" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"><Download className="h-4 w-4"/>Download QR code</a>}
        </div>
      </div>
      <div className="flex justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">{qrCode?<Image unoptimized src={qrCode} alt="QR code for the ward scheduling page" width={240} height={240} className="h-60 w-60 rounded-xl bg-white"/>:<div className="flex h-60 w-60 items-center justify-center text-sm text-slate-500">Creating QR code…</div>}</div>
    </div>

    <article className="print-area mt-8 rounded-3xl border-2 border-slate-900 bg-white p-10 text-center text-slate-900">
      {wardName&&<p className="text-lg font-semibold">{wardName}</p>}
      <h1 className="mt-3 text-4xl font-bold">Schedule Your Tithing Declaration</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg">Choose an available appointment with the Bishop using the secure ward scheduling page.</p>
      {qrCode&&<Image unoptimized src={qrCode} alt="QR code for scheduling a tithing declaration appointment" width={320} height={320} className="mx-auto mt-8 h-80 w-80"/>}
      <p className="mt-6 break-all text-lg font-semibold">{publicUrl}</p>
      <p className="mt-4 text-base text-slate-600">Scan the QR code or visit the link to choose a date and time. A confirmation email will include a secure rescheduling link.</p>
    </article>
  </section>;
}
