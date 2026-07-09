import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <section className="px-4 py-8">
      <h1 className="text-2xl font-semibold">Master Calendar</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Live schedule overview will be built here.
      </p>
    </section>
  );
}
