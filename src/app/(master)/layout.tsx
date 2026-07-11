import { MasterShell } from "@/components/master-shell";

export default function MasterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MasterShell>{children}</MasterShell>;
}
