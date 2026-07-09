import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Details",
};

type BookingPageProps = {
  params: Promise<{ bookingId: string }>;
};

export default async function BookingPage({ params }: BookingPageProps) {
  const { bookingId } = await params;

  return (
    <section className="px-4 py-8">
      <h1 className="text-2xl font-semibold">Booking</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Booking ID: {bookingId}
      </p>
    </section>
  );
}
