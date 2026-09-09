/**
 * Firestore Database Access Layer for WhatsApp Chatbot
 * Supports both Firebase Admin (service account) and Firebase Client SDK fallback.
 */

import { getApps, initializeApp as initAdminApp, cert, type App } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  filterAvailableSlots,
  generateTimeSlots,
  getSriLankaNow,
  parseSlotMinutes,
  toDateKey,
} from "@/lib/calendar-utils";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/settings";

export type SelectedServiceItem = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  requiresConsultation?: boolean;
};

export type WhatsAppSession = {
  phone: string;
  language?: "en" | "si" | "ta";
  step:
    | "LANGUAGE_SELECT"
    | "MAIN_MENU"
    | "SERVICE_SELECT"
    | "SERVICE_CONFIRM"
    | "STAFF_SELECT"
    | "DATE_SELECT"
    | "TIME_SELECT"
    | "CONFIRM_BOOKING"
    | "MY_BOOKINGS_MENU"
    | "CANCEL_CONFIRM"
    | "RESCHEDULE_SELECT_DATE"
    | "RESCHEDULE_SELECT_TIME"
    | "AWAITING_REVIEW_RATING";
  selectedServices?: SelectedServiceItem[];
  selectedServiceId?: string;
  selectedServiceName?: string;
  selectedServicePrice?: number;
  selectedServiceDuration?: number;
  selectedStaffId?: string;
  selectedStaffName?: string;
  selectedDateKey?: string; // YYYY-MM-DD
  selectedTime?: string; // e.g. "10:30 AM"
  rescheduleBookingId?: string;
  customerName?: string;
  updatedAt: number;
};

// In-memory cache for fast response, backed by Firestore for durability
const sessionCache = new Map<string, WhatsAppSession>();

function getAdminApp(): App | null {
  if (getApps().length > 0) return getApps()[0]!;

  const saRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (!saRaw) return null;

  try {
    const key = JSON.parse(saRaw);
    if (!key.client_email || !key.private_key) return null;

    return initAdminApp({
      credential: cert({
        projectId: key.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: key.client_email,
        privateKey: key.private_key.replace(/\\n/g, "\n"),
      }),
    });
  } catch {
    return null;
  }
}

const DRAFT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes for in-progress draft steps

function sanitizeSession(session: WhatsAppSession): WhatsAppSession {
  const now = Date.now();
  const updatedAt = typeof session.updatedAt === "number" ? session.updatedAt : 0;
  const isStaleDraft =
    session.step !== "MAIN_MENU" &&
    updatedAt > 0 &&
    now - updatedAt > DRAFT_SESSION_TTL_MS;

  const slNow = getSriLankaNow();
  const todayKey = toDateKey(slNow);
  const isPastDate = Boolean(session.selectedDateKey && session.selectedDateKey < todayKey);

  if (isStaleDraft || isPastDate) {
    return {
      phone: session.phone,
      language: session.language || "en",
      customerName: session.customerName,
      step: "MAIN_MENU",
      updatedAt: now,
    };
  }
  return session;
}

/**
 * Get or load customer WhatsApp session state
 */
export async function getWhatsAppSession(phone: string): Promise<WhatsAppSession> {
  const cached = sessionCache.get(phone);
  if (cached) {
    const sanitized = sanitizeSession(cached);
    sessionCache.set(phone, sanitized);
    return sanitized;
  }

  const adminApp = getAdminApp();
  if (adminApp) {
    try {
      const snap = await getAdminFirestore(adminApp)
        .collection("whatsapp_sessions")
        .doc(phone)
        .get();
      if (snap.exists) {
        const data = snap.data() as WhatsAppSession;
        const sanitized = sanitizeSession(data);
        sessionCache.set(phone, sanitized);
        return sanitized;
      }
    } catch (e) {
      console.warn("[Session read admin failed]", e);
    }
  }

  // Fallback to client DB
  try {
    const db = getClientDb();
    const snap = await getDoc(doc(db, "whatsapp_sessions", phone));
    if (snap.exists()) {
      const data = snap.data() as WhatsAppSession;
      const sanitized = sanitizeSession(data);
      sessionCache.set(phone, sanitized);
      return sanitized;
    }
  } catch (e) {
    console.warn("[Session read client failed]", e);
  }

  const defaultSession: WhatsAppSession = {
    phone,
    language: "en",
    step: "MAIN_MENU",
    updatedAt: Date.now(),
  };
  sessionCache.set(phone, defaultSession);
  return defaultSession;
}

