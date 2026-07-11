import type { Metadata } from "next";
import { ClaimMasterContent } from "@/components/claim-master-content";

export const metadata: Metadata = {
  title: "Claim Master",
};

export default function ClaimMasterPage() {
  return <ClaimMasterContent />;
}
