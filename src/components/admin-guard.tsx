"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

/** Requires sign-in. Staff stay on admin; clients are sent to booking. */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading, isStaff } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isStaff) {
      router.replace("/booking");
    }
  }, [loading, user, isStaff, router]);

  if (loading || !user || !isStaff) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return <>{children}</>;
}
