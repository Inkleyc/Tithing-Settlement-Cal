import { requireAdmin } from "@/lib/authorization";
import { getRepository } from "@/lib/repository";
import { identifier, jsonBody, phone, text } from "@/lib/validation";

async function adminData() { const repository=getRepository(); const [schedule,wardName,adminPhone]=await Promise.all([repository.getAdminSchedule(),repository.getWardName(),repository.getAdminPhone()]); return {schedule,wardName,adminPhone}; }
export async function GET(){try{await requireAdmin();return Response.json(await adminData());}catch{return Response.json({message:"Unauthorized"},{status:401});}}
export async function POST(request:Request){
  try {
    await requireAdmin(); const b=await jsonBody(request); const action=text(b.action,"Action",20),repository=getRepository();
    if(action==="ward-name")await repository.updateWardName(text(b.name,"Ward name",150));
    else if(action==="admin-phone")await repository.updateAdminPhone(phone(b.phone));
    else if(action==="toggle")await repository.toggleSlotBlocked(identifier(b.slotId,"Time slot"));
    else if(action==="cancel")await repository.cancelAppointment(identifier(b.appointmentId,"Appointment"));
    else if(action==="walk-in")await repository.createWalkInAppointment(identifier(b.slotId,"Time slot"),text(b.name,"Name",150),phone(b.phone));
    else if(action==="edit-day")await repository.updateDay(identifier(b.dayId,"Day"),text(b.date,"Date",10),typeof b.notes==="string"?b.notes.trim().slice(0,255):"");
    else if(action==="delete-day")await repository.deleteDay(identifier(b.dayId,"Day"));
    else if(action==="add-slot"){const start=text(b.startTime,"Start time",5),end=text(b.endTime,"End time",5);if(!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end)||start>=end)throw new Error("End time must be after start time.");await repository.addTimeSlot(identifier(b.dayId,"Day"),start,end,false);}
    else if(action==="delete-slot")await repository.deleteTimeSlot(identifier(b.slotId,"Time slot"));
    else if(action==="generate"){const interval=Number(b.intervalMinutes);if(!Number.isInteger(interval)||interval<5||interval>60)throw new Error("Interval must be between 5 and 60 minutes.");await repository.generateScheduleForDay(text(b.date,"Date",10),text(b.startTime,"Start time",5),text(b.endTime,"End time",5),interval,1440,typeof b.notes==="string"?b.notes.trim().slice(0,255):"");}
    else throw new Error("Unknown action.");
    return Response.json(await adminData());
  } catch(error){const message=error instanceof Error?error.message:"Request failed.";return Response.json({message},{status:message==="Unauthorized"?401:400});}
}
