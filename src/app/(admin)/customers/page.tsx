import type { Metadata } from "next";
import { AdminCustomersPage } from "@/components/admin-customers-page";

export const metadata: Metadata = {
  title: "Customers",
};

export default function CustomersPage() {
  return <AdminCustomersPage />;
}