/**
 * Save customer WhatsApp session state
 */
export async function saveWhatsAppSession(phone: string, session: WhatsAppSession): Promise<void> {
  session.updatedAt = Date.now();
  sessionCache.set(phone, session);

  const adminApp = getAdminApp();
  if (adminApp) {
    try {
      await getAdminFirestore(adminApp)
        .collection("whatsapp_sessions")
        .doc(phone)
        .set(session, { merge: true });
      return;
    } catch (e) {
      console.warn("[Session save admin failed]", e);
    }
  }

  // Fallback to client DB
  try {
    const auth = getClientAuth();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    const db = getClientDb();
    await setDoc(doc(db, "whatsapp_sessions", phone), session, { merge: true });
  } catch (e) {
    console.warn("[Session save client failed]", e);
  }
}

/**
 * Clear session after booking completes
 */
export async function clearWhatsAppSession(phone: string, language?: "en" | "si" | "ta"): Promise<void> {
  const resetSession: WhatsAppSession = {
    phone,
    language: language || "en",
    step: "MAIN_MENU",
    updatedAt: Date.now(),
  };
  sessionCache.set(phone, resetSession);

  const adminApp = getAdminApp();
  if (adminApp) {
    try {
      await getAdminFirestore(adminApp)
        .collection("whatsapp_sessions")
        .doc(phone)
        .set(resetSession);
      return;
    } catch (e) {
      console.warn("[Session clear admin failed]", e);
    }
  }

  // Fallback to client DB
  try {
    const auth = getClientAuth();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    const db = getClientDb();
    await setDoc(doc(db, "whatsapp_sessions", phone), resetSession);
  } catch (e) {
    console.warn("[Session clear client failed]", e);
  }
}

export type SalonServiceItem = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  requiresConsultation?: boolean;
};

/**
 * Fallback services if Firestore has no catalog entries
 */
const DEFAULT_SERVICES: SalonServiceItem[] = [
  { id: "svc_haircut", name: "Haircut & Beard Grooming", price: 2500, durationMinutes: 45 },
  { id: "svc_fade", name: "Skin Fade / Scissor Cut", price: 2000, durationMinutes: 30 },
  { id: "svc_color", name: "Hair Coloring / Highlights", price: 5500, durationMinutes: 90 },
  { id: "svc_facial", name: "Express Clean-up & Facial", price: 3500, durationMinutes: 45 },
  { id: "svc_keratin", name: "Keratin Treatment / Relaxing", price: 12000, durationMinutes: 120 },
  { id: "svc_headspa", name: "Head Massage & Hair Spa", price: 3000, durationMinutes: 40 },
];

/**
 * Fetch active services from Firestore
 */
export async function getActiveServices(): Promise<SalonServiceItem[]> {
  const adminApp = getAdminApp();
  if (adminApp) {
    try {
      const snap = await getAdminFirestore(adminApp)
        .collection(COLLECTIONS.services)
        .get();
      if (!snap.empty) {
        const list: SalonServiceItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.isActive !== false) {
            list.push({
              id: d.id,
              name: String(data.name || "Service"),
              price: Number(data.price || 0),
              durationMinutes: Number(data.durationMinutes || 30),
              requiresConsultation:
                data.requiresConsultation === true || data.requiresConsultation === "true",
            });
          }
        });
        if (list.length > 0) return list;
      }
    } catch (e) {
      console.warn("[getActiveServices admin failed, falling back to client]", e);
    }
  }

  try {
    const db = getClientDb();
    const snap = await getDocs(collection(db, COLLECTIONS.services));
    if (!snap.empty) {
      const list: SalonServiceItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.isActive !== false) {
          list.push({
            id: d.id,
            name: String(data.name || "Service"),
            price: Number(data.price || 0),
            durationMinutes: Number(data.durationMinutes || 30),
            requiresConsultation:
              data.requiresConsultation === true || data.requiresConsultation === "true",
          });
        }
      });
      if (list.length > 0) return list;
    }
  } catch (e) {
    console.warn("[getActiveServices client failed]", e);
  }

  return DEFAULT_SERVICES;
}

export type StaffItem = {
  id: string;
  name: string;
  role: string;
};

