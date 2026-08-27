"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type CountUpProps = {
  end: number;
  decimals?: number;
  suffix?: string;
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUpValue({
  end,
  decimals = 0,
  suffix = "",
  durationMs = 1400,
  className,
  style,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState("0");
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      setDisplay(
        `${end.toFixed(decimals)}${suffix}`,
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || started.current) return;
        started.current = true;

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          const value = end * easeOutCubic(t);
          setDisplay(`${value.toFixed(decimals)}${suffix}`);
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            setDisplay(`${end.toFixed(decimals)}${suffix}`);
          }
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, decimals, suffix, durationMs]);

  return (
    <span ref={ref} className={className} style={style}>
      {display}
    </span>
  );
}

type StatCardProps = {
  end: number;
  decimals?: number;
  suffix?: string;
  label: string;
  icon: ReactNode;
};

export function AnimatedStatCard({
  end,
  decimals = 0,
  suffix = "",
  label,
  icon,
}: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-salon-beige/30 bg-salon-surface/80 px-3 py-3 md:px-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-salon-gold/15 text-salon-gold">
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className="text-lg font-semibold text-salon-ink md:text-xl"
          style={{ fontFamily: "var(--font-landing-display), serif" }}
        >
          <CountUpValue end={end} decimals={decimals} suffix={suffix} />
        </p>
        <p className="truncate text-[11px] text-salon-muted">{label}</p>
      </div>
    </div>
  );
}
