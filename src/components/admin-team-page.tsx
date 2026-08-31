"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createStaffProfile,
  deleteStaffProfile,
  subscribeToStaffProfiles,
  updateStaffProfile,
  type StaffProfileInput,
} from "@/lib/staff-profiles";
import type { StaffProfile } from "@/types/firestore";

const emptyForm: StaffProfileInput = {
  name: "",
  role: "Stylist",
  photoUrl: "",
  qualifications: [],
  specialties: [],
  yearsExperience: 0,
  bio: "",
  sortOrder: 0,
  isActive: true,
};

export function AdminTeamPage() {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<StaffProfileInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return subscribeToStaffProfiles(
      (next) => {
        setStaff(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, []);

  function openEdit(s: StaffProfile) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      role: s.role,
      photoUrl: s.photoUrl ?? "",
      qualifications: s.qualifications,
      specialties: s.specialties,
      yearsExperience: s.yearsExperience ?? 0,
      bio: s.bio ?? "",
      sortOrder: s.sortOrder,
      isActive: s.isActive,
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        qualifications: form.qualifications.filter(Boolean),
        specialties: form.specialties.filter(Boolean),
        photoUrl: form.photoUrl?.trim() || undefined,
      };
      if (editingId) {
        await updateStaffProfile(editingId, payload);
      } else {
        await createStaffProfile(payload);
      }
      setEditingId(null);
      setForm(emptyForm);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-salon-ink">Team & qualifications</h1>
      <p className="mt-1 text-sm text-salon-muted">
        Shown on the public website — stylists and their credentials.
      </p>

      <div className="mt-6 grid gap-3 rounded-2xl border border-salon-beige/30 bg-salon-surface p-5">
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="h-10 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm"
        />
        <input
          placeholder="Role (e.g. Senior Stylist)"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          className="h-10 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm"
        />
        <input
          placeholder="Photo URL"
          value={form.photoUrl ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
          className="h-10 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm"
        />
        <input
          placeholder="Qualifications (comma-separated)"
          value={form.qualifications.join(", ")}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              qualifications: e.target.value.split(",").map((s) => s.trim()),
            }))
          }
          className="h-10 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm"
        />
        <input
          placeholder="Specialties (comma-separated)"
          value={form.specialties.join(", ")}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              specialties: e.target.value.split(",").map((s) => s.trim()),
            }))
          }
          className="h-10 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm"
        />
        <textarea
          placeholder="Bio"
          value={form.bio ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={2}
          className="rounded-xl border border-salon-beige/40 bg-salon-bg px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={saving || !form.name.trim()}
          onClick={() => void handleSave()}
          className="salon-gold-btn h-10 rounded-xl text-sm font-bold text-black"
        >
          {editingId ? "Update" : "Add"} team member
        </button>
      </div>

      {loading ? (
        <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-salon-gold" />
      ) : (
        <ul className="mt-6 divide-y divide-salon-beige/30 rounded-2xl border border-salon-beige/30">
          {staff.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <p className="font-medium text-salon-ink">{s.name}</p>
                <p className="text-xs text-salon-muted">
                  {s.role} · {s.qualifications.join(", ") || "No qualifications"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="text-xs text-salon-gold"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void deleteStaffProfile(s.id)}
                  className="text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
