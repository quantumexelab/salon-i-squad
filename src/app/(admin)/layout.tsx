import { siteConfig } from "@/lib/site";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 md:block">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Admin
        </p>
        <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {siteConfig.name}
        </p>
      </aside>
      <div className="flex min-h-full flex-1 flex-col">
        <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <p className="text-sm font-semibold">Admin Dashboard</p>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
