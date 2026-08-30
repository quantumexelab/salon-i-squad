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
import { getFirebaseAuth, getFirebaseDb, initFirebase } from "@/lib/firebase";
import { serviceImageFor, CATALOG_SERVICE_IMAGES } from "@/lib/service-images";
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

  initFirebase();
  initFirebaseClient();

  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Sign in again to upload images.");
  }

  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const path = `services/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storageRef = ref(getClientStorage(), path);

  try {
    await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(storageRef);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "storage/unauthorized") {
      throw new Error(
        "Upload blocked by storage rules. Ask your master admin to deploy Firebase Storage rules.",
      );
    }
    if (
      code === "storage/unknown" ||
      code === "storage/bucket-not-found" ||
      code === "storage/object-not-found"
    ) {
      throw new Error(
        "Firebase Storage is not set up yet. Open Firebase Console → Storage → Get started, then try again.",
      );
    }
    throw err instanceof Error ? err : new Error("Image upload failed.");
  }
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
    imageUrl: CATALOG_SERVICE_IMAGES.haircut,
    isActive: true,
    requiresConsultation: false,
  },
  {
    name: "Beard Grooming",
    description: "Trim, shape, and clean beard finish.",
    durationMinutes: 25,
    price: 1000,
    imageUrl: CATALOG_SERVICE_IMAGES.beard,
    isActive: true,
    requiresConsultation: false,
  },
  {
    name: "Classic Shave",
    description: "Hot towel traditional shave.",
    durationMinutes: 20,
    price: 1200,
    imageUrl: CATALOG_SERVICE_IMAGES.shave,
    isActive: true,
    requiresConsultation: false,
  },
  {
    name: "Hair Styling",
    description: "Wash, blow-dry, and style.",
    durationMinutes: 40,
    price: 2000,
    imageUrl: CATALOG_SERVICE_IMAGES.styling,
    isActive: true,
    requiresConsultation: false,
  },
  {
    name: "Hair Colour",
    description: "Full colour or refresh — consultation first.",
    durationMinutes: 90,
    price: 5500,
    imageUrl: CATALOG_SERVICE_IMAGES.color,
    isActive: true,
    requiresConsultation: true,
  },
  {
    name: "Facial Treatment",
    description: "Deep cleanse and glow-restoring facial.",
    durationMinutes: 45,
    price: 3500,
    imageUrl: CATALOG_SERVICE_IMAGES.facial,
    isActive: true,
    requiresConsultation: false,
  },
];

/** Sample offerings as Service rows (used when Firestore catalog is empty). */
export function getSampleCatalogServices(): Service[] {
  return SAMPLE_CATALOG.map((sample) => {
    const slug = sample.name.trim().toLowerCase().replace(/\s+/g, "-");
    return {
      id: `sample-${slug}`,
      name: sample.name,
      description: sample.description,
      durationMinutes: sample.durationMinutes,
      price: sample.price,
      imageUrl: sample.imageUrl,
      requiresConsultation: Boolean(sample.requiresConsultation),
      isActive: true,
      createdAt: "",
      updatedAt: "",
    };
  });
}

/** Live active catalog, or sample list so landing/booking stay in sync. */
export function resolveBookableServices(live: Service[]): Service[] {
  const real = live.filter((s) => s.isActive !== false && !isDummyCatalogService(s));
  return real.length > 0 ? real : getSampleCatalogServices();
}

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
