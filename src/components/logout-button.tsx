"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Loader2, LogOut } from "lucide-react";
import { getFirebaseAuth, initFirebase } from "@/lib/firebase";

type LogoutButtonProps = {
  className?: string;
  compact?: boolean;
  tone?: "light" | "dark";
};

export function LogoutButton({
  className = "",
  compact = false,
  tone = "dark",
}: LogoutButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      initFirebase();
      await signOut(getFirebaseAuth());
      router.replace("/login");
    } catch {
      setBusy(false);
    }
  }

  const lightCompact =
    "inline-flex items-center gap-1.5 rounded-lg border border-salon-gold/30 px-2.5 py-1.5 text-xs font-semibold text-salon-muted transition hover:border-salon-gold hover:text-salon-gold disabled:opacity-60";
  const darkCompact =
    "inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={busy}
      className={
        className ||
        (compact
          ? tone === "light"
            ? lightCompact
            : darkCompact
          : "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:border-zinc-500 disabled:opacity-60")
      }
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="h-3.5 w-3.5 text-salon-gold" />
      )}
      Logout
    </button>
  );
}
