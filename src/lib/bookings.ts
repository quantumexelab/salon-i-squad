import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import { toDateKey } from "@/lib/calendar-utils";
import type { DummyService } from "@/lib/booking/dummy-services";
import type { Service } from "@/types/firestore";

export type BookingStatusUpdate = "completed" | "cancelled";
export type PaymentMethod = "cash" | "card";

export type CreateBookingInput = {
  userId: string;
  service:
    | Pick<Service, "id" | "name" | "durationMinutes" | "price">
    | DummyService;
  selectedDate: Date;
  selectedTime: string;
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
  /** Optional note stored on the booking (e.g. consultation). */
  notes?: string;
  isConsultation?: boolean;
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
  dateKey?: string;
  phoneNumber?: string;
  customerName?: string;
  customerEmail?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  isConsultation?: boolean;
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

function mapBookingDoc(
  id: string,
  data: Record<string, unknown>,
): SavedBooking {
  const phoneNumber = String(
    data.phoneNumber ?? data.customerMobile ?? data.mobile ?? "",
  );
  const paymentRaw = String(data.paymentMethod ?? "").toLowerCase();
  const paymentMethod: PaymentMethod | undefined =
    paymentRaw === "cash" || paymentRaw === "card" ? paymentRaw : undefined;

  return {
    id,
    userId: String(data.userId ?? ""),
    serviceId: String(data.serviceId ?? ""),
    serviceName: String(data.serviceName ?? "Service"),
    duration: Number(data.duration ?? 0),
    price: Number(data.price ?? 0),
    selectedDate: String(data.selectedDate ?? ""),
    selectedTime: String(data.selectedTime ?? ""),
    dateKey: data.dateKey ? String(data.dateKey) : undefined,
    phoneNumber: phoneNumber || undefined,
    customerName: data.customerName
      ? String(data.customerName)
      : undefined,
    customerEmail: data.customerEmail
      ? String(data.customerEmail)
      : undefined,
    paymentMethod,
    notes: data.notes ? String(data.notes) : undefined,
    isConsultation: Boolean(data.isConsultation),
    status: String(data.status ?? "confirmed"),
    createdAt: String(data.createdAt ?? ""),
  };
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<SavedBooking> {
  initFirebase();
  const db = getFirebaseDb();
  const now = new Date().toISOString();
  const selectedDate = input.selectedDate.toISOString();
  const dateKey = toDateKey(input.selectedDate);

  const payload = {
    userId: input.userId,
    serviceId: input.service.id,
    serviceName: input.service.name,
    duration: input.service.durationMinutes,
    price: input.service.price,
    selectedDate,
    selectedTime: input.selectedTime,
    dateKey,
    phoneNumber: input.phoneNumber,
    customerName: input.customerName ?? "",
    customerEmail: input.customerEmail ?? "",
    notes: input.notes?.trim() || "",
    isConsultation: Boolean(input.isConsultation),
    status: "confirmed" as const,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, COLLECTIONS.bookings), payload);

  return {
    id: ref.id,
    ...payload,
    customerName: payload.customerName || undefined,
    customerEmail: payload.customerEmail || undefined,
    notes: payload.notes || undefined,
    isConsultation: payload.isConsultation || undefined,
  };
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatusUpdate,
): Promise<void> {
  initFirebase();
  const db = getFirebaseDb();

  await updateDoc(doc(db, COLLECTIONS.bookings, bookingId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

/** Mark booking completed and record how the client paid. */
export async function completeBookingWithPayment(
  bookingId: string,
  paymentMethod: PaymentMethod,
): Promise<void> {
  initFirebase();
  const db = getFirebaseDb();

  await updateDoc(doc(db, COLLECTIONS.bookings, bookingId), {
    status: "completed",
    paymentMethod,
    updatedAt: new Date().toISOString(),
  });
}

export async function cancelBooking(bookingId: string): Promise<void> {
  initFirebase();
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.bookings, bookingId), {
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  });
}

export async function rescheduleBooking(
  bookingId: string,
  input: { selectedDate: Date; selectedTime: string },
): Promise<void> {
  initFirebase();
  const selectedDate = input.selectedDate.toISOString();
  const dateKey = toDateKey(input.selectedDate);

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.bookings, bookingId), {
    selectedDate,
    selectedTime: input.selectedTime,
    dateKey,
    status: "confirmed",
    updatedAt: new Date().toISOString(),
  });
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
      const bookings = snapshot.docs.map((docSnap) =>
        mapBookingDoc(docSnap.id, docSnap.data()),
      );
      onData(sortBookingsChronologically(bookings));
    },
    (error) => onError?.(error),
  );
}

/** Bookings for the signed-in client (own history). */
export function subscribeToUserBookings(
  userId: string,
  onData: (bookings: SavedBooking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const bookingsQuery = query(
    collection(getFirebaseDb(), COLLECTIONS.bookings),
    where("userId", "==", userId),
  );

  return onSnapshot(
    bookingsQuery,
    (snapshot) => {
      const bookings = snapshot.docs.map((docSnap) =>
        mapBookingDoc(docSnap.id, docSnap.data()),
      );
      onData(sortBookingsChronologically(bookings));
    },
    (error) => onError?.(error),
  );
}

/** Confirmed bookings for client-side slot availability. */
export function subscribeToConfirmedBookings(
  onData: (bookings: SavedBooking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const bookingsQuery = query(
    collection(getFirebaseDb(), COLLECTIONS.bookings),
    where("status", "==", "confirmed"),
  );

  return onSnapshot(
    bookingsQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((docSnap) =>
          mapBookingDoc(docSnap.id, docSnap.data()),
        ),
      );
    },
    (error) => onError?.(error),
  );
}
