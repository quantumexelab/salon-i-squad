import type { Metadata } from "next";
import { MasterDashboard } from "@/components/master-dashboard";

export const metadata: Metadata = {
  title: "Master Console",
};

export default function MasterPage() {
  return <MasterDashboard />;
}
