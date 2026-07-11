export type DummyService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
};

export const DUMMY_SERVICES: DummyService[] = [
  {
    id: "haircut",
    name: "Haircut",
    description: "Classic cut and finish",
    durationMinutes: 30,
    price: 1500,
  },
  {
    id: "beard-trim",
    name: "Beard Trim",
    description: "Shape and tidy your beard",
    durationMinutes: 15,
    price: 800,
  },
  {
    id: "hair-coloring",
    name: "Hair Coloring",
    description: "Full color treatment",
    durationMinutes: 60,
    price: 4500,
  },
  {
    id: "haircut-beard",
    name: "Haircut + Beard",
    description: "Complete grooming package",
    durationMinutes: 45,
    price: 2200,
  },
];

/** Dummy slots — Firestore availability comes later. */
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
