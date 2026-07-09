import type { Metadata } from "next";
import { BookingPageContent } from "@/components/booking-page-content";

export const metadata: Metadata = {
  title: "Book Appointment",
};

export default function BookingPage() {
  return <BookingPageContent />;
}
