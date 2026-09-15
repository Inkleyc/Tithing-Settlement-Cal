import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { reminderEmail } from "@/lib/email-templates";
import { getRepository } from "@/lib/repository";

export async function GET(request:Request){
  const secret=process.env.CRON_SECRET||(process.env.NODE_ENV==="production"?"":"demo-cron-secret");
  if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({message:"Unauthorized"},{status:401});
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);const date=tomorrow.toLocaleDateString("en-CA",{timeZone:"America/Denver"});
  const repository=getRepository();const [appointments,wardName,adminPhone]=await Promise.all([repository.getAppointmentsForDate(date),repository.getWardName(),repository.getAdminPhone()]);
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;let sent=0,failed=0;
  for(const appointment of appointments){
    try { const primary=await repository.getAppointmentSlot(appointment);if(!primary)throw new Error("Appointment slot not found.");const slots=await repository.getSlotsForDay(primary.dayId);const paired=appointment.pairedSlotId?slots.find((slot)=>slot.id===appointment.pairedSlotId):undefined;await sendEmail({to:appointment.email,...reminderEmail({memberName:appointment.memberName,wardName,dayDate:primary.dayDate,startTime:primary.startTime,endTime:paired?.endTime??primary.endTime,adminPhone,rescheduleUrl:`${origin}/reschedule?token=${appointment.rescheduleToken}`})});await repository.markReminderSent(appointment.id);sent++; }
    catch(error){failed++;console.error(`Reminder email failed for appointment ${appointment.id}`,error);}
  }
  return NextResponse.json({ok:failed===0,sent,failed,date},{status:failed?207:200});
}
