import type { Metadata } from "next";
import Link from "next/link";
import { MasterCalendarSection } from "@/components/master-calendar-section";

export const metadata: Metadata = {
  title: "Google Calendar",
};

export default function MasterCalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/master"
          className="text-xs font-medium text-amber-400 hover:text-amber-300"
        >
          ← Master console
        </Link>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          Google Calendar
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Configure credentials so new, rescheduled, and cancelled bookings sync
          to the salon owner&apos;s calendar.
        </p>
      </div>
      <MasterCalendarSection />
    </div>
  );
}
