import { PUBLIC_APP_URL, rescheduleUrl } from "@/lib/public-links";
import { sendEmail } from "@/lib/email";
import { confirmationEmail, secretarySignupEmail } from "@/lib/email-templates";
import { scheduleCalendarSync } from "@/lib/calendar-sync-trigger";
import { getRepository } from "@/lib/repository";
import { email, identifier, jsonBody, phone, text } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body=await jsonBody(request);
    const input={dayId:identifier(body.dayId,"Day"),slotId:identifier(body.slotId,"Time slot"),memberName:text(body.memberName,"Name",150),email:email(body.email),phone:phone(body.phone),isLargeFamily:body.isLargeFamily===true};
    const repository=getRepository();
    const appointment=await repository.createReservation(input);
    const [days,slots,wardName,adminPhone,adminContact]=await Promise.all([repository.getDays(),repository.getSlotsForDay(input.dayId),repository.getWardName(),repository.getAdminPhone(),repository.getAdminContact()]);
    const primary=slots.find((slot)=>slot.id===appointment.timeSlotId);
    const paired=appointment.pairedSlotId?slots.find((slot)=>slot.id===appointment.pairedSlotId):undefined;
    const dayDate=days.find((day)=>day.id===input.dayId)?.date??"";
    const startTime=primary?.startTime??"";
    const endTime=paired?.endTime??primary?.endTime??"";
    let emailDelivered=true;
    try {
      await sendEmail({to:appointment.email,...confirmationEmail({memberName:appointment.memberName,wardName,dayDate,startTime,endTime,adminPhone,rescheduleUrl:rescheduleUrl(appointment.rescheduleToken)})});
    } catch(error) { emailDelivered=false; console.error("Confirmation email delivery failed",error); }
    let secretaryEmailDelivered:boolean|null=null;
    const secretaryEmail=adminContact.email.trim();
    if (secretaryEmail && secretaryEmail.toLowerCase()!==appointment.email.toLowerCase()) {
      try {
        await sendEmail({to:secretaryEmail,replyTo:appointment.email,...secretarySignupEmail({memberName:appointment.memberName,wardName,dayDate,startTime,endTime,adminPhone,memberEmail:appointment.email,memberPhone:appointment.phone,isLargeFamily:appointment.isLargeFamily,adminUrl:`${PUBLIC_APP_URL}/admin`})});
        secretaryEmailDelivered=true;
      } catch(error) { secretaryEmailDelivered=false; console.error("Secretary signup notification failed",error); }
    }
    await scheduleCalendarSync();
    return Response.json({appointment,emailDelivered,secretaryEmailDelivered});
  } catch(error) { return Response.json({message:error instanceof Error?error.message:"Unable to book."},{status:400}); }
}
