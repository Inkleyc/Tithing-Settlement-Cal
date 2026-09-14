import { RescheduleClient } from "@/components/reschedule-client";

export default async function ReschedulePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  return <RescheduleClient token={token} />;
}
