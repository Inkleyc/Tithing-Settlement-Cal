import { RescheduleConfirmation } from "@/components/reschedule-confirmation";

export default async function RescheduleConfirmationPage({searchParams}:{searchParams:Promise<{token?:string;email?:string}>}){
  const params=await searchParams;
  return <RescheduleConfirmation token={params.token??""} emailDelivered={params.email!=="unavailable"}/>;
}
