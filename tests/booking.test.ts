import { describe, expect, it } from "vitest";
import { cancelAppointment, createReservation, deleteDay, deleteTimeSlot, generateScheduleForDay, getDays, getSlotsForDay, rescheduleAppointment, toggleSlotBlocked } from "../lib/mock-store";

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
  it("deletes an open slot after its cancelled appointment history is removed", () => {
    const day=getDays()[2]; const slot=getSlotsForDay(day.id).find((value)=>!value.isReserved&&!value.isBuffer&&!value.isBlocked)!;
    const appointment=createReservation({dayId:day.id,slotId:slot.id,memberName:"Cancelled Test",email:"cancelled@test.local",phone:"8015550103",isLargeFamily:false});
    expect(()=>deleteTimeSlot(slot.id)).toThrow(/Cancel the active appointment/);
    cancelAppointment(appointment.id);
    deleteTimeSlot(slot.id);
    expect(getSlotsForDay(day.id).some((value)=>value.id===slot.id)).toBe(false);
  });
  it("deletes a whole day after protecting and clearing appointment history", () => {
    const {day}=generateScheduleForDay("2099-11-21","09:00","10:00",10,50,"Delete day test");
    const slot=getSlotsForDay(day.id).find((value)=>!value.isBuffer)!;
    const appointment=createReservation({dayId:day.id,slotId:slot.id,memberName:"Day Delete Test",email:"day-delete@test.local",phone:"8015550104",isLargeFamily:false});
    expect(()=>deleteDay(day.id)).toThrow(/Cancel all active appointments/);
    cancelAppointment(appointment.id);
    deleteDay(day.id);
    expect(getDays().some((value)=>value.id===day.id)).toBe(false);
  });
  it("normalizes a legacy buffer when it is unblocked", () => {
    const {day}=generateScheduleForDay("2099-11-22","09:00","10:00",10,50,"Buffer toggle test");
    const slot=getSlotsForDay(day.id).find((value)=>value.isBuffer)!;
    expect(toggleSlotBlocked(slot.id)).toMatchObject({isBuffer:false,isBlocked:false});
    expect(toggleSlotBlocked(slot.id)).toMatchObject({isBuffer:false,isBlocked:true});
    deleteDay(day.id);
  });
});
