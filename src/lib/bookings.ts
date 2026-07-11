import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import type { DummyService } from "@/lib/booking/dummy-services";

export type CreateBookingInput = {
  userId: string;
  service: DummyService;
  selectedDate: Date;
  selectedTime: string;
};

export type SavedBooking = {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  duration: number;
  price: number;
  selectedDate: string;
  selectedTime: string;
  status: string;
  createdAt: string;
};

function parseSlotMinutes(slot: string): number {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function bookingSortKey(booking: SavedBooking): number {
  const dateMs = Date.parse(booking.selectedDate);
  if (Number.isNaN(dateMs)) return 0;
  return dateMs + parseSlotMinutes(booking.selectedTime) * 60_000;
}

/** Upcoming first; if equal, newest createdAt first. */
export function sortBookingsChronologically(
  bookings: SavedBooking[],
): SavedBooking[] {
  return [...bookings].sort((a, b) => {
    const bySchedule = bookingSortKey(a) - bookingSortKey(b);
    if (bySchedule !== 0) return bySchedule;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<SavedBooking> {
  initFirebase();
  const db = getFirebaseDb();
  const now = new Date().toISOString();
  const selectedDate = input.selectedDate.toISOString();

  const payload = {
    userId: input.userId,
    serviceId: input.service.id,
    serviceName: input.service.name,
    duration: input.service.durationMinutes,
    price: input.service.price,
    selectedDate,
    selectedTime: input.selectedTime,
    status: "confirmed" as const,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, COLLECTIONS.bookings), payload);

  return {
    id: ref.id,
    ...payload,
  };
}

export function subscribeToBookings(
  onData: (bookings: SavedBooking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const db = getFirebaseDb();
  const bookingsQuery = query(
    collection(db, COLLECTIONS.bookings),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    bookingsQuery,
    (snapshot) => {
      const bookings = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(data.userId ?? ""),
          serviceId: String(data.serviceId ?? ""),
          serviceName: String(data.serviceName ?? "Service"),
          duration: Number(data.duration ?? 0),
          price: Number(data.price ?? 0),
          selectedDate: String(data.selectedDate ?? ""),
          selectedTime: String(data.selectedTime ?? ""),
          status: String(data.status ?? "confirmed"),
          createdAt: String(data.createdAt ?? ""),
        } satisfies SavedBooking;
      });

      onData(sortBookingsChronologically(bookings));
    },
    (error) => {
      onError?.(error);
    },
  );
}
