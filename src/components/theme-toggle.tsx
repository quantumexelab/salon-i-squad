"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/contexts/theme-mode-context";

type ThemeToggleProps = {
  className?: string;
  /** compact = icon only */
  size?: "compact" | "default";
};

export function ThemeToggle({
  className = "",
  size = "default",
}: ThemeToggleProps) {
  const { mode, toggleMode, ready } = useThemeMode();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggleMode}
      disabled={!ready}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-salon-beige/40 bg-salon-surface text-salon-ink transition hover:border-salon-gold/50 hover:text-salon-gold disabled:opacity-50 ${
        size === "compact" ? "h-9 w-9" : "h-9 px-3 text-[11px] font-semibold uppercase tracking-wider"
      } ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-salon-gold" />
      ) : (
        <Moon className="h-4 w-4 text-salon-gold" />
      )}
      {size === "default" ? (
        <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
      ) : null}
    </button>
  );
}