const DEFAULT_STAFF: StaffItem[] = [
  { id: "staff_any", name: "Any Available Stylist", role: "First available specialist" },
  { id: "staff_senior", name: "Senior Stylist", role: "Hair & Styling Specialist" },
  { id: "staff_barber", name: "Executive Barber", role: "Beard & Grooming Specialist" },
];

/**
 * Fetch active staff members from Firestore
 */
export async function getActiveStaff(): Promise<StaffItem[]> {
  const adminApp = getAdminApp();
  if (adminApp) {
    try {
      const snap = await getAdminFirestore(adminApp)
        .collection(COLLECTIONS.staffProfiles)
        .get();
      if (!snap.empty) {
        const list: StaffItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.isActive !== false) {
            list.push({
              id: d.id,
              name: String(data.name || "Stylist"),
              role: String(data.role || "Specialist"),
            });
          }
        });
        if (list.length > 0) return list;
      }
    } catch (e) {
      console.warn("[getActiveStaff admin failed]", e);
    }
  }

  try {
    const db = getClientDb();
    const snap = await getDocs(collection(db, COLLECTIONS.staffProfiles));
    if (!snap.empty) {
      const list: StaffItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.isActive !== false) {
          list.push({
            id: d.id,
            name: String(data.name || "Stylist"),
            role: String(data.role || "Specialist"),
          });
        }
      });
      if (list.length > 0) return list;
    }
  } catch (e) {
    console.warn("[getActiveStaff client failed]", e);
  }

  return DEFAULT_STAFF;
}

/**
 * Calculate available booking time slots for a given dateKey
 */
export async function getAvailableTimeSlots(
  dateKey: string,
  durationMinutes = 30,
): Promise<string[]> {
  const openTime = DEFAULT_BUSINESS_HOURS.openTime;
  const closeTime = DEFAULT_BUSINESS_HOURS.closeTime;

  let closedDays: Array<{ dateKey: string }> = [];
  let buffers: Array<{ dateKey: string; startTime: string; endTime: string }> = [];
  let existingBookings: Array<{
    dateKey?: string;
    selectedDate: string;
    selectedTime: string;
    duration: number;
    status: string;
  }> = [];

  const adminApp = getAdminApp();
  if (adminApp) {
    const db = getAdminFirestore(adminApp);
    try {
      const [closedSnap, buffersSnap, bookingsSnap] = await Promise.all([
        db.collection(COLLECTIONS.closedDays).where("dateKey", "==", dateKey).get(),
        db.collection(COLLECTIONS.buffers).where("dateKey", "==", dateKey).get(),
        db
          .collection(COLLECTIONS.bookings)
          .where("dateKey", "==", dateKey)
          .where("status", "==", "confirmed")
          .get(),
      ]);

      if (!closedSnap.empty) {
        return []; // Closed today
      }

      buffersSnap.forEach((d) => {
        const b = d.data();
        buffers.push({
          dateKey,
          startTime: String(b.startTime || ""),
          endTime: String(b.endTime || ""),
        });
      });

      bookingsSnap.forEach((d) => {
        const b = d.data();
        existingBookings.push({
          dateKey,
          selectedDate: String(b.selectedDate || ""),
          selectedTime: String(b.selectedTime || ""),
          duration: Number(b.duration || 30),
          status: "confirmed",
        });
      });
    } catch (e) {
      console.warn("[getAvailableTimeSlots admin failed]", e);
    }
  }

  const generatedSlots = generateTimeSlots(openTime, closeTime, {
    intervalMinutes: 30,
    durationMinutes,
  });

  const available = filterAvailableSlots(generatedSlots, {
    dateKey,
    durationMinutes,
    bookingPaddingMinutes: 5,
    buffers,
    bookings: existingBookings,
    now: getSriLankaNow(),
  });

  return available;
}

/**
 * Validates if a proposed time is currently bookable
 */
export async function isTimeSlotAvailable(
  dateKey: string,
  timeString: string,
  durationMinutes = 30,
): Promise<{ ok: boolean; error?: string }> {
  const slotMinutes = parseSlotMinutes(timeString);
  if (Number.isNaN(slotMinutes)) {
    return { ok: false, error: "Invalid time format" };
  }

  const now = getSriLankaNow();
  if (dateKey === toDateKey(now)) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (slotMinutes <= nowMinutes + 10) {
      return { ok: false, error: "This time has already passed today." };
    }
  }

  const openMins = parseSlotMinutes(DEFAULT_BUSINESS_HOURS.openTime);
  const closeMins = parseSlotMinutes(DEFAULT_BUSINESS_HOURS.closeTime);
  if (slotMinutes < openMins || slotMinutes >= closeMins) {
    return { ok: false, error: "Time is outside salon opening hours (9:00 AM – 7:00 PM)." };
  }

  const available = await getAvailableTimeSlots(dateKey, durationMinutes);
  if (!available.includes(timeString)) {
    return { ok: false, error: "This time is already booked or overlaps another appointment." };
  }

  return { ok: true };
}

