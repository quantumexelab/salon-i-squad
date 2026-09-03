"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, ChevronRight } from "lucide-react";
import { subscribeToStaffProfiles } from "@/lib/staff-profiles";
import type { StaffProfile } from "@/types/firestore";

export function TeamSection() {
  const [team, setTeam] = useState<StaffProfile[]>([]);

  useEffect(() => {
    return subscribeToStaffProfiles(setTeam, undefined, { activeOnly: true });
  }, []);

  if (team.length === 0) return null;

  return (
    <section id="team" className="scroll-mt-20 border-t border-salon-beige/30 bg-salon-white py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-salon-gold">
            Our team
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-salon-ink">
            Expert stylists
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <Link
              key={member.id}
              href={`/team/${member.id}`}
              className="group overflow-hidden rounded-2xl border border-salon-beige/35 bg-salon-bg shadow-sm transition hover:border-salon-gold/40"
            >
              {member.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-salon-surface text-salon-muted">
                  <Award className="h-10 w-10 text-salon-gold/50" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-salon-ink">
                      {member.name}
                    </h3>
                    <p className="text-sm text-salon-gold">{member.role}</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-salon-muted transition group-hover:text-salon-gold" />
                </div>
                {member.yearsExperience ? (
                  <p className="mt-1 text-xs text-salon-muted">
                    {member.yearsExperience}+ years experience
                  </p>
                ) : null}
                {member.qualifications.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-salon-muted">
                    {member.qualifications.slice(0, 3).map((q) => (
                      <li key={q}>· {q}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
