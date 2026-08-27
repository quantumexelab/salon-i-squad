"use client";

import type { ReactNode } from "react";
import { ChatbotWidget } from "@/components/chatbot-widget";
import { InstallAppPrompt } from "@/components/install-app-prompt";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeModeProvider } from "@/contexts/theme-mode-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        {children}
        <InstallAppPrompt />
        <ChatbotWidget />
      </AuthProvider>
    </ThemeModeProvider>
  );
}
