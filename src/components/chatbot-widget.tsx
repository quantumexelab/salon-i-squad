"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import {
  chatbotConfig,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/chatbot";

const FAB_SIZE = 72;
const FAB_MARGIN = 12;
/** Extra lift on mobile so the FAB clears the bottom nav bar. */
const FAB_BOTTOM_MOBILE_LIFT = 28;
/** Extra inward offset on mobile bottom corners so nav tabs stay tappable. */
const FAB_BOTTOM_MOBILE_SIDE = 24;
const FAB_POS_KEY = "sis-chat-fab-pos";
const DRAG_THRESHOLD = 6;
const SNAP_TRANSITION_MS = 320;
/** How far from a corner anchor the FAB can rest within that corner zone. */
const CORNER_ZONE = 88;

type FabPosition = { x: number; y: number };
type FabCorner = "tl" | "tr" | "bl" | "br";

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

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function safeAreaBottom(): number {
  if (typeof window === "undefined") return 0;
  return Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "env(safe-area-inset-bottom)",
    ) || "0",
  );
}

function sideMargin(corner: FabCorner): number {
  const mobile = isMobileViewport();
  const isBottomCorner = corner === "bl" || corner === "br";
  return FAB_MARGIN + (mobile && isBottomCorner ? FAB_BOTTOM_MOBILE_SIDE : 0);
}

function bottomFabInset(): number {
  if (typeof window === "undefined") return FAB_MARGIN;

  const mobile = isMobileViewport();
  return (
    FAB_MARGIN +
    (mobile ? 72 + safeAreaBottom() + FAB_BOTTOM_MOBILE_LIFT : 20)
  );
}

function cornerPositions(): Record<FabCorner, FabPosition> {
  if (typeof window === "undefined") {
    return {
      tl: { x: FAB_MARGIN, y: FAB_MARGIN },
      tr: { x: FAB_MARGIN, y: FAB_MARGIN },
      bl: { x: FAB_MARGIN, y: FAB_MARGIN },
      br: { x: FAB_MARGIN, y: FAB_MARGIN },
    };
  }

  const maxX = (corner: FabCorner) =>
    window.innerWidth - FAB_SIZE - sideMargin(corner);
  const topY = FAB_MARGIN;
  const bottomY = window.innerHeight - FAB_SIZE - bottomFabInset();

  return {
    tl: { x: sideMargin("tl"), y: topY },
    tr: { x: maxX("tr"), y: topY },
    bl: { x: sideMargin("bl"), y: bottomY },
    br: { x: maxX("br"), y: bottomY },
  };
}

function nearestCornerId(pos: FabPosition): FabCorner {
  const corners = cornerPositions();
  let best: FabCorner = "br";
  let bestDist = Number.POSITIVE_INFINITY;

  for (const [id, corner] of Object.entries(corners) as [FabCorner, FabPosition][]) {
    const dist = (corner.x - pos.x) ** 2 + (corner.y - pos.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = id;
    }
  }

  return best;
}

function cornerZone(corner: FabCorner) {
  const anchor = cornerPositions()[corner];

  switch (corner) {
    case "tl":
      return {
        minX: anchor.x,
        maxX: anchor.x + CORNER_ZONE,
        minY: anchor.y,
        maxY: anchor.y + CORNER_ZONE,
      };
    case "tr":
      return {
        minX: anchor.x - CORNER_ZONE,
        maxX: anchor.x,
        minY: anchor.y,
        maxY: anchor.y + CORNER_ZONE,
      };
    case "bl":
      return {
        minX: anchor.x,
        maxX: anchor.x + CORNER_ZONE,
        minY: anchor.y - CORNER_ZONE,
        maxY: anchor.y,
      };
    case "br":
      return {
        minX: anchor.x - CORNER_ZONE,
        maxX: anchor.x,
        minY: anchor.y - CORNER_ZONE,
        maxY: anchor.y,
      };
  }
}

function snapToCornerZone(pos: FabPosition): FabPosition {
  const corner = nearestCornerId(pos);
  const zone = cornerZone(corner);

  return {
    x: clamp(pos.x, zone.minX, zone.maxX),
    y: clamp(pos.y, zone.minY, zone.maxY),
  };
}

