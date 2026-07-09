import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Day Close",
};

export default function DayClosePage() {
  return (
    <section className="px-4 py-8">
      <h1 className="text-2xl font-semibold">Day Close</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Expected vs realized income and payment summaries will be built here.
      </p>
    </section>
  );
}
