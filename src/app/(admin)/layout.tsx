import Link from "next/link";
import { siteConfig } from "@/lib/site";

const adminNav = [
  { href: "/admin", label: "Bookings" },
  { href: "/services", label: "Services" },
  { href: "/buffers", label: "Buffers" },
  { href: "/day-close", label: "Day Close" },
] as const;

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full bg-zinc-950 text-zinc-50">
      <aside className="hidden w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 p-5 md:flex md:flex-col">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">
            Salon I Squad Admin
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-300">
            {siteConfig.name}
          </p>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/booking"
          className="mt-auto rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
        >
          ← Client booking app
        </Link>
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        <header className="border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white md:hidden">
                Salon I Squad Admin
              </p>
              <p className="hidden text-sm font-semibold text-white md:block">
                Admin Dashboard
              </p>
            </div>
            <nav className="flex gap-1 overflow-x-auto md:hidden">
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
