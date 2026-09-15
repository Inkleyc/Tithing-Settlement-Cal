import { getRepository } from "@/lib/repository";
import { identifier,jsonBody } from "@/lib/validation";
async function responseFor(token:string){const repository=getRepository();const appointment=await repository.getAppointmentByToken(token);if(!appointment)return null;return{appointment,currentSlot:await repository.getAppointmentSlot(appointment),availableSlots:(await repository.getAllPublicSlots()).filter((s)=>!s.isReserved&&!s.isBuffer&&!s.isBlocked),adminPhone:await repository.getAdminPhone()};}
export const dynamic="force-dynamic";
export async function GET(request:Request){const token=new URL(request.url).searchParams.get("token")??"";const data=token?await responseFor(token):null;return data?Response.json(data):Response.json({message:"Invalid reschedule link."},{status:404});}
export async function PATCH(request:Request){try{const b=await jsonBody(request);const token=identifier(b.token,"Reschedule token");await getRepository().rescheduleAppointment(token,identifier(b.slotId,"Time slot"));return Response.json(await responseFor(token));}catch(error){return Response.json({message:error instanceof Error?error.message:"Unable to reschedule."},{status:400});}}
