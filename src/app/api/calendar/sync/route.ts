import { NextResponse } from "next/server";
import { syncBookingToGoogleCalendar } from "@/lib/calendar-sync";
import type { SavedBooking } from "@/lib/bookings";
import type { CalendarSyncAction } from "@/lib/calendar-settings";

export const runtime = "nodejs";

type SyncBody = {
  action?: CalendarSyncAction;
  booking?: SavedBooking;
};

export async function POST(request: Request) {
  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON." }, { status: 400 });
  }

  const action = body.action;
  const booking = body.booking;
  if (
    !action ||
    !["create", "update", "delete"].includes(action) ||
    !booking?.id
  ) {
    return NextResponse.json(
      { ok: false, reason: "action and booking.id are required." },
      { status: 400 },
    );
  }

  const result = await syncBookingToGoogleCalendar(action, booking);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
