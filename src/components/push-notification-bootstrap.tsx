"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { syncFcmTokenForUser } from "@/lib/fcm";

/**
 * On client app open: request notification permission when still "default",
 * then save the FCM token to users/{uid} when signed in.
 */
export function PushNotificationBootstrap() {
  const { user, loading } = useAuth();
  const ranForUid = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;

    const uid = user?.uid ?? null;
    // Re-run when auth settles or uid changes; avoid hammering on every render.
    if (ranForUid.current === uid && ranForUid.current !== undefined) {
      return;
    }
    ranForUid.current = uid;

    void syncFcmTokenForUser(uid);
  }, [user?.uid, loading]);

  return null;
}
