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
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getClientStorage, initFirebaseClient } from "@/lib/firebase/client";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import type { Service } from "@/types/firestore";

export type ServiceInput = {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  imageUrl?: string;
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

function normalizeImageUrl(value: unknown): string | undefined {
  const url = String(value ?? "").trim();
  return url || undefined;
}

function mapServiceDoc(id: string, data: Record<string, unknown>): Service {
  return {
    id,
    name: String(data.name ?? "Service"),
    description: data.description ? String(data.description) : undefined,
    durationMinutes: Number(data.durationMinutes ?? 0),
    price: Number(data.price ?? 0),
    imageUrl: normalizeImageUrl(data.imageUrl),
    requiresConsultation: Boolean(data.requiresConsultation),
    isActive: data.isActive !== false,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}

/** Upload a service card image to Storage and return its public download URL. */
export async function uploadServiceImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image must be 2MB or smaller.");
  }

  initFirebaseClient();
  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const path = `services/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storageRef = ref(getClientStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
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
  const imageUrl = normalizeImageUrl(input.imageUrl);
  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    durationMinutes: Number(input.durationMinutes),
    price: Number(input.price),
    ...(imageUrl ? { imageUrl } : {}),
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
  const imageUrl = normalizeImageUrl(input.imageUrl);
  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    durationMinutes: Number(input.durationMinutes),
    price: Number(input.price),
    imageUrl: imageUrl ?? "",
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
