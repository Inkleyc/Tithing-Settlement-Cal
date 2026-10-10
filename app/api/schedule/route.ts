import { getRepository } from "@/lib/repository";
import { todayInAppTimeZone } from "@/lib/dates";
export const dynamic="force-dynamic";
export async function GET(){const repository=getRepository();await repository.archivePastDays(todayInAppTimeZone());const [days,wardName]=await Promise.all([repository.getDays(),repository.getWardName()]);return Response.json({wardName,days,slots:Object.fromEntries(await Promise.all(days.map(async(day)=>[day.id,(await repository.getSlotsForDay(day.id)).map((slot)=>{const publicSlot={...slot};delete publicSlot.appointmentId;return publicSlot;})]))) },{headers:{"Cache-Control":"no-store, no-cache, must-revalidate"}});}
