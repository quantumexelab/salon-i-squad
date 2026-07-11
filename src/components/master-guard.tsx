"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { canAccessMaster, homeForRole } from "@/lib/routing";

/** System owner console — `master` role only. */
export function MasterGuard({ children }: { children: ReactNode }) {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canAccessMaster(role)) {
      router.replace(homeForRole(role));
    }
  }, [loading, user, role, router]);

  if (loading || !user || !canAccessMaster(role)) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return <>{children}</>;
}
