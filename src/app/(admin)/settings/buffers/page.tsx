import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buffer Settings",
};

export default function BufferSettingsPage() {
  return (
    <section className="px-4 py-8">
      <h1 className="text-2xl font-semibold">Buffer Time Settings</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Cleanup windows between appointments will be configured here.
      </p>
    </section>
  );
}
