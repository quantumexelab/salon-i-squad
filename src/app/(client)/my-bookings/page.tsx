import type { Metadata } from "next";
import { MyBookingsPage } from "@/components/my-bookings-page";

export const metadata: Metadata = {
  title: "My Bookings",
};

export default function MyBookingsRoute() {
  return <MyBookingsPage />;
}
