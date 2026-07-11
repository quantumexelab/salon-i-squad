"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { homeForRole } from "@/lib/routing";

/**
 * Role-aware entry: master → /master, admin → /admin, client → /booking,
 * signed-out → /login.
 */
export function HomeRedirect() {
  const router = useRouter();
  const { user, loading, profile, role } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!profile) {
      router.replace("/booking");
      return;
    }

    const dest = homeForRole(role);
    if (dest === "/") {
      router.replace("/booking");
      return;
    }
    router.replace(dest);
  }, [loading, user, profile, role, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950">
      <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
    </div>
  );
}
