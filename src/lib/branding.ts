import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getClientStorage, initFirebaseClient } from "@/lib/firebase/client";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import { siteConfig } from "@/lib/site";

export const BRANDING_SETTINGS_DOC_ID = "branding";

export type BrandingSettings = {
  logoUrl: string;
  updatedAt?: string;
  updatedBy?: string;
};

export function subscribeToBranding(
  onData: (branding: BrandingSettings) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const refDoc = doc(
    getFirebaseDb(),
    COLLECTIONS.settings,
    BRANDING_SETTINGS_DOC_ID,
  );

  return onSnapshot(
    refDoc,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({ logoUrl: "" });
        return;
      }
      const data = snapshot.data();
      onData({
        logoUrl: String(data.logoUrl ?? "").trim(),
        updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
        updatedBy: data.updatedBy ? String(data.updatedBy) : undefined,
      });
    },
    (error) => onError?.(error),
  );
}

export async function saveBrandingLogoUrl(input: {
  logoUrl: string;
  updatedBy?: string;
}): Promise<BrandingSettings> {
  initFirebase();
  const logoUrl = input.logoUrl.trim();

  if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
    throw new Error("Logo URL must start with http:// or https://");
  }

  const payload: BrandingSettings = {
    logoUrl,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? "",
  };

  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.settings, BRANDING_SETTINGS_DOC_ID),
    payload,
    { merge: true },
  );

  return payload;
}

/** Upload a logo image to Storage and return its public download URL. */
export async function uploadBrandingLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Logo must be 2MB or smaller.");
  }

  initFirebaseClient();
  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "png";
  const path = `branding/logo-${Date.now()}.${ext}`;
  const storageRef = ref(getClientStorage(), path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export function brandingFallbackName(): string {
  return siteConfig.name;
}
