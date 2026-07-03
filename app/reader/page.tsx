"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type TranslationBlock = {
  original: string;
  arabic: string;
  kind: string;
  /** [ymin, xmin, ymax, xmax] normalized to 0–1000, when Gemini located the text. */
  box?: [number, number, number, number];
};

type PageTranslation =
  | { status: "loading" }
  | { status: "done"; blocks: TranslationBlock[] }
  | { status: "error"; message: string };

type ExtractResponse = {
  source?: string;
  count?: number;
  method?: "script" | "container" | "generic" | "none";
  confidence?: number;
  images?: string[];
  error?: string;
};

type TranslateResponse = {
  page?: number | null;
  blocks?: TranslationBlock[];
  error?: string;
};

const METHOD_LABELS: Record<string, string> = {
  script: "reader script payload",
  container: "chapter container",
  generic: "page scan",
};

const API_KEY_STORAGE = "manga-ai-reader:gemini-api-key";
const TRANSLATE_ENABLED_STORAGE = "manga-ai-reader:translation-enabled";

export default function ReaderPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<{
    method: string;
    confidence: number;
  } | null>(null);

  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [translations, setTranslations] = useState<
    Record<string, PageTranslation>
  >({});

  // Session cache and in-flight guard live in refs so re-renders never
  // retrigger requests; the cache persists across chapter loads.
  const translationCache = useRef(new Map<string, TranslationBlock[]>());
  const inFlight = useRef(new Set<string>());
  const apiKeyRef = useRef("");
  const sourceRef = useRef<string | null>(null);
  const pageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem(API_KEY_STORAGE) ?? "");
    setTranslateEnabled(
      localStorage.getItem(TRANSLATE_ENABLED_STORAGE) === "1",
    );
  }, []);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    localStorage.setItem(API_KEY_STORAGE, value);
  }

  function handleTranslateToggle(enabled: boolean) {
    setTranslateEnabled(enabled);
    localStorage.setItem(TRANSLATE_ENABLED_STORAGE, enabled ? "1" : "0");
  }

  const translatePage = useCallback(
    async (imageUrl: string, pageIndex: number) => {
      const key = apiKeyRef.current.trim();
      if (key === "" || inFlight.current.has(imageUrl)) return;

      const cached = translationCache.current.get(imageUrl);
      if (cached) {
        setTranslations((prev) =>
          prev[imageUrl]?.status === "done"
            ? prev
            : { ...prev, [imageUrl]: { status: "done", blocks: cached } },
        );
        return;
      }

      inFlight.current.add(imageUrl);
      setTranslations((prev) => ({
        ...prev,
        [imageUrl]: { status: "loading" },
      }));

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: key,
            imageUrl,
            pageIndex,
            referer: sourceRef.current ?? undefined,
          }),
        });
        const data: TranslateResponse = await response.json();
        if (!response.ok || !data.blocks) {
          throw new Error(data.error ?? "Translation failed.");
        }
        translationCache.current.set(imageUrl, data.blocks);
        setTranslations((prev) => ({
          ...prev,
          [imageUrl]: { status: "done", blocks: data.blocks! },
        }));
      } catch (err) {
        setTranslations((prev) => ({
          ...prev,
          [imageUrl]: {
            status: "error",
            message:
              err instanceof Error ? err.message : "Translation failed.",
          },
        }));
      } finally {
        inFlight.current.delete(imageUrl);
      }
    },
    [],
  );

  // Lazy translation: only pages scrolled near the viewport are sent for
  // translation. Each page is unobserved once its request starts.
  useEffect(() => {
    if (!translateEnabled || apiKey.trim() === "" || images.length === 0) {
      return;
    }
    const root = pageListRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          const imageUrl = element.dataset.imageUrl;
          const pageIndex = Number(element.dataset.pageIndex ?? "0");
          if (imageUrl) {
            observer.unobserve(element);
            void translatePage(imageUrl, pageIndex);
          }
        }
      },
      { rootMargin: "400px 0px" },
    );

    root
      .querySelectorAll<HTMLElement>("[data-image-url]")
      .forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [translateEnabled, apiKey, images, translatePage]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || url.trim() === "") return;

    setLoading(true);
    setError(null);
    setImages([]);
    setSource(null);
    setExtraction(null);
    setTranslations({});

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
      setExtraction(
        data.method && data.method !== "none" && data.confidence !== undefined
          ? { method: data.method, confidence: data.confidence }
          : null,
      );
    } catch {
      setError("Something went wrong while contacting the server.");
    } finally {
      setLoading(false);
    }
  }

  const missingKey = translateEnabled && apiKey.trim() === "";

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

        <div className="mt-6 rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="text-sm font-medium">Enable Translation</span>
              <span className="mt-0.5 block text-xs text-black/50 dark:text-white/50">
                Translate visible pages into Arabic with Gemini
              </span>
            </span>
            <input
              type="checkbox"
              checked={translateEnabled}
              onChange={(event) => handleTranslateToggle(event.target.checked)}
              className="h-5 w-5 accent-black dark:accent-white"
            />
          </label>

          {translateEnabled && (
            <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
              <input
                type="password"
                value={apiKey}
                onChange={(event) => handleApiKeyChange(event.target.value)}
                placeholder="Gemini API key (AIza…)"
                autoComplete="off"
                className="w-full rounded-full border border-black/15 bg-transparent px-5 py-2.5 text-sm outline-none transition-colors focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
              />
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                Your key is kept in this browser&apos;s localStorage and sent
                only with your own translation requests — it is never stored on
                the server.
              </p>
              {missingKey && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  Add your Gemini API key to start translating pages.
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        {source && (
          <p className="mt-6 text-sm text-black/50 dark:text-white/50">
            {images.length} page{images.length === 1 ? "" : "s"} from{" "}
            <span className="break-all">{source}</span>
            {extraction && (
              <>
                {" "}
                · via {METHOD_LABELS[extraction.method] ?? extraction.method} (
                {Math.round(extraction.confidence * 100)}% confidence)
              </>
            )}
          </p>
        )}
      </section>

      {images.length > 0 && (
        <section className="mx-auto w-full max-w-3xl px-6 pb-16">
          <div ref={pageListRef} className="flex flex-col items-center gap-2">
            {images.map((imageUrl, index) => (
              <figure
                key={imageUrl}
                data-image-url={imageUrl}
                data-page-index={index}
                className="w-full"
              >
                <div className="relative w-full overflow-hidden rounded-md">
                  {/* Remote manga hosts are arbitrary, so next/image optimization
                      can't be configured for them — use a plain img tag. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={`Page ${index + 1}`}
                    loading="lazy"
                    className="w-full"
                  />
                  {translateEnabled && !missingKey && (
                    <TranslationOverlay
                      state={translations[imageUrl]}
                      onRetry={() => void translatePage(imageUrl, index)}
                    />
                  )}
                </div>
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

const OVERLAY_TEXT_CLASSES =
  "rounded-md bg-black/70 text-white backdrop-blur-[2px] text-center leading-snug text-[clamp(0.65rem,2.3vw,0.95rem)]";

function TranslationOverlay({
  state,
  onRetry,
}: {
  state: PageTranslation | undefined;
  onRetry: () => void;
}) {
  // Not yet requested — the observer will pick it up on scroll.
  if (!state) return null;

  if (state.status === "loading") {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <span className="animate-pulse rounded-full bg-black/70 px-4 py-1.5 text-xs text-white backdrop-blur-sm">
          Translating…
        </span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="absolute inset-x-3 bottom-3 flex justify-center">
        <div className="flex max-w-full items-center gap-3 rounded-full bg-black/75 py-1.5 pl-4 pr-1.5 text-xs text-red-300 backdrop-blur-sm">
          <span className="truncate">{state.message}</span>
          <button
            onClick={onRetry}
            className="shrink-0 rounded-full border border-white/30 px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (state.blocks.length === 0) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/80 backdrop-blur-sm">
          No text on this page
        </span>
      </div>
    );
  }

  const positioned = state.blocks.filter((block) => block.box);
  const unpositioned = state.blocks.filter((block) => !block.box);

  return (
    <div className="pointer-events-none absolute inset-0">
      {positioned.map((block, blockIndex) => {
        const [ymin, xmin, ymax, xmax] = block.box!;
        // Percentages of the image container, so the overlay scales with the
        // image on any screen size. Widen very small regions (SFX) enough to
        // be readable, keep the bubble inside the right edge, and center it
        // vertically on the text region so it covers the original text.
        const width = Math.min(92, Math.max((xmax - xmin) / 10, 14));
        const left = Math.min(xmin / 10, 98 - width);
        const centerY = (ymin + ymax) / 2 / 10;
        return (
          <p
            key={blockIndex}
            dir="rtl"
            lang="ar"
            title={block.original}
            className={`pointer-events-auto absolute -translate-y-1/2 px-1.5 py-1 sm:px-2 sm:py-1.5 ${OVERLAY_TEXT_CLASSES}`}
            style={{
              top: `${centerY}%`,
              left: `${left}%`,
              width: `${width}%`,
            }}
          >
            {block.arabic}
          </p>
        );
      })}
      {unpositioned.length > 0 && (
        <div className="absolute inset-x-2 bottom-2 flex flex-col items-center gap-1">
          {unpositioned.map((block, blockIndex) => (
            <p
              key={blockIndex}
              dir="rtl"
              lang="ar"
              title={block.original}
              className={`pointer-events-auto max-w-full px-3 py-1.5 ${OVERLAY_TEXT_CLASSES}`}
            >
              {block.arabic}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
