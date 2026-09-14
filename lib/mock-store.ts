export type AppointmentStatus = "confirmed" | "cancelled";

export type DayRecord = {
  id: string;
  date: string;
  isActive: boolean;
  notes: string;
};

export type TimeSlotRecord = {
  id: string;
  dayId: string;
  startTime: string;
  endTime: string;
  isBuffer: boolean;
  isBlocked: boolean;
  createdAt: string;
};

export type AppointmentRecord = {
  id: string;
  timeSlotId: string;
  pairedSlotId?: string | null;
  memberName: string;
  email: string;
  phone: string;
  isLargeFamily: boolean;
  rescheduleToken: string;
  status: AppointmentStatus;
  reminderEmailSent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicSlotView = TimeSlotRecord & {
  isReserved: boolean;
  appointmentId?: string;
};

export type BookingInput = {
  dayId: string;
  slotId: string;
  memberName: string;
  email: string;
  phone: string;
  isLargeFamily: boolean;
};

const addDays = (offset: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const makeSlot = (
  id: string,
  dayId: string,
  startTime: string,
  endTime: string,
  isBuffer = false,
  isBlocked = false
): TimeSlotRecord => ({
  id,
  dayId,
  startTime,
  endTime,
  isBuffer,
  isBlocked,
  createdAt: new Date().toISOString(),
});

const buildSlotsForDay = (dayId: string): TimeSlotRecord[] => {
  const slots: TimeSlotRecord[] = [];
  const startMinutes = 9 * 60;
  const endMinutes = 15 * 60;

  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 10) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setMinutes(minutes);

    const end = new Date(start);
    end.setMinutes(start.getMinutes() + 10);

    const isBuffer = [2, 8, 13, 18].includes(Math.floor((minutes - startMinutes) / 10));
    const isBlocked = false;
    slots.push(
      makeSlot(
        `${dayId}-${minutes}`,
        dayId,
        start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
        end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
        isBuffer,
        isBlocked
      )
    );
  }

  return slots;
};

const seedDays: DayRecord[] = [
  { id: "day-sun-1", date: addDays(2), isActive: true, notes: "Sunday Block 1" },
  { id: "day-wed-1", date: addDays(5), isActive: true, notes: "Wednesday Evening" },
  { id: "day-sun-2", date: addDays(9), isActive: true, notes: "Sunday Block 2" },
];

const mockSlots: TimeSlotRecord[] = seedDays.flatMap((day) => buildSlotsForDay(day.id));