/**
 * Create a confirmed WhatsApp booking in Firestore
 */
export async function createWhatsAppBookingRecord(params: {
  phone: string;
  customerName?: string;
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  dateKey: string;
  selectedTime: string;
  staffId?: string;
  staffName?: string;
  services?: Array<{
    serviceId: string;
    name: string;
    price: number;
    duration: number;
  }>;
}): Promise<{ ok: boolean; appointmentNumber?: number; bookingId?: string; error?: string }> {
  // Prevent any past time booking for today
  const slNow = getSriLankaNow();
  if (params.dateKey === toDateKey(slNow)) {
    const slotStart = parseSlotMinutes(params.selectedTime);
    const nowMinutes = slNow.getHours() * 60 + slNow.getMinutes();
    if (!Number.isNaN(slotStart) && slotStart <= nowMinutes) {
      return { ok: false, error: "This time has already passed today." };
    }
  }

  const now = new Date();
  const selectedDate = new Date(`${params.dateKey}T12:00:00Z`).toISOString();

  const servicesList =
    params.services && params.services.length > 0
      ? params.services
      : [
          {
            serviceId: params.serviceId,
            name: params.serviceName,
            price: params.price,
            duration: params.durationMinutes,
          },
        ];
  const serviceIds = servicesList.map((s) => s.serviceId);

  const adminApp = getAdminApp();
  if (adminApp) {
    const db = getAdminFirestore(adminApp);
    try {
      // Get next appointment number for this dateKey atomically
      const counterRef = db.collection(COLLECTIONS.appointmentCounters).doc(params.dateKey);
      let apptNum = 1;

      await db.runTransaction(async (t) => {
        const snap = await t.get(counterRef);
        if (snap.exists) {
          apptNum = (snap.data()?.lastNumber || 0) + 1;
        }
        t.set(counterRef, { lastNumber: apptNum }, { merge: true });
      });

      const bookingPayload = {
        userId: `wa_${params.phone}`,
        serviceId: params.serviceId,
        serviceIds,
        services: servicesList,
        serviceName: params.serviceName,
        duration: params.durationMinutes,
        price: params.price,
        selectedDate,
        selectedTime: params.selectedTime,
        dateKey: params.dateKey,
        appointmentNumber: apptNum,
        staffId: params.staffId || "any",
        staffName: params.staffName || "Any Available Stylist",
        phoneNumber: `+${params.phone}`,
        customerName: params.customerName || `WhatsApp User (+${params.phone})`,
        customerEmail: "",
        customerGender: "",
        status: "confirmed",
        source: "whatsapp",
        notes: "Booked via WhatsApp Chatbot",
        createdAt: now.toISOString(),
      };

      const docRef = await db.collection(COLLECTIONS.bookings).add(bookingPayload);
      return { ok: true, appointmentNumber: apptNum, bookingId: docRef.id };
    } catch (e) {
      console.error("[createWhatsAppBookingRecord admin failed]", e);
      return { ok: false, error: String(e) };
    }
  }

  // Fallback using client SDK with anonymous auth
  try {
    const auth = getClientAuth();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    const currentUid = auth.currentUser?.uid || `wa_${params.phone}`;
    const db = getClientDb();

    const apptNum = Math.floor(100 + Math.random() * 900);
    const docRef = await addDoc(collection(db, COLLECTIONS.bookings), {
      userId: currentUid,
      serviceId: params.serviceId,
      serviceIds,
      services: servicesList,
      serviceName: params.serviceName,
      duration: params.durationMinutes,
      price: params.price,
      selectedDate,
      selectedTime: params.selectedTime,
      dateKey: params.dateKey,
      appointmentNumber: apptNum,
      staffId: params.staffId || "any",
      staffName: params.staffName || "Any Available Stylist",
      phoneNumber: `+${params.phone}`,
      customerName: params.customerName || `WhatsApp User (+${params.phone})`,
      customerEmail: "",
      customerGender: "",
      status: "confirmed",
      source: "whatsapp",
      notes: "Booked via WhatsApp Chatbot",
      createdAt: now.toISOString(),
    });

    return { ok: true, appointmentNumber: apptNum, bookingId: docRef.id };
  } catch (e) {
    console.error("[createWhatsAppBookingRecord client failed]", e);
    return { ok: false, error: String(e) };
  }
}

