type AppointmentEmailDetails = { memberName: string; wardName: string; dayDate: string; startTime: string; endTime: string; adminPhone: string; rescheduleUrl?: string };
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
const displayDate = (value: string) => {
  const [year,month,day]=value.split("-").map(Number);
  const calendarDate=new Date(Date.UTC(year,month-1,day,12));
  return calendarDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"UTC"});
};
const displayTime = (value: string) => { const [hour,minute]=value.split(":").map(Number); return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",timeZone:"UTC"}).format(new Date(Date.UTC(2024,0,1,hour,minute))); };

export function confirmationEmail(details: AppointmentEmailDetails) {
  const date=displayDate(details.dayDate), range=`${displayTime(details.startTime)}–${displayTime(details.endTime)}`, ward=details.wardName||"Ward Tithing Declaration";
  const rescheduleText=details.rescheduleUrl?`\nReschedule securely: ${details.rescheduleUrl}`:"";
  const contactText=details.adminPhone?`\nExecutive Secretary: ${details.adminPhone}`:"";
  return { subject: `${ward}: appointment confirmed`, text:`Hello ${details.memberName},\n\nYour tithing declaration appointment is confirmed.\n\nDate: ${date}\nTime: ${range}\nLocation: Bishop's Office${rescheduleText}${contactText}\n\nPlease keep this message for your records.`, html:`<h1>Appointment confirmed</h1><p>Hello ${escapeHtml(details.memberName)},</p><p>Your tithing declaration appointment for <strong>${escapeHtml(ward)}</strong> is confirmed.</p><p><strong>Date:</strong> ${escapeHtml(date)}<br><strong>Time:</strong> ${escapeHtml(range)}<br><strong>Location:</strong> Bishop&#39;s Office</p>${details.rescheduleUrl?`<p><a href="${escapeHtml(details.rescheduleUrl)}">Reschedule this appointment</a></p>`:""}${details.adminPhone?`<p>Executive Secretary: ${escapeHtml(details.adminPhone)}</p>`:""}<p>Please keep this message for your records.</p>` };
}

export function rescheduleConfirmationEmail(details: AppointmentEmailDetails) {
  const date=displayDate(details.dayDate), range=`${displayTime(details.startTime)}–${displayTime(details.endTime)}`, ward=details.wardName||"Ward Tithing Declaration";
  const rescheduleText=details.rescheduleUrl?`\nReschedule securely: ${details.rescheduleUrl}`:"";
  const contactText=details.adminPhone?`\nExecutive Secretary: ${details.adminPhone}`:"";
  return { subject: `${ward}: appointment updated`, text:`Hello ${details.memberName},\n\nYour tithing declaration appointment has been rescheduled and confirmed.\n\nNew date: ${date}\nNew time: ${range}\nLocation: Bishop's Office${rescheduleText}${contactText}\n\nPlease keep this updated message for your records.`, html:`<h1>Appointment updated</h1><p>Hello ${escapeHtml(details.memberName)},</p><p>Your tithing declaration appointment for <strong>${escapeHtml(ward)}</strong> has been rescheduled and confirmed.</p><p><strong>New date:</strong> ${escapeHtml(date)}<br><strong>New time:</strong> ${escapeHtml(range)}<br><strong>Location:</strong> Bishop&#39;s Office</p>${details.rescheduleUrl?`<p><a href="${escapeHtml(details.rescheduleUrl)}">Reschedule</a></p>`:""}${details.adminPhone?`<p>Executive Secretary: ${escapeHtml(details.adminPhone)}</p>`:""}<p>Please keep this updated message for your records.</p>` };
}

export function reminderEmail(details: AppointmentEmailDetails) {
  const date=displayDate(details.dayDate), range=`${displayTime(details.startTime)}–${displayTime(details.endTime)}`, ward=details.wardName||"Ward Tithing Declaration";
  return { subject: `${ward}: appointment reminder`, text:`Hello ${details.memberName},\n\nReminder: your tithing declaration appointment is tomorrow.\n\nDate: ${date}\nTime: ${range}\nLocation: Bishop's Office${details.rescheduleUrl?`\nReschedule securely: ${details.rescheduleUrl}`:""}${details.adminPhone?`\nExecutive Secretary: ${details.adminPhone}`:""}`, html:`<h1>Appointment reminder</h1><p>Hello ${escapeHtml(details.memberName)},</p><p>Your tithing declaration appointment is tomorrow.</p><p><strong>Date:</strong> ${escapeHtml(date)}<br><strong>Time:</strong> ${escapeHtml(range)}<br><strong>Location:</strong> Bishop&#39;s Office</p>${details.rescheduleUrl?`<p><a href="${escapeHtml(details.rescheduleUrl)}">Reschedule this appointment</a></p>`:""}${details.adminPhone?`<p>Executive Secretary: ${escapeHtml(details.adminPhone)}</p>`:""}` };
}
