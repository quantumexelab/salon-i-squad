export type DummyService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
};

/** @deprecated Prefer generateTimeSlots() from business hours settings. */
export const DUMMY_TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
] as const;

export function formatLkr(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-LK")}`;
}
