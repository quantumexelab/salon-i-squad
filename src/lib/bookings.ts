import { addDoc, collection } from "firebase/firestore";
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
  status: "confirmed";
  createdAt: string;
};

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
