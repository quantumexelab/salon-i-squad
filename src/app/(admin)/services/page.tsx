import type { Metadata } from "next";
import { AdminServicesPage } from "@/components/admin-services-page";

export const metadata: Metadata = {
  title: "Services",
};

export default function ServicesPage() {
  return <AdminServicesPage />;
}
