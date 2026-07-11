import type { Metadata } from "next";
import { ReschedulePageContent } from "@/components/reschedule-page-content";

export const metadata: Metadata = {
  title: "Reschedule",
};

export default function ReschedulePage() {
  return <ReschedulePageContent />;
}
