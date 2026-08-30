"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAdmin, homeForRole } from "@/lib/routing";

/**
 * Salon owner dashboard. Allows `admin` and optionally `master`.
 * Clients are sent home; others without access go to their home route.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canAccessAdmin(role)) {
      router.replace(homeForRole(role));
    }
  }, [loading, user, role, router]);

  if (loading || !user || !canAccessAdmin(role)) {
    return (
      <div className="flex flex-1 items-center justify-center bg-salon-bg py-20">
        <Loader2 className="h-8 w-8 animate-spin text-salon-gold" />
      </div>
    );
  }

  return <>{children}</>;
}
