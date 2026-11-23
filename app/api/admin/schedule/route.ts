import { PUBLIC_APP_URL } from "@/lib/public-links";
import { requireAdmin } from "@/lib/authorization";
import { sendEmail } from "@/lib/email";
import { cancellationEmail } from "@/lib/email-templates";
import { getRepository } from "@/lib/repository";
import { email, identifier, jsonBody, phone, text } from "@/lib/validation";
import { todayInAppTimeZone } from "@/lib/dates";
import { isGoogleCalendarConfigured, syncGoogleCalendar } from "@/lib/google-calendar";
import { scheduleCalendarSync } from "@/lib/calendar-sync-trigger";
import { planSlotBlock } from "@/lib/slot-block";

async function adminData() { const repository=getRepository(); await repository.archivePastDays(todayInAppTimeZone()); const [schedule,archivedSchedule,wardName,adminPhone,adminContact]=await Promise.all([repository.getAdminSchedule(),repository.getArchivedSchedule(),repository.getWardName(),repository.getAdminPhone(),repository.getAdminContact()]); return {schedule,archivedSchedule,wardName,adminPhone,adminContact,googleCalendarConfigured:isGoogleCalendarConfigured()}; }
export async function GET(){try{await requireAdmin();return Response.json(await adminData(),{headers:{"Cache-Control":"no-store, no-cache, must-revalidate"}});}catch{return Response.json({message:"Unauthorized"},{status:401});}}
export async function POST(request:Request){
  try {
    await requireAdmin(); const b=await jsonBody(request); const action=text(b.action,"Action",20),repository=getRepository();
    let emailDelivered:boolean|null|undefined;
    let calendarSync;
    let slotBlock:{added:number;skipped:number;firstOverlap?:{startTime:string;endTime:string}}|undefined;
    let appointmentChanged=false;
    if(action==="ward-name")await repository.updateWardName(text(b.name,"Ward name",150));
    else if(action==="admin-contact") {
      const name = typeof b.name === "string" && !b.name.trim() ? "" : text(b.name,"Executive Secretary name",150);
      const contactEmail = typeof b.email === "string" && !b.email.trim() ? "" : email(b.email);
      await repository.updateAdminContact({name,email:contactEmail});
    }
    else if(action==="admin-phone")await repository.updateAdminPhone(phone(b.phone));
    else if(action==="toggle")await repository.toggleSlotBlocked(identifier(b.slotId,"Time slot"));
    else if(action==="cancel"){
      appointmentChanged=true;
      const cancelled=await repository.cancelAppointment(identifier(b.appointmentId,"Appointment"));
      if(cancelled.email==="walk-in@ward.local")emailDelivered=null;
      else {
        const [primary,wardName,adminPhone]=await Promise.all([repository.getAppointmentSlot(cancelled),repository.getWardName(),repository.getAdminPhone()]);
        if(!primary)throw new Error("The appointment was cancelled, but its scheduled time could not be found for the email.");
        const slots=await repository.getSlotsForDay(primary.dayId);
        const paired=cancelled.pairedSlotId?slots.find((slot)=>slot.id===cancelled.pairedSlotId):undefined;
        try { await sendEmail({to:cancelled.email,...cancellationEmail({memberName:cancelled.memberName,wardName,dayDate:primary.dayDate,startTime:primary.startTime,endTime:paired?.endTime??primary.endTime,adminPhone,scheduleUrl:PUBLIC_APP_URL})}); emailDelivered=true; }
        catch(error){emailDelivered=false;console.error("Cancellation email delivery failed",error);}
      }
    }
    else if(action==="walk-in"){appointmentChanged=true;await repository.createWalkInAppointment(identifier(b.slotId,"Time slot"),text(b.name,"Name",150),phone(b.phone));}
    else if(action==="edit-day")await repository.updateDay(identifier(b.dayId,"Day"),text(b.date,"Date",10),typeof b.notes==="string"?b.notes.trim().slice(0,255):"");
    else if(action==="delete-day")await repository.deleteDay(identifier(b.dayId,"Day"));
    else if(action==="add-slot"){const start=text(b.startTime,"Start time",5),end=text(b.endTime,"End time",5);if(!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end)||start>=end)throw new Error("End time must be after start time.");const mins=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3,5));if(mins(end)-mins(start)>120)throw new Error("That time runs more than 2 hours — check the AM/PM on the end time.");await repository.addTimeSlot(identifier(b.dayId,"Day"),start,end,false);}
    else if(action==="add-slot-block"){const dayId=identifier(b.dayId,"Day");const start=text(b.startTime,"Start time",5),end=text(b.endTime,"End time",5);const interval=Number(b.intervalMinutes);const existing=await repository.getSlotsForDay(dayId);const plan=planSlotBlock(existing,start,end,interval);for(const slot of plan.toAdd)await repository.addTimeSlot(dayId,slot.startTime,slot.endTime,false);slotBlock={added:plan.toAdd.length,skipped:plan.skipped,...(plan.firstOverlap?{firstOverlap:plan.firstOverlap}:{})};}
    else if(action==="delete-slot")await repository.deleteTimeSlot(identifier(b.slotId,"Time slot"));
    else if(action==="generate"){const interval=Number(b.intervalMinutes);if(!Number.isInteger(interval)||interval<5||interval>60)throw new Error("Interval must be between 5 and 60 minutes.");await repository.generateScheduleForDay(text(b.date,"Date",10),text(b.startTime,"Start time",5),text(b.endTime,"End time",5),interval,180,typeof b.notes==="string"?b.notes.trim().slice(0,255):"");}
    else if(action==="sync-calendar"){const [schedule,wardName]=await Promise.all([repository.getAdminSchedule(),repository.getWardName()]);calendarSync=await syncGoogleCalendar(schedule,wardName);}
    else throw new Error("Unknown action.");
    if(appointmentChanged)await scheduleCalendarSync();
    return Response.json({...await adminData(),...(emailDelivered!==undefined?{emailDelivered}:{}),...(calendarSync?{calendarSync}:{}),...(slotBlock?{slotBlock}:{})});
  } catch(error){const message=error instanceof Error?error.message:"Request failed.";return Response.json({message},{status:message==="Unauthorized"?401:400});}
}
