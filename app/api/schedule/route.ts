import { getRepository } from "@/lib/repository";
export const dynamic="force-dynamic";
export async function GET(){const repository=getRepository();const days=await repository.getDays();return Response.json({days,slots:Object.fromEntries(await Promise.all(days.map(async(day)=>[day.id,(await repository.getSlotsForDay(day.id)).map((slot)=>{const publicSlot={...slot};delete publicSlot.appointmentId;return publicSlot;})]))) });}
