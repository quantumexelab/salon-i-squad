"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeModeProvider } from "@/contexts/theme-mode-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeModeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeModeProvider>
  );
}
