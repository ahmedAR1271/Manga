"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ExtractResponse = {
  source?: string;
  count?: number;
  images?: string[];
  error?: string;
};

export default function ReaderPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [source, setSource] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || url.trim() === "") return;

    setLoading(true);
    setError(null);
    setImages([]);
    setSource(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data: ExtractResponse = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to extract images from that URL.");
        return;
      }
      if (!data.images || data.images.length === 0) {
        setError(
          "No page images found at that URL. The site may load images with JavaScript.",
        );
        return;
      }
      setImages(data.images);
      setSource(data.source ?? null);
    } catch {
      setError("Something went wrong while contacting the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Manga AI Reader
          </Link>
          <nav className="flex items-center gap-6 text-sm text-black/60 dark:text-white/60">
            <Link href="/reader" className="text-foreground font-medium">
              Reader
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Reader</h1>
        <p className="mt-2 text-black/60 dark:text-white/60">
          Paste a manga chapter URL and the reader will extract and display its
          pages.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex gap-3">
          <input
            type="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/manga/chapter-1"
            className="flex-1 rounded-full border border-black/15 bg-transparent px-5 py-3 text-sm outline-none transition-colors focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Read"}
          </button>
        </form>

        {error && (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        {source && (
          <p className="mt-6 text-sm text-black/50 dark:text-white/50">
            {images.length} page{images.length === 1 ? "" : "s"} from{" "}
            <span className="break-all">{source}</span>
          </p>
        )}
      </section>

      {images.length > 0 && (
        <section className="mx-auto w-full max-w-3xl px-6 pb-16">
          <div className="flex flex-col items-center gap-2">
            {images.map((imageUrl, index) => (
              <figure key={imageUrl} className="w-full">
                {/* Remote manga hosts are arbitrary, so next/image optimization
                    can't be configured for them — use a plain img tag. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`Page ${index + 1}`}
                  loading="lazy"
                  className="w-full rounded-md"
                />
                <figcaption className="py-1 text-center text-xs text-black/40 dark:text-white/40">
                  Page {index + 1} of {images.length}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
