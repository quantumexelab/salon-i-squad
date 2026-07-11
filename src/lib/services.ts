import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import type { Service } from "@/types/firestore";

export type ServiceInput = {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  isActive?: boolean;
  requiresConsultation?: boolean;
};

/** Forced slot length when booking a prior consultation. */
export const CONSULTATION_DURATION_MINUTES = 15;

export function getBookableDurationMinutes(service: {
  durationMinutes: number;
  requiresConsultation?: boolean;
}): number {
  return service.requiresConsultation
    ? CONSULTATION_DURATION_MINUTES
    : service.durationMinutes;
}

export function getBookableServiceLabel(service: {
  name: string;
  requiresConsultation?: boolean;
}): string {
  if (!service.requiresConsultation) return service.name;
  return `Consultation for ${service.name}`;
}

function mapServiceDoc(id: string, data: Record<string, unknown>): Service {
  return {
    id,
    name: String(data.name ?? "Service"),
    description: data.description ? String(data.description) : undefined,
    durationMinutes: Number(data.durationMinutes ?? 0),
    price: Number(data.price ?? 0),
    requiresConsultation: Boolean(data.requiresConsultation),
    isActive: data.isActive !== false,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}

export function subscribeToServices(
  onData: (services: Service[]) => void,
  onError?: (error: Error) => void,
  options?: { activeOnly?: boolean },
): Unsubscribe {
  initFirebase();
  const db = getFirebaseDb();
  const servicesQuery = query(
    collection(db, COLLECTIONS.services),
    orderBy("name", "asc"),
  );

  return onSnapshot(
    servicesQuery,
    (snapshot) => {
      let services = snapshot.docs.map((docSnap) =>
        mapServiceDoc(docSnap.id, docSnap.data()),
      );

      if (options?.activeOnly) {
        services = services.filter((service) => service.isActive);
      }

      onData(services);
    },
    (error) => onError?.(error),
  );
}

export async function createService(input: ServiceInput): Promise<Service> {
  initFirebase();
  const now = new Date().toISOString();
  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    durationMinutes: Number(input.durationMinutes),
    price: Number(input.price),
    requiresConsultation: Boolean(input.requiresConsultation),
    isActive: input.isActive !== false,
    createdAt: now,
    updatedAt: now,
  };

  if (!payload.name) throw new Error("Service name is required.");
  if (payload.durationMinutes <= 0) {
    throw new Error("Duration must be greater than 0.");
  }
  if (payload.price < 0) throw new Error("Price cannot be negative.");

  const ref = await addDoc(collection(getFirebaseDb(), COLLECTIONS.services), payload);

  return mapServiceDoc(ref.id, payload);
}

export async function updateService(
  serviceId: string,
  input: ServiceInput,
): Promise<void> {
  initFirebase();
  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    durationMinutes: Number(input.durationMinutes),
    price: Number(input.price),
    requiresConsultation: Boolean(input.requiresConsultation),
    isActive: input.isActive !== false,
    updatedAt: new Date().toISOString(),
  };

  if (!payload.name) throw new Error("Service name is required.");
  if (payload.durationMinutes <= 0) {
    throw new Error("Duration must be greater than 0.");
  }
  if (payload.price < 0) throw new Error("Price cannot be negative.");

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.services, serviceId), payload);
}

export async function deleteService(serviceId: string): Promise<void> {
  initFirebase();
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.services, serviceId));
}
