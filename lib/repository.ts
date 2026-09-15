import "server-only";

import * as mock from "./mock-store";
import { hasSupabaseConfiguration } from "./supabase";
import { supabaseRepository } from "./supabase-repository";
import type { AppointmentRecord, BookingInput, DayRecord, PublicSlotView, TimeSlotRecord } from "./mock-store";

export type AdminSchedule = Array<{
  day: DayRecord;
  slots: Array<PublicSlotView & { appointment?: AppointmentRecord }>;
}>;

export interface ScheduleRepository {
  getWardName(): Promise<string>;
  updateWardName(name: string): Promise<string>;
  getAdminPhone(): Promise<string>;
  updateAdminPhone(phone: string): Promise<string>;
  getDays(): Promise<DayRecord[]>;
  getSlotsForDay(dayId: string): Promise<PublicSlotView[]>;
  getAllPublicSlots(): Promise<Array<PublicSlotView & { dayDate: string }>>;
  getAppointmentByToken(token: string): Promise<AppointmentRecord | undefined>;
  getAppointmentSlot(appointment: AppointmentRecord): Promise<(TimeSlotRecord & { dayDate: string }) | undefined>;
  getAdminSchedule(): Promise<AdminSchedule>;
  generateScheduleForDay(date: string, startTime: string, endTime: string, intervalMinutes: number, bufferEveryMinutes: number, notes?: string): Promise<unknown>;
  updateDay(dayId: string, date: string, notes: string): Promise<unknown>;
  addTimeSlot(dayId: string, startTime: string, endTime: string, isBuffer: boolean): Promise<unknown>;
  deleteTimeSlot(slotId: string): Promise<void>;
  toggleSlotBlocked(slotId: string): Promise<unknown>;
  cancelAppointment(appointmentId: string): Promise<unknown>;
  createWalkInAppointment(slotId: string, memberName: string, phone: string): Promise<AppointmentRecord>;
  createReservation(input: BookingInput): Promise<AppointmentRecord>;
  rescheduleAppointment(token: string, newSlotId: string): Promise<AppointmentRecord>;
  getAppointmentsForDate(date: string): Promise<AppointmentRecord[]>;
  markReminderSent(appointmentId: string): Promise<void>;
}

const mockRepository: ScheduleRepository = {
  getWardName: async () => mock.getWardName(),
  updateWardName: async (name) => mock.updateWardName(name),
  getAdminPhone: async () => mock.getAdminPhone(),
  updateAdminPhone: async (phone) => mock.updateAdminPhone(phone),
  getDays: async () => mock.getDays(),
  getSlotsForDay: async (id) => mock.getSlotsForDay(id),
  getAllPublicSlots: async () => mock.getAllPublicSlots(),
  getAppointmentByToken: async (token) => mock.getAppointmentByToken(token),
  getAppointmentSlot: async (appointment) => mock.getAppointmentSlot(appointment),
  getAdminSchedule: async () => mock.getAdminSchedule(),
  generateScheduleForDay: async (...args) => mock.generateScheduleForDay(...args),
  updateDay: async (...args) => mock.updateDay(...args),
  addTimeSlot: async (...args) => mock.addTimeSlot(...args),
  deleteTimeSlot: async (id) => { mock.deleteTimeSlot(id); },
  toggleSlotBlocked: async (id) => mock.toggleSlotBlocked(id),
  cancelAppointment: async (id) => mock.cancelAppointment(id),
  createWalkInAppointment: async (...args) => mock.createWalkInAppointment(...args),
  createReservation: async (input) => mock.createReservation(input),
  rescheduleAppointment: async (...args) => mock.rescheduleAppointment(...args),
  getAppointmentsForDate: async (date) => mock.getAppointmentsForDate(date),
  markReminderSent: async (id) => { mock.markReminderSent(id); },
};

export function getRepository(): ScheduleRepository {
  return hasSupabaseConfiguration() ? supabaseRepository : mockRepository;
}