const mockAppointments: AppointmentRecord[] = [
  {
    id: "appt-001",
    timeSlotId: mockSlots[3].id,
    pairedSlotId: null,
    memberName: "Elder Jensen",
    email: "jensen@example.com",
    phone: "8015554001",
    isLargeFamily: false,
    rescheduleToken: "a8a65bdb-8e20-4149-9d5b-6f7393f5f6ed",
    status: "confirmed",
    reminderEmailSent: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "appt-002",
    timeSlotId: mockSlots[12].id,
    pairedSlotId: null,
    memberName: "Sister Martinez",
    email: "martinez@example.com",
    phone: "8015554007",
    isLargeFamily: false,
    rescheduleToken: "d623c6af-2bf7-4c9d-a06f-f47d4b346d6e",
    status: "confirmed",
    reminderEmailSent: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_ADMIN_PASSWORD = "demo-admin";

const ensureSlotExists = (slotId: string) => {
  const slot = mockSlots.find((item) => item.id === slotId);
  if (!slot) {
    throw new Error("Selected time slot no longer exists.");
  }

  if (slot.isBuffer || slot.isBlocked) {
    throw new Error("This time slot is unavailable.");
  }

  return slot;
};

const getBookedSlotIds = () => {
  return new Set(
    mockAppointments
      .filter((appointment) => appointment.status === "confirmed")
      .flatMap((appointment) => [appointment.timeSlotId, appointment.pairedSlotId].filter(Boolean) as string[])
  );
};

export const getDays = () => {
  return seedDays.filter((day) => day.isActive);
};

export const getSlotsForDay = (dayId: string): PublicSlotView[] => {
  const bookedSlotIds = getBookedSlotIds();

  return mockSlots
    .filter((slot) => slot.dayId === dayId)
    .map((slot) => {
      const appointment = mockAppointments.find(
        (item) => item.status === "confirmed" && (item.timeSlotId === slot.id || item.pairedSlotId === slot.id)
      );

      return {
        ...slot,
        isReserved: bookedSlotIds.has(slot.id),
        appointmentId: appointment?.id,
      };
    });
};

export const getAllPublicSlots = () => {
  return getDays().flatMap((day) => getSlotsForDay(day.id).map((slot) => ({ ...slot, dayDate: day.date })));
};

export const getAppointmentByToken = (token: string) => {
  return mockAppointments.find(
    (appointment) => appointment.rescheduleToken === token && appointment.status === "confirmed"
  );
};

export const getAppointmentById = (id: string) => {
  return mockAppointments.find((appointment) => appointment.id === id);
};

export const getAdminSchedule = () => {
  const dayList = getDays();

  return dayList.map((day) => ({
    day,
    slots: getSlotsForDay(day.id).map((slot) => {
      const appointment = mockAppointments.find(
        (item) => item.status === "confirmed" && (item.timeSlotId === slot.id || item.pairedSlotId === slot.id)
      );

      return {
        ...slot,
        appointment,
      };
    }),
  }));
};

export const generateScheduleForDay = (
  date: string,
  startTime: string,
  endTime: string,
  intervalMinutes: number,
  bufferEveryMinutes: number,
  notes = "Auto-generated"
) => {
  if (seedDays.some((day) => day.date === date)) throw new Error("A schedule already exists for that date.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid date.");
  if (!Number.isInteger(intervalMinutes) || intervalMinutes < 5 || intervalMinutes > 60) throw new Error("Interval must be between 5 and 60 minutes.");
  if (!Number.isInteger(bufferEveryMinutes) || bufferEveryMinutes < intervalMinutes) throw new Error("Buffer interval is invalid.");
  const dayId = `day-${Date.now()}`;
  const day: DayRecord = {
    id: dayId,
    date,
    isActive: true,
    notes,
  };

  const derivedSlots: TimeSlotRecord[] = [];
  const start = new Date(`2024-01-01T${startTime}:00`);
  const end = new Date(`2024-01-01T${endTime}:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) throw new Error("End time must be after start time.");

  for (let current = new Date(start); current < end; current = new Date(current.getTime() + intervalMinutes * 60000)) {
    const slotStart = current.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    const slotEnd = new Date(current.getTime() + intervalMinutes * 60000).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const bufferOffset = Math.floor((current.getTime() - start.getTime()) / 60000) / bufferEveryMinutes;
    const isBuffer = Number.isInteger(bufferOffset) && bufferOffset > 0 && bufferOffset % 1 === 0;

    derivedSlots.push(
      makeSlot(`${dayId}-${slotStart.replace(":", "")}`, dayId, slotStart, slotEnd, isBuffer)
    );
  }

  seedDays.push(day);
  mockSlots.push(...derivedSlots);

  return { day, slots: derivedSlots };
};

export const toggleSlotBlocked = (slotId: string) => {
  const slot = mockSlots.find((item) => item.id === slotId);
  if (!slot) return null;

  if (getBookedSlotIds().has(slotId)) {
    throw new Error("A reserved slot cannot be blocked.");
  }
  slot.isBlocked = !slot.isBlocked;
  return slot;
};

export const cancelAppointment = (appointmentId: string) => {
  const appointment = mockAppointments.find((item) => item.id === appointmentId);
  if (!appointment) return null;

  appointment.status = "cancelled";
  appointment.updatedAt = new Date().toISOString();

  return appointment;
};

export const createWalkInAppointment = (slotId: string, memberName: string, phone: string) => {
  const slot = ensureSlotExists(slotId);
  if (getBookedSlotIds().has(slot.id)) throw new Error("This slot is already reserved.");
  const appointment: AppointmentRecord = {
    id: `appt-${Date.now()}`,
    timeSlotId: slot.id,
    pairedSlotId: null,
    memberName,
    email: "walk-in@ward.local",
    phone,
    isLargeFamily: false,
    rescheduleToken: crypto.randomUUID(),
    status: "confirmed",
    reminderEmailSent: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockAppointments.push(appointment);
  return appointment;
};

export const createReservation = ({
  dayId,
  slotId,
  memberName,
  email,
  phone,
  isLargeFamily,
}: BookingInput) => {
  const day = seedDays.find((item) => item.id === dayId);
  if (!day || !day.isActive) {
    throw new Error("That date is not currently active.");
  }

  const primarySlot = ensureSlotExists(slotId);
  const bookedSlotIds = getBookedSlotIds();

  if (bookedSlotIds.has(primarySlot.id)) {
    throw new Error("This slot is already reserved.");
  }

  let pairedSlotId: string | null = null;

  if (isLargeFamily) {
    const nextSlot = mockSlots.find(
      (slot) => slot.dayId === dayId && slot.startTime === primarySlot.endTime
    );

    if (!nextSlot) {
      throw new Error("A 20-minute double block is not available for the selected slot.");
    }

    if (bookedSlotIds.has(nextSlot.id) || nextSlot.isBuffer || nextSlot.isBlocked) {
      throw new Error("The following slot is not open for a double block reservation.");
    }

    pairedSlotId = nextSlot.id;
  }

  const appointment: AppointmentRecord = {
    id: `appt-${Date.now()}`,
    timeSlotId: primarySlot.id,
    pairedSlotId,
    memberName,
    email,
    phone,
    isLargeFamily,
    rescheduleToken: crypto.randomUUID(),
    status: "confirmed",
    reminderEmailSent: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockAppointments.push(appointment);

  return appointment;
};

export const rescheduleAppointment = (token: string, newSlotId: string) => {
  const appointment = getAppointmentByToken(token);
  if (!appointment) {
    throw new Error("That reschedule link is no longer valid.");
  }

  const targetSlot = ensureSlotExists(newSlotId);
  const bookedSlotIds = getBookedSlotIds();

  if (bookedSlotIds.has(targetSlot.id) && appointment.timeSlotId !== targetSlot.id) {
    throw new Error("The selected time is already reserved.");
  }

  let pairedSlotId: string | null = null;
  if (appointment.isLargeFamily) {
    const nextSlot = mockSlots.find((slot) => slot.dayId === targetSlot.dayId && slot.startTime === targetSlot.endTime);
    if (!nextSlot || nextSlot.isBuffer || nextSlot.isBlocked ||
        (bookedSlotIds.has(nextSlot.id) && nextSlot.id !== appointment.pairedSlotId)) {
      throw new Error("A 20-minute double block is not available at that time.");
    }
    pairedSlotId = nextSlot.id;
  }
  appointment.timeSlotId = targetSlot.id;
  appointment.pairedSlotId = pairedSlotId;
  appointment.updatedAt = new Date().toISOString();

  return appointment;
};

export const updateDay = (dayId: string, date: string, notes: string) => {
  const day = seedDays.find((item) => item.id === dayId);
  if (!day) throw new Error("Declaration day not found.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid date.");
  if (seedDays.some((item) => item.id !== dayId && item.date === date)) throw new Error("A schedule already exists for that date.");
  day.date = date; day.notes = notes; return day;
};

export const addTimeSlot = (dayId: string, startTime: string, endTime: string, isBuffer: boolean) => {
  if (!seedDays.some((day) => day.id === dayId)) throw new Error("Declaration day not found.");
  if (mockSlots.some((slot) => slot.dayId === dayId && slot.startTime === startTime)) throw new Error("A slot already starts at that time.");
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) throw new Error("End time must be after start time.");
  const created = makeSlot(`slot-${Date.now()}`, dayId, startTime, endTime, isBuffer); mockSlots.push(created); return created;
};

export const deleteTimeSlot = (slotId: string) => {
  const index = mockSlots.findIndex((slot) => slot.id === slotId);
  if (index < 0) throw new Error("Time slot not found.");
  if (mockAppointments.some((item) => item.timeSlotId === slotId || item.pairedSlotId === slotId)) throw new Error("A slot with appointment history cannot be deleted.");
  mockSlots.splice(index, 1);
};

export const getAppointmentSlot = (appointment: AppointmentRecord) => {
  const slot = mockSlots.find((item) => item.id === appointment.timeSlotId);
  const day = slot && seedDays.find((item) => item.id === slot.dayId);
  return slot && day ? { ...slot, dayDate: day.date } : undefined;
};

export const getAppointmentsForDate = (date: string) => {
  const dayIds = new Set(seedDays.filter((day) => day.date === date).map((day) => day.id));
  const slotIds = new Set(mockSlots.filter((slot) => dayIds.has(slot.dayId)).map((slot) => slot.id));
  return mockAppointments.filter((appointment) =>
    appointment.status === "confirmed" && !appointment.reminderEmailSent && slotIds.has(appointment.timeSlotId));
};

export const markReminderSent = (appointmentId: string) => {
  const appointment = mockAppointments.find((item) => item.id === appointmentId);
  if (appointment) appointment.reminderEmailSent = true;
};
import "server-only";
export { ADMIN_PHONE } from "./public-config";
