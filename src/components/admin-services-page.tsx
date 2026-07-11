"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { formatLkr } from "@/lib/booking/dummy-services";
import {
  createService,
  deleteService,
  subscribeToServices,
  updateService,
  type ServiceInput,
} from "@/lib/services";
import type { Service } from "@/types/firestore";

const emptyForm: ServiceInput = {
  name: "",
  description: "",
  durationMinutes: 30,
  price: 0,
  isActive: true,
  requiresConsultation: false,
};

export function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ServiceInput>(emptyForm);

  useEffect(() => {
    const unsubscribe = subscribeToServices(
      (next) => {
        setServices(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError(null);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? "",
      durationMinutes: service.durationMinutes,
      price: service.price,
      isActive: service.isActive,
      requiresConsultation: service.requiresConsultation,
    });
    setFormOpen(true);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await updateService(editingId, form);
      } else {
        await createService(form);
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save service.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(service: Service) {
    const ok = window.confirm(`Delete “${service.name}”? This cannot be undone.`);
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      await deleteService(service.id);
      if (editingId === service.id) {
        setFormOpen(false);
        setEditingId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete service.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Salon catalog
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Services
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Manage offerings shown on the client booking app.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-zinc-950 hover:bg-amber-300"
        >
          <Plus className="h-4 w-4" />
          Add service
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:grid-cols-2"
        >
          <h2 className="text-sm font-semibold text-white sm:col-span-2">
            {editingId ? "Edit service" : "New service"}
          </h2>
          <label className="grid gap-1.5 text-xs text-zinc-400 sm:col-span-2">
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-zinc-400 sm:col-span-2">
            Description
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-zinc-400">
            Duration (minutes)
            <input
              required
              type="number"
              min={5}
              step={5}
              value={form.durationMinutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  durationMinutes: Number(e.target.value),
                }))
              }
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-zinc-400">
            Price (LKR)
            <input
              required
              type="number"
              min={0}
              step={50}
              value={form.price}
              onChange={(e) =>
                setForm((f) => ({ ...f, price: Number(e.target.value) }))
              }
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
              className="h-4 w-4 rounded border-zinc-600"
            />
            Active (visible on client booking)
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create service"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
              className="h-11 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            Loading services…
          </div>
        ) : services.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm font-medium text-zinc-300">No services yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              Add your first service to show it on the booking app.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{service.name}</p>
                    {!service.isActive ? (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
                        Hidden
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {service.description || "No description"}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {service.durationMinutes} mins ·{" "}
                    <span className="text-amber-400">
                      {formatLkr(service.price)}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openEdit(service)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDelete(service)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
