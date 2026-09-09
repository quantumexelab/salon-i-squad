import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Salon I Squad",
  description: "Privacy Policy for Salon I Squad salon management system and WhatsApp communication.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: September 5, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Overview</h2>
          <p>
            Salon I Squad (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the salon appointment
            booking website and WhatsApp communication service. This Privacy Policy explains how we collect,
            use, and protect your information when you interact with our website or our official WhatsApp bot
            (+94 72 123 8400).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contact details:</strong> Your mobile phone number and name when you message us or book an appointment.</li>
            <li><strong>Appointment details:</strong> Selected services, dates, preferred time slots, and stylist notes.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To schedule, confirm, modify, and remind you of salon appointments.</li>
            <li>To send automated 1-hour appointment reminders and booking status updates via WhatsApp.</li>
            <li>To answer customer service questions and provide service pricing.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Data Sharing & Security</h2>
          <p>
            We do not sell, rent, or share your personal data with third-party advertisers. Data is processed
            securely using Meta WhatsApp Cloud API and Google Firebase infrastructure solely for appointment
            operations.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Contact Us</h2>
          <p>
            If you have questions about this policy or wish to delete your appointment history, please contact
            us at <strong>info@quantumexe.com</strong> or via WhatsApp at <strong>+94 72 123 8400</strong>.
          </p>
        </div>
      </section>
    </main>
  );
}