function defaultFabPosition(): FabPosition {
  return cornerPositions().br;
}

function clampFabPosition(pos: FabPosition): FabPosition {
  if (typeof window === "undefined") return pos;

  const minX = sideMargin("bl");
  const maxX = window.innerWidth - FAB_SIZE - sideMargin("br");

  return {
    x: clamp(pos.x, minX, maxX),
    y: clamp(
      pos.y,
      FAB_MARGIN,
      window.innerHeight - FAB_SIZE - bottomFabInset(),
    ),
  };
}

function readSavedFabPosition(): FabPosition | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(FAB_POS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as
      | FabPosition
      | { corner?: FabCorner; x?: number; y?: number };

    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return snapToCornerZone({ x: parsed.x, y: parsed.y });
    }

    if (parsed && typeof parsed === "object" && "corner" in parsed && parsed.corner) {
      return snapToCornerZone(cornerPositions()[parsed.corner]);
    }

    return null;
  } catch {
    return null;
  }
}

function cornerForPosition(pos: FabPosition): FabCorner {
  return nearestCornerId(pos);
}

type FabLayout = {
  flexDirection: "column" | "column-reverse";
  alignItems: "flex-start" | "flex-end";
  style: React.CSSProperties;
};

function getFabLayout(pos: FabPosition): FabLayout {
  const corner = cornerForPosition(pos);
  const isBottomCorner = corner === "bl" || corner === "br";
  const isRightCorner = corner === "tr" || corner === "br";

  return {
    flexDirection: isBottomCorner ? "column" : "column-reverse",
    alignItems: isRightCorner ? "flex-end" : "flex-start",
    style: {
      left: pos.x,
      top: pos.y,
    },
  };
}

export function ChatbotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [fabPos, setFabPos] = useState<FabPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
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
    const syncViewport = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    setFabPos(readSavedFabPosition() ?? defaultFabPosition());
  }, []);

  const persistFabPosition = useCallback((pos: FabPosition, snap = true) => {
    const next = snap
      ? snapToCornerZone(clampFabPosition(pos))
      : clampFabPosition(pos);
    setFabPos(next);
    try {
      localStorage.setItem(
        FAB_POS_KEY,
        JSON.stringify({ corner: cornerForPosition(next), ...next }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!fabPos) return;

    function handleResize() {
      setFabPos((current) =>
        current ? snapToCornerZone(current) : defaultFabPosition(),
      );
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

    persistFabPosition(
      {
        x: dragRef.current.originX + dx,
        y: dragRef.current.originY + dy,
      },
      false,
    );
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

    if (wasDrag && fabPos) {
      persistFabPosition(fabPos, true);
      return;
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

  const layout =
    viewport.w > 0
      ? getFabLayout(fabPos)
      : {
          flexDirection: "column-reverse" as const,
          alignItems: "flex-end" as const,
          style: {
            left: defaultFabPosition().x,
            top: defaultFabPosition().y,
          },
        };

  const snapTransition = `left ${SNAP_TRANSITION_MS}ms ease, top ${SNAP_TRANSITION_MS}ms ease`;

  return (
    <div
      className={`pointer-events-none fixed z-40 flex gap-3 ${
        layout.flexDirection === "column-reverse" ? "flex-col-reverse" : "flex-col"
      } ${layout.alignItems === "flex-start" ? "items-start" : "items-end"}`}
      style={{
        ...layout.style,
        width: FAB_SIZE,
        transition: dragging ? "none" : snapTransition,
      }}
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-salon-beige/50 bg-salon-white text-salon-ink transition hover:border-salon-gold/50 hover:text-salon-gold"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
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
        className={`pointer-events-auto flex touch-none items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 transition hover:brightness-105 ${
          dragging ? "scale-105 cursor-grabbing" : "cursor-grab hover:scale-[1.04]"
        }`}
        style={{ width: FAB_SIZE, height: FAB_SIZE }}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        title={
          open
            ? "Tap to close chat"
            : "Drag to a corner · Tap to open chat"
        }
      >
        {open ? (
          <X className="h-8 w-8" strokeWidth={2.5} />
        ) : (
          <MessageCircle className="h-9 w-9" strokeWidth={2} fill="currentColor" />
        )}
      </button>
    </div>
  );
}
