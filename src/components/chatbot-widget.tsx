"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import {
  chatbotConfig,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/chatbot";

const FAB_SIZE = 56;
const FAB_MARGIN = 10;
const FAB_POS_KEY = "sis-chat-fab-pos";
const DRAG_THRESHOLD = 6;

type FabPosition = { x: number; y: number };

function isStaffPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/master") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/buffers") ||
    pathname.startsWith("/day-close") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/calendar")
  );
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function defaultFabPosition(): FabPosition {
  if (typeof window === "undefined") {
    return { x: FAB_MARGIN, y: FAB_MARGIN };
  }

  const mobile = window.matchMedia("(max-width: 767px)").matches;
  const bottomInset =
    FAB_MARGIN +
    (mobile
      ? 72 + Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "env(safe-area-inset-bottom)",
          ) || "0",
        )
      : 20);

  return {
    x: window.innerWidth - FAB_SIZE - FAB_MARGIN,
    y: window.innerHeight - FAB_SIZE - bottomInset,
  };
}

function clampFabPosition(pos: FabPosition): FabPosition {
  if (typeof window === "undefined") return pos;

  return {
    x: clamp(pos.x, FAB_MARGIN, window.innerWidth - FAB_SIZE - FAB_MARGIN),
    y: clamp(pos.y, FAB_MARGIN, window.innerHeight - FAB_SIZE - FAB_MARGIN),
  };
}

function readSavedFabPosition(): FabPosition | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(FAB_POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FabPosition;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      !Number.isFinite(parsed.x) ||
      !Number.isFinite(parsed.y)
    ) {
      return null;
    }
    return clampFabPosition(parsed);
  } catch {
    return null;
  }
}

export function ChatbotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [fabPos, setFabPos] = useState<FabPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content: chatbotConfig.welcome,
      createdAt: Date.now(),
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    setFabPos(readSavedFabPosition() ?? defaultFabPosition());
  }, []);

  const persistFabPosition = useCallback((pos: FabPosition) => {
    const next = clampFabPosition(pos);
    setFabPos(next);
    try {
      localStorage.setItem(FAB_POS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!fabPos) return;

    function handleResize() {
      setFabPos((current) => (current ? clampFabPosition(current) : current));
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fabPos]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  function handleFabPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!fabPos || event.button !== 0) return;

    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: fabPos.x,
      originY: fabPos.y,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleFabPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current.active) return;

    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;

    if (
      !dragRef.current.moved &&
      (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
    ) {
      dragRef.current.moved = true;
      setOpen(false);
    }

    if (!dragRef.current.moved) return;

    persistFabPosition({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
  }

  function handleFabPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current.active) return;

    const wasDrag = dragRef.current.moved;
    dragRef.current.active = false;
    dragRef.current.moved = false;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!wasDrag) {
      setOpen((value) => !value);
    }
  }

  if (isStaffPath(pathname) || pathname === "/login") return null;
  if (!fabPos) return null;

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const reply = await sendChatMessage(text);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content: reply,
          createdAt: Date.now(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`pointer-events-none fixed z-40 flex items-end gap-3 ${
        fabPos.y < 320 ? "flex-col-reverse" : "flex-col"
      }`}
      style={{ left: fabPos.x, top: fabPos.y, width: FAB_SIZE }}
    >
      {open ? (
        <div
          className="pointer-events-auto flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-salon-gold/30 bg-salon-white shadow-2xl shadow-black/20"
          role="dialog"
          aria-label="Salon chat"
        >
          <div className="flex items-center justify-between gap-2 border-b border-salon-beige/40 bg-salon-surface px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-salon-ink">
                {chatbotConfig.botName}
              </p>
              <p className="text-[11px] text-salon-muted">Chat assistant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-salon-muted transition hover:bg-salon-beige/40 hover:text-salon-ink"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex max-h-[min(50vh,22rem)] flex-col gap-2 overflow-y-auto px-3 py-3"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                  msg.role === "user"
                    ? "ml-auto bg-salon-gold text-black"
                    : "mr-auto bg-salon-surface text-salon-ink"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {busy ? (
              <div className="mr-auto flex items-center gap-2 rounded-2xl bg-salon-surface px-3 py-2 text-[12px] text-salon-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Typing…
              </div>
            ) : null}
          </div>

          <form
            className="flex items-center gap-2 border-t border-salon-beige/40 p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about booking…"
              disabled={busy}
              className="h-10 flex-1 rounded-xl border border-salon-beige bg-salon-bg px-3 text-sm text-salon-ink outline-none focus:border-salon-gold/60 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="salon-gold-btn inline-flex h-10 w-10 items-center justify-center rounded-xl text-black disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onPointerDown={handleFabPointerDown}
        onPointerMove={handleFabPointerMove}
        onPointerUp={handleFabPointerUp}
        onPointerCancel={handleFabPointerUp}
        className={`pointer-events-auto flex h-14 w-14 touch-none items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 transition hover:brightness-105 ${
          dragging ? "scale-105 cursor-grabbing" : "cursor-grab hover:scale-[1.04]"
        }`}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        title="Drag to move · Tap to open chat"
      >
        {open ? (
          <X className="h-6 w-6" strokeWidth={2.25} />
        ) : (
          <MessageCircle className="h-7 w-7" strokeWidth={2} fill="currentColor" />
        )}
      </button>
    </div>
  );
}
