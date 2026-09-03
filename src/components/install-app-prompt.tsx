"use client";

import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "sis-install-dismissed-at";
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Capture BIP early — it can fire before React hydrates. */
let earlyDeferred: BeforeInstallPromptEvent | null = null;

function captureBeforeInstall(e: Event) {
  e.preventDefault();
  earlyDeferred = e as BeforeInstallPromptEvent;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", captureBeforeInstall);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notChrome;
}

function isStaffPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/master") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/members") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/buffers") ||
    pathname.startsWith("/day-close") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/calendar")
  );
}

/** Hide only during active booking steps — still show on home / profile / login. */
function isBookingFlowPath(pathname: string): boolean {
  return (
    pathname.startsWith("/booking") ||
    pathname.startsWith("/my-bookings") ||
    pathname.startsWith("/bookings/") ||
    pathname.startsWith("/reschedule")
  );
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function shouldOfferInstall(pathname: string): boolean {
  if (typeof window === "undefined") return false;
  if (isStandalone()) return false;
  if (wasDismissedRecently()) return false;
  if (isStaffPath(pathname)) return false;
  if (isBookingFlowPath(pathname)) return false;
  if (pathname === "/login" || pathname === "/register") return false;
  return true;
}

export function InstallAppPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
    setDeferred(null);
    setIosHint(false);
  }, []);

  useEffect(() => {
    if (!shouldOfferInstall(pathname)) {
      setVisible(false);
      setIosHint(false);
      return;
    }

    const applyDeferred = (event: BeforeInstallPromptEvent) => {
      setDeferred(event);
      setIosHint(false);
      setVisible(true);
    };

    if (earlyDeferred) {
      applyDeferred(earlyDeferred);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      earlyDeferred = event;
      applyDeferred(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Fallback for browsers that never fire BIP (iOS, desktop Safari, etc.)
    const timer = window.setTimeout(() => {
      if (!shouldOfferInstall(pathname)) return;
      if (earlyDeferred) {
        applyDeferred(earlyDeferred);
        return;
      }
      setDeferred(null);
      setIosHint(isIosSafari());
      setVisible(true);
    }, 900);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  async function handleInstall() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      earlyDeferred = null;
      if (choice.outcome === "accepted") {
        setVisible(false);
        setDeferred(null);
      } else {
        dismiss();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!visible || !shouldOfferInstall(pathname)) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-40 px-3 md:inset-x-auto md:bottom-4 md:right-4 md:max-w-sm"
      role="dialog"
      aria-label="Install Salon I Squad app"
    >
      <div className="overflow-hidden rounded-2xl border border-salon-gold/35 bg-salon-white shadow-xl shadow-black/20">
        <div className="flex items-start gap-3 px-4 pb-3 pt-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={44}
            height={44}
            className="mt-0.5 h-11 w-11 shrink-0 rounded-xl border border-salon-beige/40"
          />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-sm font-semibold text-salon-ink">
              Install Salon I Squad
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-salon-muted">
              {iosHint
                ? "Tap Share, then Add to Home Screen for quick booking."
                : deferred
                  ? "Add the app to your home screen for faster booking."
                  : "Open the browser menu and choose Install app / Add to Home screen."}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-salon-muted transition hover:bg-salon-surface hover:text-salon-ink"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 border-t border-salon-beige/40 bg-salon-surface/60 px-3 py-2.5">
          {deferred ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleInstall()}
              className="salon-gold-btn flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-black disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {busy ? "Opening…" : "Install app"}
            </button>
          ) : iosHint ? (
            <div className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-salon-gold/30 bg-salon-white px-3 text-[12px] font-medium text-salon-ink">
              <Share className="h-4 w-4 text-salon-gold" />
              Share → Add to Home Screen
            </div>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="salon-gold-btn flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-black"
            >
              <Download className="h-4 w-4" />
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
