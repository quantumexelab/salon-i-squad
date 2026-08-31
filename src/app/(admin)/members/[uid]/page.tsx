import { MemberProfilePage } from "@/components/member-profile-page";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return <MemberProfilePage uid={uid} />;
}
