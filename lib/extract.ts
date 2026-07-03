import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|avif)(?:[?#].*)?$/i;
const NOISE_PATTERN = /(logo|icon|favicon|avatar|banner|sprite|placeholder|loading|spinner)/i;
const BLOCKED_HOSTS =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)|(\.local|\.internal)$|^\[?::1\]?$/i;

// Lazy-load attributes take priority over src, which often holds a
// placeholder on sites that hydrate images client-side.
const IMAGE_ATTRIBUTES = [
  "data-src",
  "data-lazy-src",
  "data-original",
  "data-url",
  "data-image",
  "src",
];

// Chapter-image containers used by common manga CMS themes, most specific
// first. #readerarea is MangaStream/Themesia (utoon, thunderscans);
// .reading-content is Madara; the rest cover popular readers.
const READER_CONTAINER_SELECTORS = [
  "#readerarea",
  ".reading-content",
  ".container-chapter-reader",
  ".chapter-images",
  "#chapter-images",
  ".chapter-content",
];

const TS_READER_MARKER = "ts_reader.run(";

// Base confidence per extraction source. Script payloads are authored by the
// site's own reader and list exactly the chapter pages; containers are
// theme-specific DOM conventions; a generic <img> sweep is a last resort.
const CONFIDENCE_TS_READER = 0.9;
const CONFIDENCE_PRELOADED = 0.85;
const CONFIDENCE_CONTAINER = 0.75;
const CONFIDENCE_CONTAINER_STEP = 0.03;
const CONFIDENCE_GENERIC = 0.35;

// Candidates below this score are considered too unreliable to merge into
// the result at all.
const MIN_MERGE_CONFIDENCE = 0.3;

// If this share of a candidate's file names already appears in the primary
// result, the candidate is the same chapter served from a mirror host and
// merging it would interleave duplicate pages.
const MIRROR_BASENAME_OVERLAP = 0.5;

export type ExtractionMethod = "script" | "container" | "generic";

export type ExtractionResult = {
  /** Chapter pages in reading order. */
  images: string[];
  /** Strategy that produced the primary (ordering) result. */
  method: ExtractionMethod | "none";
  /** Confidence in the primary strategy, 0–1. */
  confidence: number;
};

type Candidate = {
  method: ExtractionMethod;
  images: string[];
  confidence: number;
};

export function parseTargetUrl(raw: unknown): URL | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (BLOCKED_HOSTS.test(url.hostname)) return null;
  return url;
}

function normalizeImageUrl(
  value: unknown,
  baseUrl: string,
  { requireExtension }: { requireExtension: boolean },
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("data:")) return null;

  let resolved: URL;
  try {
    resolved = new URL(trimmed, baseUrl);
  } catch {
    return null;
  }
  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
    return null;
  }
  if (requireExtension && !IMAGE_EXTENSION.test(resolved.pathname)) {
    return null;
  }
  if (NOISE_PATTERN.test(resolved.href)) return null;
  return resolved.href;
}

/** Normalizes raw URL values, dropping invalid entries and duplicates while
 * preserving the input (reading) order. */
function normalizeAll(
  values: unknown[],
  baseUrl: string,
  requireExtension: boolean,
): string[] {
  const found = new Set<string>();
  for (const value of values) {
    const href = normalizeImageUrl(value, baseUrl, { requireExtension });
    if (href) found.add(href);
  }
  return [...found];
}

function pickImageAttribute($img: Cheerio<Element>): string | null {
  for (const attribute of IMAGE_ATTRIBUTES) {
    const value = $img.attr(attribute)?.trim();
    if (value && !value.startsWith("data:")) return value;
  }
  return null;
}

function urlBasename(url: string): string {
  try {
    return new URL(url).pathname.split("/").pop()?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

/** Extracts the last number in a URL's file name, e.g. page-012.webp -> 12. */
function trailingPageNumber(url: string): number | null {
  const match = urlBasename(url).match(/(\d+)(?!.*\d)/);
  return match ? parseInt(match[1], 10) : null;
}

function clampConfidence(score: number): number {
  return Math.min(0.99, Math.max(0.05, score));
}

/**
 * Scores a candidate from its base confidence: very short lists are likely
 * stray images rather than a chapter, while file names numbered in ascending
 * order strongly suggest sequential manga pages.
 */
function scoreCandidate(base: number, images: string[]): number {
  let score = base;
  if (images.length === 1) score -= 0.25;
  else if (images.length === 2) score -= 0.1;
  else if (images.length >= 5) score += 0.05;

  const numbers = images
    .map(trailingPageNumber)
    .filter((n): n is number => n !== null);
  if (numbers.length >= 3) {
    let ordered = 0;
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] >= numbers[i - 1]) ordered++;
    }
    if (ordered / (numbers.length - 1) >= 0.8) score += 0.05;
  }

  return clampConfidence(score);
}

/**
 * Extracts a balanced JSON object/array starting at or after `startIndex`,
 * tracking string literals so brackets inside URLs don't break matching.
 */
