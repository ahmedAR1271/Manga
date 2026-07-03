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
// .reading-content/.page-break is Madara; the rest cover popular readers.
const READER_CONTAINER_SELECTORS = [
  "#readerarea",
  ".reading-content",
  ".container-chapter-reader",
  ".chapter-images",
  "#chapter-images",
  ".chapter-content",
];

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

function pickImageAttribute($img: Cheerio<Element>): string | null {
  for (const attribute of IMAGE_ATTRIBUTES) {
    const value = $img.attr(attribute)?.trim();
    if (value && !value.startsWith("data:")) return value;
  }
  return null;
}

/**
 * Extracts a balanced JSON object/array starting at `startIndex` in `text`,
 * tracking string literals so braces inside URLs don't break matching.
 */
function sliceBalancedJson(text: string, startIndex: number): string | null {
  const open = text[startIndex];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return null;

  let depth = 0;
  let inString = false;
  for (let i = startIndex; i < text.length; i++) {
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
      if (depth === 0) return text.slice(startIndex, i + 1);
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
 * `chapter_preloaded_images = [...]`. Both are more reliable than the DOM,
 * which may only contain placeholders before client-side hydration.
 */
function extractFromScripts($: CheerioAPI, baseUrl: string): string[] {
  const candidates: string[][] = [];

  $("script").each((_, element) => {
    const script = $(element).text();
    if (script === "") return;

    const tsReaderStart = script.indexOf("ts_reader.run(");
    if (tsReaderStart !== -1) {
      const json = sliceBalancedJson(
        script,
        tsReaderStart + "ts_reader.run(".length,
      );
      if (json) {
        try {
          const config = JSON.parse(json) as {
            sources?: { images?: unknown }[];
          };
          for (const source of config.sources ?? []) {
            const images: string[] = [];
            collectStringsDeep(source.images, images);
            if (images.length > 0) candidates.push(images);
          }
        } catch {
          // Malformed payload — fall through to other strategies.
        }
      }
    }

    const preloadedMatch = script.match(/chapter_preloaded_images\s*=\s*/);
    if (preloadedMatch?.index !== undefined) {
      const json = sliceBalancedJson(
        script,
        preloadedMatch.index + preloadedMatch[0].length,
      );
      if (json) {
        try {
          const images: string[] = [];
          collectStringsDeep(JSON.parse(json), images);
          if (images.length > 0) candidates.push(images);
        } catch {
          // Malformed payload — fall through to other strategies.
        }
      }
    }
  });

  if (candidates.length === 0) return [];

  // When a site offers multiple image servers, take the most complete one.
  const best = candidates.reduce((a, b) => (b.length > a.length ? b : a));
  const found = new Set<string>();
  for (const value of best) {
    const href = normalizeImageUrl(value, baseUrl, { requireExtension: false });
    if (href) found.add(href);
  }
  return [...found];
}

function collectImages(
  $: CheerioAPI,
  $images: Cheerio<Element>,
  baseUrl: string,
  requireExtension: boolean,
): string[] {
  const found = new Set<string>();
  $images.each((_, element) => {
    const value = pickImageAttribute($(element));
    const href =
      value === null
        ? null
        : normalizeImageUrl(value, baseUrl, { requireExtension });
    if (href) found.add(href);
  });
  return [...found];
}

function extractFromReaderContainers($: CheerioAPI, baseUrl: string): string[] {
  for (const selector of READER_CONTAINER_SELECTORS) {
    const images = collectImages($, $(selector).find("img"), baseUrl, false);
    if (images.length > 0) return images;
  }
  return [];
}

/**
 * Returns chapter image URLs in reading order, trying the most reliable
 * source first: script-embedded page lists, then known reader containers,
 * then any img tag that looks like a content image.
 */
export function extractImageUrls(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);

  const fromScripts = extractFromScripts($, baseUrl);
  if (fromScripts.length > 0) return fromScripts;

  const fromContainers = extractFromReaderContainers($, baseUrl);
  if (fromContainers.length > 0) return fromContainers;

  return collectImages($, $("img"), baseUrl, true);
}
