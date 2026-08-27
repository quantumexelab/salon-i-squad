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
import { serviceImageFor } from "@/lib/service-images";
import {
  isDummyCatalogService,
  isDummyCatalogServiceName,
} from "@/lib/catalog-dummy";
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
    requiresConsultation:
      data.requiresConsultation === true ||
      data.requiresConsultation === "true",
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

export { isDummyCatalogService, isDummyCatalogServiceName };

/** Permanently delete test / dummy catalog rows. */
export async function purgeDummyCatalogServices(
  existing: Service[],
): Promise<{ deleted: number; names: string[] }> {
  const dummies = existing.filter(isDummyCatalogService);
  const names: string[] = [];
  for (const service of dummies) {
    await deleteService(service.id);
    names.push(service.name);
  }
  return { deleted: names.length, names };
}

const SAMPLE_CATALOG: ServiceInput[] = [
  {
    name: "Haircut",
    description: "Classic cut and finish tailored to your face shape.",
    durationMinutes: 30,
    price: 1500,
    imageUrl:
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    requiresConsultation: false,
  },
  {
    name: "Beard Grooming",
    description: "Trim, shape, and clean beard finish.",
    durationMinutes: 25,
    price: 1000,
    imageUrl:
      "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    requiresConsultation: false,
  },
  {
    name: "Classic Shave",
    description: "Hot towel traditional shave.",
    durationMinutes: 20,
    price: 1200,
    imageUrl:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    requiresConsultation: false,
  },
  {
    name: "Hair Styling",
    description: "Wash, blow-dry, and style.",
    durationMinutes: 40,
    price: 2000,
    imageUrl:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    requiresConsultation: false,
  },
  {
    name: "Hair Colour",
    description: "Full colour or refresh — consultation first.",
    durationMinutes: 90,
    price: 5500,
    imageUrl:
      "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    requiresConsultation: true,
  },
  {
    name: "Facial Treatment",
    description: "Deep cleanse and glow-restoring facial.",
    durationMinutes: 45,
    price: 3500,
    imageUrl:
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80",
    isActive: true,
    requiresConsultation: false,
  },
];

/**
 * Creates sample catalog services (skips names that already exist) and
 * fills missing imageUrl on existing services from the name-based catalog.
 */
export async function seedCatalogServices(
  existing: Service[],
): Promise<{ created: number; updated: number }> {
  const byName = new Map(
    existing.map((s) => [s.name.trim().toLowerCase(), s]),
  );
  let created = 0;
  let updated = 0;

  for (const sample of SAMPLE_CATALOG) {
    const key = sample.name.trim().toLowerCase();
    if (byName.has(key)) continue;
    await createService(sample);
    created += 1;
  }

  for (const service of existing) {
    if (service.imageUrl?.trim()) continue;
    const guessed = serviceImageFor(service.name);
    await updateService(service.id, {
      name: service.name,
      description: service.description ?? "",
      durationMinutes: service.durationMinutes,
      price: service.price,
      imageUrl: guessed,
      isActive: service.isActive,
      requiresConsultation: service.requiresConsultation,
    });
    updated += 1;
  }

  return { created, updated };
}
