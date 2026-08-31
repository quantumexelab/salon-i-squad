import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import { toDateKey, parseSlotMinutes } from "@/lib/calendar-utils";
import type { DummyService } from "@/lib/booking/dummy-services";
import type {
  BookingGender,
  BookingStatus,
  PaymentMethod,
  Service,
} from "@/types/firestore";

export type { PaymentMethod };

export type BookingStatusUpdate = "completed" | "cancelled" | "no_show";

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
  customerGender?: BookingGender;
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
  appointmentNumber?: number;
  phoneNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerGender?: BookingGender;
  paymentMethod?: PaymentMethod;
  notes?: string;
  isConsultation?: boolean;
  googleCalendarEventId?: string;
  status: string;
  cancelReason?: string;
  cancelledBy?: "client" | "admin" | "system";
  adminNotes?: string;
  hairType?: string;
  conditions?: string;
  checkedInAt?: string;
  noShowDeadlineAt?: string;
  reminderSentAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type CompleteBookingInput = {
  paymentMethod: PaymentMethod;
  adminNotes?: string;
  hairType?: string;
  conditions?: string;
  syncToUserProfile?: boolean;
};

export type CancelBookingInput = {
  cancelReason?: string;
  cancelledBy: "client" | "admin" | "system";
};

async function nextAppointmentNumber(dateKey: string): Promise<number> {
  initFirebase();
  const db = getFirebaseDb();
  const counterRef = doc(db, COLLECTIONS.appointmentCounters, dateKey);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists() ? Number(snap.data()?.lastNumber ?? 0) : 0;
    const next = current + 1;
    transaction.set(
      counterRef,
      { lastNumber: next, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return next;
  });
}

