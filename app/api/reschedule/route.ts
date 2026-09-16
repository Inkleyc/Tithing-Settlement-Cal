import { sendEmail } from "@/lib/email";
import { rescheduleConfirmationEmail } from "@/lib/email-templates";
import { getRepository } from "@/lib/repository";
import { identifier,jsonBody } from "@/lib/validation";
async function responseFor(token:string){
  const repository=getRepository();
  const appointment=await repository.getAppointmentByToken(token);
  if(!appointment)return null;
  const [primarySlot,availableSlots,adminPhone,wardName]=await Promise.all([repository.getAppointmentSlot(appointment),repository.getAllPublicSlots(),repository.getAdminPhone(),repository.getWardName()]);
  if(!primarySlot)return null;
  const pairedSlot=appointment.pairedSlotId?(await repository.getSlotsForDay(primarySlot.dayId)).find((slot)=>slot.id===appointment.pairedSlotId):undefined;
  return{appointment,currentSlot:{...primarySlot,endTime:pairedSlot?.endTime??primarySlot.endTime},availableSlots:availableSlots.filter((slot)=>!slot.isReserved&&!slot.isBuffer&&!slot.isBlocked),adminPhone,wardName};
}
export const dynamic="force-dynamic";
export async function GET(request:Request){const token=new URL(request.url).searchParams.get("token")??"";const data=token?await responseFor(token):null;return data?Response.json(data):Response.json({message:"Invalid reschedule link."},{status:404});}
export async function PATCH(request:Request){
  try{
    const body=await jsonBody(request);
    const token=identifier(body.token,"Reschedule token");
    await getRepository().rescheduleAppointment(token,identifier(body.slotId,"Time slot"));
    const data=await responseFor(token);
    if(!data)throw new Error("The updated appointment could not be loaded.");
    const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
    let emailDelivered=true;
    try{
      await sendEmail({to:data.appointment.email,...rescheduleConfirmationEmail({memberName:data.appointment.memberName,wardName:data.wardName,dayDate:data.currentSlot.dayDate,startTime:data.currentSlot.startTime,endTime:data.currentSlot.endTime,adminPhone:data.adminPhone,rescheduleUrl:`${origin}/reschedule?token=${data.appointment.rescheduleToken}`})});
    }catch(error){emailDelivered=false;console.error("Reschedule confirmation email delivery failed",error);}
    return Response.json({...data,emailDelivered});
  }catch(error){return Response.json({message:error instanceof Error?error.message:"Unable to reschedule."},{status:400});}
}
