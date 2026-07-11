import type { UserRole } from "@/types/firestore";

export type ClosedDay = {
  id: string;
  dateKey: string; // yyyy-MM-dd
  note?: string;
  createdAt: string;
  createdBy?: string;
};

export type TimeBuffer = {
  id: string;
  dateKey: string; // yyyy-MM-dd
  startTime: string; // e.g. 12:00 PM
  endTime: string;
  label?: string;
  createdAt: string;
  createdBy?: string;
};

export type BookableSlotBooking = {
  id: string;
  dateKey?: string;
  selectedDate: string;
  selectedTime: string;
  duration: number;
  status: string;
};
