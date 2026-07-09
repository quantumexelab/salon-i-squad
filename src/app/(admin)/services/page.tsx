import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
};

export default function ServicesPage() {
  return (
    <section className="px-4 py-8">
      <h1 className="text-2xl font-semibold">Service Management</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Add and edit services, prices, and durations here.
      </p>
    </section>
  );
}
