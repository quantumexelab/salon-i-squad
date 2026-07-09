import { siteConfig } from "@/lib/site";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur">
        <p className="text-sm font-semibold tracking-wide text-zinc-50">
          {siteConfig.name}
        </p>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
