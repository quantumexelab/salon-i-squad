import type { Metadata } from "next";
import { BarberDetailPage } from "@/components/barber-detail-page";

export const metadata: Metadata = {
  title: "Barber",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TeamMemberPage({ params }: Props) {
  const { id } = await params;
  return <BarberDetailPage id={id} />;
}
