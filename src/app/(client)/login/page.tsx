import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <section className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-salon-bg px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-salon-gold/10 via-salon-bg to-salon-bg" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-64 w-64 rounded-full bg-salon-gold/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-salon-champagne/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <ThemeToggle size="compact" />
        </div>
        <LoginForm />
      </div>
    </section>
  );
}
