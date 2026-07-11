import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Bookings",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