export type UpcomingBookingItem = {
  id: string;
  appointmentNumber: number;
  serviceName: string;
  staffName?: string;
  dateKey: string;
  selectedTime: string;
  price?: number;
  duration?: number;
  serviceId?: string;
  services?: any[];
};

/**
 * Fetch upcoming active bookings for this customer phone
 */
export async function getUpcomingBookingsForPhone(phone: string): Promise<UpcomingBookingItem[]> {
  const normalized = phone.replace(/\D/g, "");
  const last9 = normalized.slice(-9);
  const now = getSriLankaNow();
  const todayKey = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper: true if appointment date & time is in the future
  const isUpcoming = (dateKey: string, selectedTime: string) => {
    if (dateKey < todayKey) return false;
    if (dateKey === todayKey) {
      const slotMinutes = parseSlotMinutes(selectedTime);
      if (!Number.isNaN(slotMinutes) && slotMinutes <= nowMinutes) {
        return false; // Appointment time has already passed today
      }
    }
    return true;
  };

  const adminApp = getAdminApp();
  if (adminApp) {
    const db = getAdminFirestore(adminApp);
    try {
      const snap = await db
        .collection(COLLECTIONS.bookings)
        .where("status", "==", "confirmed")
        .get();

      const results: UpcomingBookingItem[] = [];

      snap.forEach((d) => {
        const data = d.data();
        if (data.status && data.status !== "confirmed") return;

        const dateKey = String(
          data.dateKey || (data.selectedDate ? String(data.selectedDate).slice(0, 10) : "")
        );
        const selectedTime = String(data.selectedTime || "");

        if (!isUpcoming(dateKey, selectedTime)) return;

        const rawPhone = String(
          data.phoneNumber || data.customerMobile || data.mobile || data.phone || ""
        );
        const bPhone = rawPhone.replace(/\D/g, "");
        if (last9 && bPhone.endsWith(last9)) {
          const rawServices = data.services;
          let sName = String(data.serviceName || "Service");
          if (
            (!data.serviceName || data.serviceName === "Service") &&
            Array.isArray(rawServices) &&
            rawServices.length > 0
          ) {
            sName =
              (rawServices as Array<{ name?: string }>)
                .map((s) => s.name)
                .filter(Boolean)
                .join(" + ") || sName;
          }

          results.push({
            id: d.id,
            appointmentNumber: Number(data.appointmentNumber || 0),
            serviceName: sName,
            staffName: data.staffName ? String(data.staffName) : undefined,
            dateKey,
            selectedTime,
            price: Number(data.price || 0),
            duration: Number(data.duration || 30),
            serviceId: String(data.serviceId || ""),
            services: Array.isArray(rawServices) ? rawServices : undefined,
          });
        }
      });

      results.sort((a, b) => {
        if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
        const aM = parseSlotMinutes(a.selectedTime) || 0;
        const bM = parseSlotMinutes(b.selectedTime) || 0;
        return aM - bM;
      });

      return results;
    } catch (e) {
      console.warn("[getUpcomingBookingsForPhone admin failed]", e);
    }
  }

  try {
    const db = getClientDb();
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.bookings),
        where("status", "==", "confirmed"),
      ),
    );
    const results: UpcomingBookingItem[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.status && data.status !== "confirmed") return;

      const dateKey = String(
        data.dateKey || (data.selectedDate ? String(data.selectedDate).slice(0, 10) : "")
      );
      const selectedTime = String(data.selectedTime || "");

      if (!isUpcoming(dateKey, selectedTime)) return;

      const rawPhone = String(
        data.phoneNumber || data.customerMobile || data.mobile || data.phone || ""
      );
      const bPhone = rawPhone.replace(/\D/g, "");
      if (last9 && bPhone.endsWith(last9)) {
        const rawServices = data.services;
        let sName = String(data.serviceName || "Service");
        if (
          (!data.serviceName || data.serviceName === "Service") &&
          Array.isArray(rawServices) &&
          rawServices.length > 0
        ) {
          sName =
            (rawServices as Array<{ name?: string }>)
              .map((s) => s.name)
              .filter(Boolean)
              .join(" + ") || sName;
        }

        results.push({
          id: d.id,
          appointmentNumber: Number(data.appointmentNumber || 0),
          serviceName: sName,
          staffName: data.staffName ? String(data.staffName) : undefined,
          dateKey,
          selectedTime,
          price: Number(data.price || 0),
          duration: Number(data.duration || 30),
          serviceId: String(data.serviceId || ""),
          services: Array.isArray(rawServices) ? rawServices : undefined,
        });
      }
    });

    results.sort((a, b) => {
      if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
      const aM = parseSlotMinutes(a.selectedTime) || 0;
      const bM = parseSlotMinutes(b.selectedTime) || 0;
      return aM - bM;
    });

    return results;
  } catch (e) {
    console.warn("[getUpcomingBookingsForPhone client failed]", e);
  }

  return [];
}

