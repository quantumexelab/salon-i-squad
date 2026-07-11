import type { Metadata } from "next";
import { AdminBuffersPage } from "@/components/admin-buffers-page";

export const metadata: Metadata = {
  title: "Buffers",
};

export default function BufferSettingsPage() {
  return <AdminBuffersPage />;
}
