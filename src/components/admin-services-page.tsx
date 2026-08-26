"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImageIcon, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { formatLkr } from "@/lib/booking/dummy-services";
import { serviceImageFor } from "@/lib/service-images";
import {
  createService,
  deleteService,
  seedCatalogServices,
  subscribeToServices,
  updateService,
  uploadServiceImageFile,
  type ServiceInput,
} from "@/lib/services";
import type { Service } from "@/types/firestore";

type ServiceFormState = {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
  imageUrl: string;
  isActive: boolean;
  requiresConsultation: boolean;
};

const emptyForm: ServiceFormState = {
  name: "",
  description: "",
  durationMinutes: "30",
  price: "",
  imageUrl: "",
  isActive: true,
  requiresConsultation: false,
};

function toServiceInput(form: ServiceFormState): ServiceInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    durationMinutes: Number(form.durationMinutes),
    price: Number(form.price),
    imageUrl: form.imageUrl.trim(),
    isActive: form.isActive,
    requiresConsultation: form.requiresConsultation,
  };
}

export function AdminServicesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);

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
      durationMinutes: String(service.durationMinutes),
      price: String(service.price),
      imageUrl: service.imageUrl ?? "",
      isActive: service.isActive,
      requiresConsultation: service.requiresConsultation,
    });
    setFormOpen(true);
    setError(null);
  }

  async function handleSeedCatalog() {
    setSeeding(true);
    setError(null);
    try {
      const result = await seedCatalogServices(services);
      setError(null);
      window.alert(
        `Catalog updated: ${result.created} new service(s), ${result.updated} image(s) filled.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not seed catalog. Sign in as admin/master first.",
      );
    } finally {
      setSeeding(false);
    }
  }

  async function handleImageUpload(file: File | null) {
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const url = await uploadServiceImageFile(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed. You can paste an image URL instead.",
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const durationMinutes = Number(form.durationMinutes);
    const price = Number(form.price);
    if (
      !form.durationMinutes.trim() ||
      Number.isNaN(durationMinutes) ||
      durationMinutes < 5
    ) {
      setError("Enter a valid duration (at least 5 minutes).");
      return;
    }
    if (!form.price.trim() || Number.isNaN(price) || price < 0) {
      setError("Enter a valid price.");
      return;
    }

    const payload = toServiceInput(form);
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await updateService(editingId, payload);
      } else {
        await createService(payload);
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSeedCatalog()}
            disabled={saving || seeding}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-400/40 px-4 text-sm font-semibold text-amber-300 hover:bg-amber-400/10 disabled:opacity-60"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Add sample services + images
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-zinc-950 hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" />
            Add service
          </button>
        </div>
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
                setForm((f) => ({ ...f, durationMinutes: e.target.value }))
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
              placeholder="0"
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-zinc-400 sm:col-span-2">
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
              Card image (booking app)
            </span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 sm:w-32">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={serviceImageFor(form.name || "Service", form.imageUrl)}
                  alt="Service preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="grid min-w-0 flex-1 gap-2">
                <input
                  type="url"
                  value={form.imageUrl}
                  placeholder="https://… or upload below"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                  className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving || uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 disabled:opacity-60"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    Upload image
                  </button>
                  {form.imageUrl ? (
                    <button
                      type="button"
                      disabled={saving || uploadingImage}
                      onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                      className="h-10 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-400"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Shown on the client booking cards. Leave blank for a default
                  salon photo.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleImageUpload(e.target.files?.[0] ?? null)}
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
          <label className="flex items-start gap-2 text-sm text-zinc-300 sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(form.requiresConsultation)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  requiresConsultation: e.target.checked,
                }))
              }
              className="mt-0.5 h-4 w-4 rounded border-zinc-600"
            />
            <span>
              Requires prior consultation
              <span className="mt-0.5 block text-xs text-zinc-500">
                Clients book a 15-minute consultation first (e.g. hair colouring).
              </span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving || uploadingImage}
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
                <div className="flex min-w-0 gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={serviceImageFor(service.name, service.imageUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{service.name}</p>
                    {!service.isActive ? (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-400">
                        Hidden
                      </span>
                    ) : null}
                    {service.requiresConsultation ? (
                      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                        Consultation first
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
                    {service.requiresConsultation
                      ? " · books as 15-min consultation"
                      : ""}
                  </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving || uploadingImage}
                    onClick={() => openEdit(service)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={saving || uploadingImage}
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
