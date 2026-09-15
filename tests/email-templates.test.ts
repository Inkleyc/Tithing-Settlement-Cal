import { describe,expect,it } from "vitest";
import { confirmationEmail,reminderEmail } from "../lib/email-templates";

const details={memberName:"A & B <Family>",wardName:"Golden Meadows 3rd Ward",dayDate:"2026-10-18",startTime:"16:40",endTime:"17:00",adminPhone:"(801) 555-0100",rescheduleUrl:"https://example.test/reschedule?token=abc"};
describe("appointment email templates",()=>{
  it("includes complete confirmation details and escapes HTML",()=>{const message=confirmationEmail(details);expect(message.subject).toContain(details.wardName);expect(message.text).toContain("Sunday, October 18, 2026");expect(message.text).toContain("4:40 PM–5:00 PM");expect(message.text).toContain(details.rescheduleUrl);expect(message.html).toContain("A &amp; B &lt;Family&gt;");});
  it("includes contact and reschedule details in reminders",()=>{const message=reminderEmail(details);expect(message.text).toContain(details.adminPhone);expect(message.text).toContain(details.rescheduleUrl);expect(message.html).toContain("Appointment reminder");});
});