function assertBookingSlotNotInPast(
  selectedDate: Date,
  selectedTime: string,
  now = new Date(),
): void {
  if (toDateKey(selectedDate) !== toDateKey(now)) return;

  const slotStart = parseSlotMinutes(selectedTime);
  if (Number.isNaN(slotStart)) {
    throw new Error("Invalid time slot.");
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (slotStart <= nowMinutes) {
    throw new Error("This time has already passed. Please choose a later slot.");
  }
}

function bookingSortKey(booking: SavedBooking): number {
  const dateMs = Date.parse(booking.selectedDate);
  if (Number.isNaN(dateMs)) return 0;
  return dateMs + parseSlotMinutes(booking.selectedTime) * 60_000;
}

export function sortBookingsChronologically(
  bookings: SavedBooking[],
): SavedBooking[] {
  return [...bookings].sort((a, b) => {
    const bySchedule = bookingSortKey(a) - bookingSortKey(b);
    if (bySchedule !== 0) return bySchedule;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

/** Admin list: appointment number first, then time. */
export function sortBookingsByAppointmentNumber(
  bookings: SavedBooking[],
): SavedBooking[] {
  return [...bookings].sort((a, b) => {
    const aNum = a.appointmentNumber ?? Number.MAX_SAFE_INTEGER;
    const bNum = b.appointmentNumber ?? Number.MAX_SAFE_INTEGER;
    if (aNum !== bNum) return aNum - bNum;
    const byTime =
      parseSlotMinutes(a.selectedTime) - parseSlotMinutes(b.selectedTime);
    if (!Number.isNaN(byTime) && byTime !== 0) return byTime;
    return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });
}

/** Same-day admin list: earliest appointment time first. */
export function sortBookingsByTimeAsc(
  bookings: SavedBooking[],
): SavedBooking[] {
  return sortBookingsByAppointmentNumber(bookings);
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

  const cancelledByRaw = String(data.cancelledBy ?? "");
  const cancelledBy =
    cancelledByRaw === "client" ||
    cancelledByRaw === "admin" ||
    cancelledByRaw === "system"
      ? cancelledByRaw
      : undefined;

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
    appointmentNumber:
      data.appointmentNumber != null
        ? Number(data.appointmentNumber)
        : undefined,
    phoneNumber: phoneNumber || undefined,
    customerName: data.customerName
      ? String(data.customerName)
      : undefined,
    customerEmail: data.customerEmail
      ? String(data.customerEmail)
      : undefined,
    customerGender:
      data.customerGender === "male" || data.customerGender === "female"
        ? data.customerGender
        : undefined,
    paymentMethod,
    notes: data.notes ? String(data.notes) : undefined,
    isConsultation: Boolean(data.isConsultation),
    googleCalendarEventId: data.googleCalendarEventId
      ? String(data.googleCalendarEventId)
      : undefined,
    status: String(data.status ?? "confirmed"),
    cancelReason: data.cancelReason ? String(data.cancelReason) : undefined,
    cancelledBy,
    adminNotes: data.adminNotes ? String(data.adminNotes) : undefined,
    hairType: data.hairType ? String(data.hairType) : undefined,
    conditions: data.conditions ? String(data.conditions) : undefined,
    checkedInAt: data.checkedInAt ? String(data.checkedInAt) : undefined,
    noShowDeadlineAt: data.noShowDeadlineAt
      ? String(data.noShowDeadlineAt)
      : undefined,
    reminderSentAt: data.reminderSentAt
      ? String(data.reminderSentAt)
      : undefined,
    completedAt: data.completedAt ? String(data.completedAt) : undefined,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
  };
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<SavedBooking> {
  assertBookingSlotNotInPast(input.selectedDate, input.selectedTime);

  initFirebase();
  const db = getFirebaseDb();
  const now = new Date().toISOString();
  const selectedDate = input.selectedDate.toISOString();
  const dateKey = toDateKey(input.selectedDate);
  const appointmentNumber = await nextAppointmentNumber(dateKey);

  const payload = {
    userId: input.userId,
    serviceId: input.service.id,
    serviceName: input.service.name,
    duration: input.service.durationMinutes,
    price: input.service.price,
    selectedDate,
    selectedTime: input.selectedTime,
    dateKey,
    appointmentNumber,
    phoneNumber: input.phoneNumber,
    customerName: input.customerName ?? "",
    customerEmail: input.customerEmail ?? "",
    customerGender: input.customerGender ?? "",
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
    customerGender:
      payload.customerGender === "male" || payload.customerGender === "female"
        ? payload.customerGender
        : undefined,
    notes: payload.notes || undefined,
    isConsultation: payload.isConsultation || undefined,
  };
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatusUpdate,
  extra?: Partial<CancelBookingInput>,
): Promise<void> {
  initFirebase();
  const db = getFirebaseDb();

  await updateDoc(doc(db, COLLECTIONS.bookings, bookingId), {
    status,
    ...(extra?.cancelReason ? { cancelReason: extra.cancelReason } : {}),
    ...(extra?.cancelledBy ? { cancelledBy: extra.cancelledBy } : {}),
    updatedAt: new Date().toISOString(),
  });
}

export async function completeBookingWithPayment(
  bookingId: string,
  input: CompleteBookingInput,
): Promise<void> {
  initFirebase();
  const db = getFirebaseDb();
  const now = new Date().toISOString();

  await updateDoc(doc(db, COLLECTIONS.bookings, bookingId), {
    status: "completed",
    paymentMethod: input.paymentMethod,
    adminNotes: input.adminNotes?.trim() || "",
    hairType: input.hairType?.trim() || "",
    conditions: input.conditions?.trim() || "",
    completedAt: now,
    updatedAt: now,
  });
}

export async function cancelBookingWithReason(
  bookingId: string,
  input: CancelBookingInput,
): Promise<void> {
  initFirebase();
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.bookings, bookingId), {
    status: "cancelled",
    cancelReason: input.cancelReason?.trim() || "",
    cancelledBy: input.cancelledBy,
    updatedAt: new Date().toISOString(),
  });
}

export async function cancelBooking(bookingId: string): Promise<void> {
  await cancelBookingWithReason(bookingId, { cancelledBy: "client" });
}

export async function checkInBooking(bookingId: string): Promise<void> {
  initFirebase();
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.bookings, bookingId), {
    checkedInAt: new Date().toISOString(),
    noShowDeadlineAt: "",
    updatedAt: new Date().toISOString(),
  });
}

export async function setBookingNoShowDeadline(
  bookingId: string,
  deadlineIso: string,
): Promise<void> {
  initFirebase();
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.bookings, bookingId), {
    noShowDeadlineAt: deadlineIso,
    updatedAt: new Date().toISOString(),
  });
}

export async function setBookingCalendarEventId(
  bookingId: string,
  eventId: string | null,
): Promise<void> {
  initFirebase();
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.bookings, bookingId), {
    googleCalendarEventId: eventId,
    updatedAt: new Date().toISOString(),
  });
}

