import { describe, expect, it } from "vitest";
import { createReservation, getDays, getSlotsForDay, rescheduleAppointment } from "../lib/mock-store";

describe("booking invariants", () => {
  it("rejects double booking", () => {
    const day=getDays()[0]; const slot=getSlotsForDay(day.id).find((v)=>!v.isReserved&&!v.isBuffer&&!v.isBlocked)!;
    createReservation({dayId:day.id,slotId:slot.id,memberName:"Test One",email:"one@test.local",phone:"8015550100",isLargeFamily:false});
    expect(()=>createReservation({dayId:day.id,slotId:slot.id,memberName:"Test Two",email:"two@test.local",phone:"8015550101",isLargeFamily:false})).toThrow(/reserved/);
  });
  it("preserves a large-family double block when rescheduling", () => {
    const day=getDays()[1]; const open=getSlotsForDay(day.id).filter((v)=>!v.isReserved&&!v.isBuffer&&!v.isBlocked);
    const first=open.find((v)=>open.some((n)=>n.startTime===v.endTime))!;
    const appointment=createReservation({dayId:day.id,slotId:first.id,memberName:"Large Family",email:"large@test.local",phone:"8015550102",isLargeFamily:true});
    const target=open.find((v)=>v.id!==first.id&&open.some((n)=>n.startTime===v.endTime))!;
    expect(rescheduleAppointment(appointment.rescheduleToken,target.id).pairedSlotId).toBeTruthy();
  });
});
