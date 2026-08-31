"use client";

import { AuthGuard } from "@/components/auth-guard";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <AuthGuard>
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <RegisterForm />
      </section>
    </AuthGuard>
  );
}
