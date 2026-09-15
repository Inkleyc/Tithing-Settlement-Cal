import { sendEmail } from "@/lib/email";
import { confirmationEmail } from "@/lib/email-templates";
import { getRepository } from "@/lib/repository";
import { email, identifier, jsonBody, phone, text } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body=await jsonBody(request);
    const input={dayId:identifier(body.dayId,"Day"),slotId:identifier(body.slotId,"Time slot"),memberName:text(body.memberName,"Name",150),email:email(body.email),phone:phone(body.phone),isLargeFamily:body.isLargeFamily===true};
    const repository=getRepository();
    const appointment=await repository.createReservation(input);
    const [days,slots,wardName,adminPhone]=await Promise.all([repository.getDays(),repository.getSlotsForDay(input.dayId),repository.getWardName(),repository.getAdminPhone()]);
    const primary=slots.find((slot)=>slot.id===appointment.timeSlotId);
    const paired=appointment.pairedSlotId?slots.find((slot)=>slot.id===appointment.pairedSlotId):undefined;
    const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
    let emailDelivered=true;
    try {
      await sendEmail({to:appointment.email,...confirmationEmail({memberName:appointment.memberName,wardName,dayDate:days.find((day)=>day.id===input.dayId)?.date??"",startTime:primary?.startTime??"",endTime:paired?.endTime??primary?.endTime??"",adminPhone,rescheduleUrl:`${origin}/reschedule?token=${appointment.rescheduleToken}`})});
    } catch(error) { emailDelivered=false; console.error("Confirmation email delivery failed",error); }
    return Response.json({appointment,emailDelivered});
  } catch(error) { return Response.json({message:error instanceof Error?error.message:"Unable to book."},{status:400}); }
}