/**
 * Cancel a WhatsApp booking by document ID
 */
export async function cancelWhatsAppBooking(
  bookingId: string,
  reason = "Cancelled via WhatsApp",
): Promise<{
  ok: boolean;
  booking?: {
    id: string;
    appointmentNumber: number;
    serviceName: string;
    dateKey: string;
    selectedTime: string;
    phone: string;
  };
  error?: string;
}> {
  const now = new Date().toISOString();
  const adminApp = getAdminApp();

  if (adminApp) {
    const db = getAdminFirestore(adminApp);
    try {
      const docRef = db.collection(COLLECTIONS.bookings).doc(bookingId);
      const snap = await docRef.get();
      if (!snap.exists) {
        return { ok: false, error: "Booking not found" };
      }
      const data = snap.data() || {};
      if (data.status === "cancelled") {
        return { ok: false, error: "This appointment has already been cancelled." };
      }
      const dateKey = String(data.dateKey || "");
      const selectedTime = String(data.selectedTime || "");
      const slNow = getSriLankaNow();
      const todayKey = toDateKey(slNow);
      const nowMinutes = slNow.getHours() * 60 + slNow.getMinutes();
      const slotMinutes = parseSlotMinutes(selectedTime);

      if (dateKey < todayKey || (dateKey === todayKey && !Number.isNaN(slotMinutes) && slotMinutes <= nowMinutes)) {
        return { ok: false, error: "This appointment has already passed and cannot be cancelled." };
      }

      await docRef.update({
        status: "cancelled",
        cancelledBy: "client",
        cancelReason: reason,
        updatedAt: now,
      });

      return {
        ok: true,
        booking: {
          id: bookingId,
          appointmentNumber: Number(data.appointmentNumber || 0),
          serviceName: String(data.serviceName || "Service"),
          dateKey: String(data.dateKey || ""),
          selectedTime: String(data.selectedTime || ""),
          phone: String(data.phoneNumber || ""),
        },
      };
    } catch (e) {
      console.error("[cancelWhatsAppBooking admin failed]", e);
      return { ok: false, error: String(e) };
    }
  }

  try {
    const db = getClientDb();
    const docRef = doc(db, COLLECTIONS.bookings, bookingId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { ok: false, error: "Booking not found" };
    }
    const data = snap.data() || {};
    if (data.status === "cancelled") {
      return { ok: false, error: "This appointment has already been cancelled." };
    }
    await updateDoc(docRef, {
      status: "cancelled",
      cancelledBy: "client",
      cancelReason: reason,
      updatedAt: now,
    });
    return {
      ok: true,
      booking: {
        id: bookingId,
        appointmentNumber: Number(data.appointmentNumber || 0),
        serviceName: String(data.serviceName || "Service"),
        dateKey: String(data.dateKey || ""),
        selectedTime: String(data.selectedTime || ""),
        phone: String(data.phoneNumber || ""),
      },
    };
  } catch (e) {
    console.error("[cancelWhatsAppBooking client failed]", e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Reschedule a WhatsApp booking with new dateKey and selectedTime
 */
export async function rescheduleWhatsAppBooking(
  bookingId: string,
  newDateKey: string,
  newTime: string,
): Promise<{
  ok: boolean;
  newAppointmentNumber?: number;
  booking?: {
    id: string;
    serviceName: string;
    staffName?: string;
    dateKey: string;
    selectedTime: string;
    phone: string;
  };
  error?: string;
}> {
  const now = new Date().toISOString();
  const selectedDate = new Date(`${newDateKey}T12:00:00Z`).toISOString();
  const adminApp = getAdminApp();

  if (adminApp) {
    const db = getAdminFirestore(adminApp);
    try {
      const counterRef = db.collection(COLLECTIONS.appointmentCounters).doc(newDateKey);
      let apptNum = 1;
      await db.runTransaction(async (t) => {
        const snap = await t.get(counterRef);
        if (snap.exists) {
          apptNum = (snap.data()?.lastNumber || 0) + 1;
        }
        t.set(counterRef, { lastNumber: apptNum }, { merge: true });
      });

      const docRef = db.collection(COLLECTIONS.bookings).doc(bookingId);
      const snap = await docRef.get();
      if (!snap.exists) {
        return { ok: false, error: "Booking not found" };
      }
      const data = snap.data() || {};
      if (data.status === "cancelled") {
        return { ok: false, error: "This appointment was cancelled and cannot be rescheduled." };
      }
      const oldDateKey = String(data.dateKey || "");
      const oldTime = String(data.selectedTime || "");
      const slNow = getSriLankaNow();
      const todayKey = toDateKey(slNow);
      const nowMinutes = slNow.getHours() * 60 + slNow.getMinutes();
      const oldSlotMinutes = parseSlotMinutes(oldTime);

      if (oldDateKey < todayKey || (oldDateKey === todayKey && !Number.isNaN(oldSlotMinutes) && oldSlotMinutes <= nowMinutes)) {
        return { ok: false, error: "This appointment has already passed and cannot be rescheduled." };
      }

      await docRef.update({
        dateKey: newDateKey,
        selectedDate,
        selectedTime: newTime,
        appointmentNumber: apptNum,
        updatedAt: now,
      });

      return {
        ok: true,
        newAppointmentNumber: apptNum,
        booking: {
          id: bookingId,
          serviceName: String(data.serviceName || "Service"),
          staffName: data.staffName ? String(data.staffName) : undefined,
          dateKey: newDateKey,
          selectedTime: newTime,
          phone: String(data.phoneNumber || ""),
        },
      };
    } catch (e) {
      console.error("[rescheduleWhatsAppBooking admin failed]", e);
      return { ok: false, error: String(e) };
    }
  }

  try {
    const db = getClientDb();
    const docRef = doc(db, COLLECTIONS.bookings, bookingId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { ok: false, error: "Booking not found" };
    }
    const data = snap.data() || {};
    if (data.status === "cancelled") {
      return { ok: false, error: "This appointment was cancelled and cannot be rescheduled." };
    }
    const apptNum = Math.floor(100 + Math.random() * 900);
    await updateDoc(docRef, {
      dateKey: newDateKey,
      selectedDate,
      selectedTime: newTime,
      appointmentNumber: apptNum,
      updatedAt: now,
    });

    return {
      ok: true,
      newAppointmentNumber: apptNum,
      booking: {
        id: bookingId,
        serviceName: String(data.serviceName || "Service"),
        staffName: data.staffName ? String(data.staffName) : undefined,
        dateKey: newDateKey,
        selectedTime: newTime,
        phone: String(data.phoneNumber || ""),
      },
    };
  } catch (e) {
    console.error("[rescheduleWhatsAppBooking client failed]", e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Save post-service customer feedback review (1 to 5 stars)
 */
export async function saveCustomerReview(params: {
  bookingId?: string;
  phone: string;
  rating: number; // 1-5
  comment?: string;
}): Promise<boolean> {
  const now = new Date().toISOString();
  const payload = {
    bookingId: params.bookingId || "",
    phone: `+${params.phone}`,
    rating: params.rating,
    comment: params.comment || "",
    source: "whatsapp",
    createdAt: now,
  };

  const adminApp = getAdminApp();
  if (adminApp) {
    try {
      await getAdminFirestore(adminApp).collection("reviews").add(payload);
      return true;
    } catch (e) {
      console.warn("[saveCustomerReview admin failed]", e);
    }
  }

  try {
    const db = getClientDb();
    await addDoc(collection(db, "reviews"), payload);
    return true;
  } catch (e) {
    console.warn("[saveCustomerReview client failed]", e);
    return false;
  }
}

