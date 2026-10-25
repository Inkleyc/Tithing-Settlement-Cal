export function textReminder(memberName: string, date: string, time: string, secretaryName: string) {
  const firstName = memberName.trim().split(/\s+/)[0];
  const sender = secretaryName.trim() || "the ward executive secretary";
  return `Hi ${firstName}, this is ${sender} reminding you of your tithing declaration with the Bishop on ${date} at ${time} in the Bishop's office.`;
}
