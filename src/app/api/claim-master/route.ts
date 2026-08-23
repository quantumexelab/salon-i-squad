import { NextResponse } from "next/server";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";

export const runtime = "nodejs";

const MASTER_BOOTSTRAP_EMAIL = "info@quantumexe.com";

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
 * Trusted master bootstrap for info@quantumexe.com.
 * Uses Admin SDK so Firestore client rules cannot block the role write.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return NextResponse.json(
      { ok: false, reason: "Missing auth token." },
      { status: 401 },
    );
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "Server master claim unavailable (missing FIREBASE_SERVICE_ACCOUNT_JSON).",
      },
      { status: 503 },
    );
  }

  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    const email = decoded.email?.trim().toLowerCase();
    if (email !== MASTER_BOOTSTRAP_EMAIL) {
      return NextResponse.json(
        { ok: false, reason: `Only ${MASTER_BOOTSTRAP_EMAIL} can claim master.` },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();
    await getFirestore(app)
      .collection(COLLECTIONS.users)
      .doc(decoded.uid)
      .set(
        {
          uid: decoded.uid,
          email,
          role: "master",
          isGuest: false,
          updatedAt: now,
          createdAt: now,
        },
        { merge: true },
      );

    return NextResponse.json({ ok: true, role: "master" });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          err instanceof Error ? err.message : "Could not claim master role.",
      },
      { status: 500 },
    );
  }
}