function sliceBalancedJson(text: string, startIndex: number): string | null {
  let start = startIndex;
  while (start < text.length && /\s/.test(text[start])) start++;

  const open = text[start];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return null;

  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === open) {
      depth++;
    } else if (char === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function collectStringsDeep(value: unknown, into: string[]): void {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStringsDeep(item, into);
}

/**
 * MangaStream/Themesia sites (utoon, thunderscans) ship pages as
 * `ts_reader.run({..., "sources": [{"images": [...]}]})`; Madara sites use
 * `chapter_preloaded_images = [...]`. Every payload on the page becomes its
 * own candidate; the mirror servers *within* one ts_reader call collapse to
 * the most complete server, since they are alternate hosts for the same
 * pages, not additional pages.
 */
function scriptCandidates($: CheerioAPI, baseUrl: string): Candidate[] {
  const candidates: Candidate[] = [];

  const addCandidate = (rawImages: unknown[], base: number) => {
    const images = normalizeAll(rawImages, baseUrl, false);
    if (images.length > 0) {
      candidates.push({
        method: "script",
        images,
        confidence: scoreCandidate(base, images),
      });
    }
  };

  $("script").each((_, element) => {
    const script = $(element).text();
    if (script === "") return;

    let searchFrom = 0;
    while (true) {
      const markerIndex = script.indexOf(TS_READER_MARKER, searchFrom);
      if (markerIndex === -1) break;
      searchFrom = markerIndex + TS_READER_MARKER.length;

      const json = sliceBalancedJson(script, searchFrom);
      if (!json) continue;
      try {
        const config = JSON.parse(json) as { sources?: { images?: unknown }[] };
        const servers: string[][] = [];
        for (const source of config.sources ?? []) {
          const images: string[] = [];
          collectStringsDeep(source.images, images);
          if (images.length > 0) servers.push(images);
        }
        if (servers.length > 0) {
          const best = servers.reduce((a, b) => (b.length > a.length ? b : a));
          addCandidate(best, CONFIDENCE_TS_READER);
        }
      } catch {
        // Malformed payload — other payloads/strategies may still work.
      }
    }

    for (const match of script.matchAll(/chapter_preloaded_images\s*=\s*/g)) {
      const json = sliceBalancedJson(script, match.index + match[0].length);
      if (!json) continue;
      try {
        const images: string[] = [];
        collectStringsDeep(JSON.parse(json), images);
        addCandidate(images, CONFIDENCE_PRELOADED);
      } catch {
        // Malformed payload — other payloads/strategies may still work.
      }
    }
  });

  return candidates;
}

function collectContainerImages(
  $: CheerioAPI,
  $images: Cheerio<Element>,
  baseUrl: string,
  requireExtension: boolean,
): string[] {
  const values: unknown[] = [];
  $images.each((_, element) => {
    values.push(pickImageAttribute($(element)));
  });
  return normalizeAll(values, baseUrl, requireExtension);
}

function containerCandidates($: CheerioAPI, baseUrl: string): Candidate[] {
  const candidates: Candidate[] = [];
  READER_CONTAINER_SELECTORS.forEach((selector, index) => {
    const images = collectContainerImages(
      $,
      $(selector).find("img"),
      baseUrl,
      false,
    );
    if (images.length > 0) {
      const base = CONFIDENCE_CONTAINER - index * CONFIDENCE_CONTAINER_STEP;
      candidates.push({
        method: "container",
        images,
        confidence: scoreCandidate(base, images),
      });
    }
  });
  return candidates;
}

function genericCandidate($: CheerioAPI, baseUrl: string): Candidate | null {
  const images = collectContainerImages($, $("img"), baseUrl, true);
  if (images.length === 0) return null;
  return {
    method: "generic",
    images,
    confidence: scoreCandidate(CONFIDENCE_GENERIC, images),
  };
}

/** True when most of the given file names already exist in the primary
 * result — i.e. these images are the same chapter pages on a mirror host. */
function isMirrorOfPrimary(
  images: string[],
  primaryBasenames: Set<string>,
): boolean {
  const names = images.map(urlBasename).filter((name) => name !== "");
  if (names.length === 0) return false;
  const overlap = names.filter((name) => primaryBasenames.has(name)).length;
  return overlap / names.length >= MIRROR_BASENAME_OVERLAP;
}

/**
 * Extracts chapter images by running every strategy, ranking the resulting
 * candidates by confidence, and merging.
 *
 * The highest-confidence candidate is the primary: it defines the reported
 * method, the confidence, and the reading order of the result. Remaining
 * candidates are appended in confidence order, skipping exact duplicates,
 * mirror copies of the primary pages, and candidates that score below the
 * merge threshold. Within every candidate, document/payload order is
 * preserved, so pages always stay in reading order.
 */
export function extractImages(html: string, baseUrl: string): ExtractionResult {
  const $ = cheerio.load(html);

  const generic = genericCandidate($, baseUrl);
  const candidates = [
    ...scriptCandidates($, baseUrl),
    ...containerCandidates($, baseUrl),
    ...(generic ? [generic] : []),
  ];

  if (candidates.length === 0) {
    return { images: [], method: "none", confidence: 0 };
  }

  // Stable sort: on equal confidence, the more reliable strategy (listed
  // first above) stays first.
  candidates.sort((a, b) => b.confidence - a.confidence);

  const [primary, ...rest] = candidates;
  const merged = [...primary.images];
  const seen = new Set(merged);
  const primaryBasenames = new Set(
    primary.images.map(urlBasename).filter((name) => name !== ""),
  );

  for (const candidate of rest) {
    if (candidate.confidence < MIN_MERGE_CONFIDENCE) continue;
    // Judge only the images this candidate would actually add: a candidate
    // that is a superset of the primary (e.g. the generic sweep) overlaps
    // heavily on the pages themselves, but its *new* images are not mirror
    // copies and should still merge.
    const newImages = candidate.images.filter((image) => !seen.has(image));
    if (newImages.length === 0) continue;
    if (isMirrorOfPrimary(newImages, primaryBasenames)) continue;
    for (const image of newImages) {
      seen.add(image);
      merged.push(image);
    }
  }

  return {
    images: merged,
    method: primary.method,
    confidence: primary.confidence,
  };
}

/** Backwards-compatible helper that returns only the image list. */
export function extractImageUrls(html: string, baseUrl: string): string[] {
  return extractImages(html, baseUrl).images;
}
