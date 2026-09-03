"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Loader2 } from "lucide-react";
import { getStaffProfile } from "@/lib/staff-profiles";
import type { StaffProfile } from "@/types/firestore";

export function BarberDetailPage({ id }: { id: string }) {
  const [member, setMember] = useState<StaffProfile | null | undefined>(
    undefined,
  );

  useEffect(() => {
    void getStaffProfile(id).then(setMember);
  }, [id]);

  if (member === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-salon-gold" />
      </div>
    );
  }

  if (!member || !member.isActive) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-salon-muted">Barber not found.</p>
        <Link href="/#team" className="mt-4 inline-block text-sm text-salon-gold">
          Back to team
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/#team"
        className="mb-6 inline-flex items-center gap-1 text-sm text-salon-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Back to team
      </Link>

      <div className="overflow-hidden rounded-2xl border border-salon-beige/35 bg-salon-surface">
        {member.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photoUrl}
            alt={member.name}
            className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-salon-bg text-salon-muted sm:aspect-[16/9]">
            <Award className="h-14 w-14 text-salon-gold/50" />
          </div>
        )}

        <div className="space-y-4 p-5 sm:p-8">
          <div>
            <h1 className="text-3xl font-semibold text-salon-ink">
              {member.name}
            </h1>
            <p className="mt-1 text-base text-salon-gold">{member.role}</p>
            {member.yearsExperience ? (
              <p className="mt-1 text-sm text-salon-muted">
                {member.yearsExperience}+ years experience
              </p>
            ) : null}
          </div>

          {member.qualifications.length > 0 ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-salon-muted">
                Qualifications
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm text-salon-ink">
                {member.qualifications.map((q) => (
                  <li key={q} className="flex gap-2">
                    <span className="text-salon-gold">·</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {member.specialties.length > 0 ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-salon-muted">
                Specialties
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {member.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-salon-gold/30 bg-salon-gold/10 px-3 py-1 text-xs font-medium text-salon-gold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {member.bio ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-salon-muted">
                About
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-salon-ink">
                {member.bio}
              </p>
            </div>
          ) : null}

          <Link
            href="/booking"
            className="salon-gold-btn inline-flex h-11 items-center justify-center rounded-xl px-6 text-sm font-bold text-black"
          >
            Book appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