export async function rescheduleBooking(
  bookingId: string,
  input: { selectedDate: Date; selectedTime: string },
): Promise<void> {
  assertBookingSlotNotInPast(input.selectedDate, input.selectedTime);

  initFirebase();
  const selectedDate = input.selectedDate.toISOString();
  const dateKey = toDateKey(input.selectedDate);
  const appointmentNumber = await nextAppointmentNumber(dateKey);

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.bookings, bookingId), {
    selectedDate,
    selectedTime: input.selectedTime,
    dateKey,
    appointmentNumber,
    status: "confirmed",
    checkedInAt: "",
    noShowDeadlineAt: "",
    updatedAt: new Date().toISOString(),
  });
}

/** Currently serving = highest completed appointment number today, or in-progress confirmed with check-in. */
export function getCurrentlyServingNumber(
  bookings: SavedBooking[],
): number | null {
  const todayKey = toDateKey(new Date());
  const today = bookings.filter((b) => b.dateKey === todayKey);
  const completed = today
    .filter((b) => b.status === "completed" && b.appointmentNumber != null)
    .map((b) => b.appointmentNumber!);
  if (completed.length === 0) return null;
  return Math.max(...completed);
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

export function subscribeToAdminBookingsByDate(
  dateKey: string,
  onData: (bookings: SavedBooking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const db = getFirebaseDb();
  const bookingsQuery = query(
    collection(db, COLLECTIONS.bookings),
    where("dateKey", "==", dateKey),
  );

  return onSnapshot(
    bookingsQuery,
    (snapshot) => {
      const bookings = snapshot.docs.map((docSnap) =>
        mapBookingDoc(docSnap.id, docSnap.data()),
      );
      onData(sortBookingsByAppointmentNumber(bookings));
    },
    (error) => onError?.(error),
  );
}

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

export function clientOwnsBooking(
  booking: Pick<SavedBooking, "userId" | "phoneNumber" | "customerEmail">,
  userId: string,
  profilePhone: string,
  userEmail?: string | null,
): boolean {
  if (booking.userId === userId) return true;
  if (userEmail && booking.customerEmail === userEmail) return true;
  if (profilePhone && booking.phoneNumber === profilePhone) return true;
  return false;
}

export function subscribeToClientBookings(
  userId: string,
  profilePhone: string | undefined,
  onData: (bookings: SavedBooking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const phone = profilePhone?.trim();
  let uidBookings: SavedBooking[] = [];
  let phoneBookings: SavedBooking[] = [];

  function mergeAndEmit() {
    const byId = new Map<string, SavedBooking>();
    for (const booking of [...uidBookings, ...phoneBookings]) {
      byId.set(booking.id, booking);
    }
    onData(sortBookingsChronologically([...byId.values()]));
  }

  const unsubUid = subscribeToUserBookings(
    userId,
    (bookings) => {
      uidBookings = bookings;
      mergeAndEmit();
    },
    onError,
  );

  if (!phone) {
    return unsubUid;
  }

  initFirebase();
  const phoneQuery = query(
    collection(getFirebaseDb(), COLLECTIONS.bookings),
    where("phoneNumber", "==", phone),
    where("status", "==", "confirmed"),
  );

  const unsubPhone = onSnapshot(
    phoneQuery,
    (snapshot) => {
      phoneBookings = snapshot.docs.map((docSnap) =>
        mapBookingDoc(docSnap.id, docSnap.data()),
      );
      mergeAndEmit();
    },
    (error) => {
      const code = (error as { code?: string }).code;
      if (code === "permission-denied" || code === "failed-precondition") {
        phoneBookings = [];
        mergeAndEmit();
        return;
      }
      onError?.(error);
    },
  );

  return () => {
    unsubUid();
    unsubPhone();
  };
}

export function subscribeToBookingsByUserId(
  userId: string,
  onData: (bookings: SavedBooking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToUserBookings(userId, onData, onError);
}

export async function fetchBookingsByPhone(
  phone: string,
): Promise<SavedBooking[]> {
  initFirebase();
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.bookings),
      where("phoneNumber", "==", phone),
    ),
  );
  return snap.docs
    .map((d) => mapBookingDoc(d.id, d.data()))
    .sort((a, b) => bookingSortKey(b) - bookingSortKey(a));
}

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

export function subscribeToTodayBookingsForQueue(
  onData: (bookings: SavedBooking[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const dateKey = toDateKey(new Date());
  return subscribeToAdminBookingsByDate(dateKey, onData, onError);
}
