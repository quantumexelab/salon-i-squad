import type { Metadata } from "next";
import { AdminDayClosePage } from "@/components/admin-day-close-page";

export const metadata: Metadata = {
  title: "Day Close",
};

export default function DayClosePage() {
  return <AdminDayClosePage />;
}
