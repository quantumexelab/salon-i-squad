"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  saveBrandingLogoUrl,
  subscribeToBranding,
  uploadBrandingLogoFile,
} from "@/lib/branding";
import { siteConfig } from "@/lib/site";

export function MasterBrandingSection() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToBranding(
      (branding) => {
        setLogoUrl(branding.logoUrl);
        setDraftUrl(branding.logoUrl);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  async function handleSaveUrl(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await saveBrandingLogoUrl({
        logoUrl: draftUrl,
        updatedBy: user?.uid,
      });
      setLogoUrl(saved.logoUrl);
      setMessage(
        saved.logoUrl
          ? "Logo URL saved. Client and admin headers will update live."
          : "Logo cleared. Apps will show the text brand name.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save logo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const url = await uploadBrandingLogoFile(file);
      const saved = await saveBrandingLogoUrl({
        logoUrl: url,
        updatedBy: user?.uid,
      });
      setDraftUrl(saved.logoUrl);
      setLogoUrl(saved.logoUrl);
      setMessage("Logo uploaded and saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed. You can still paste an image URL instead.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">System branding</h3>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-zinc-400">
        Only the master account can change the app logo. Clients and salon
        admins see it in their headers. Leave blank to show “{siteConfig.name}”
        as text.
      </p>

      {loading ? (
        <div className="flex justify-center py-8 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex min-h-16 items-center rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Current logo"
                className="h-10 w-auto max-w-[200px] object-contain"
              />
            ) : (
              <p className="text-sm font-semibold text-zinc-300">
                {siteConfig.name}{" "}
                <span className="font-normal text-zinc-500">(text fallback)</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSaveUrl} className="grid gap-3">
            <label className="grid gap-1.5 text-xs text-zinc-400">
              Logo image URL
              <input
                type="url"
                value={draftUrl}
                placeholder="https://…"
                onChange={(e) => setDraftUrl(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save logo URL
              </button>
              <button
                type="button"
                disabled={saving || uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 text-amber-400" />
                )}
                Upload image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  void handleFileChange(e.target.files?.[0] ?? null)
                }
              />
            </div>
          </form>

          {message ? (
            <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
