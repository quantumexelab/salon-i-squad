import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reschedule",
};

type ReschedulePageProps = {
  params: Promise<{ bookingId: string }>;
};

export default async function ReschedulePage({ params }: ReschedulePageProps) {
  const { bookingId } = await params;

  return (
    <section className="px-4 py-8">
      <h1 className="text-2xl font-semibold">Reschedule</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Rescheduling for booking {bookingId} will be built here.
      </p>
    </section>
  );
}
