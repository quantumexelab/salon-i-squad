import { NextResponse } from "next/server";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { isDummyCatalogServiceName } from "@/lib/catalog-dummy";

export const runtime = "nodejs";

type ServiceAccountKey = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function parseServiceAccountJson(raw: string): ServiceAccountKey | null {
  try {
    const parsed = JSON.parse(raw) as ServiceAccountKey;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      ...parsed,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

function getFirebaseAdminApp(): App | null {
  if (getApps().length > 0) return getApps()[0]!;

  const fromEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const key = fromEnv ? parseServiceAccountJson(fromEnv) : null;
  if (!key) return null;

  return initializeApp({
    credential: cert({
      projectId:
        key.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: key.client_email,
      privateKey: key.private_key,
    }),
  });
}

/**
 * Deletes test / dummy catalog services from Firestore.
 * Confirm with ?confirm=purge-dummy-catalog
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "purge-dummy-catalog") {
    return NextResponse.json(
      { ok: false, reason: "Missing confirm=purge-dummy-catalog" },
      { status: 400 },
    );
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "Server purge unavailable (missing FIREBASE_SERVICE_ACCOUNT_JSON).",
      },
      { status: 503 },
    );
  }

  try {
    const snap = await getFirestore(app).collection(COLLECTIONS.services).get();
    const deleted: string[] = [];
    for (const docSnap of snap.docs) {
      const name = String(docSnap.data().name ?? "");
      if (!isDummyCatalogServiceName(name)) continue;
      await docSnap.ref.delete();
      deleted.push(name);
    }
    return NextResponse.json({ ok: true, deleted, count: deleted.length });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: err instanceof Error ? err.message : "Purge failed.",
      },
      { status: 500 },
    );
  }
}
