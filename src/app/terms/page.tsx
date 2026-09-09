import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Salon I Squad",
  description: "Terms of Service for Salon I Squad salon appointments and WhatsApp service.",
};

export default function TermsOfServicePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: September 5, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Booking Appointments</h2>
          <p>
            By booking an appointment online or through our WhatsApp bot (+94 72 123 8400), you agree to arrive
            at least 10 minutes prior to your scheduled time.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Cancellations & Rescheduling</h2>
          <p>
            You can reschedule or cancel your appointment free of charge up to 2 hours before the start time.
            If you do not arrive within 15 minutes of your scheduled slot without notice, the slot may be
            marked as no-show.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Contact</h2>
          <p>
            For questions or assistance, reach us at info@quantumexe.com or +94 72 123 8400.
          </p>
        </div>
      </section>
    </main>
  );
}
