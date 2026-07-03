const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|avif)(?:[?#].*)?$/i;
const NOISE_PATTERN = /(logo|icon|favicon|avatar|banner|sprite|placeholder|loading|spinner)/i;
const BLOCKED_HOSTS =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)|(\.local|\.internal)$|^\[?::1\]?$/i;

// Attributes commonly used by manga sites for real or lazy-loaded page images.
const IMAGE_ATTRIBUTES = [
  "src",
  "data-src",
  "data-lazy-src",
  "data-original",
  "data-url",
  "data-image",
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

export function extractImageUrls(html: string, baseUrl: string): string[] {
  const found = new Set<string>();
  const attrPattern = new RegExp(
    `(?:${IMAGE_ATTRIBUTES.join("|")})\\s*=\\s*["']([^"']+)["']`,
    "gi",
  );

  for (const imgTag of html.match(/<img\b[^>]*>/gi) ?? []) {
    for (const attrMatch of imgTag.matchAll(attrPattern)) {
      const value = attrMatch[1].trim();
      if (value === "" || value.startsWith("data:")) continue;

      let resolved: URL;
      try {
        resolved = new URL(value, baseUrl);
      } catch {
        continue;
      }
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
        continue;
      }

      const href = resolved.href;
      if (IMAGE_EXTENSION.test(resolved.pathname) && !NOISE_PATTERN.test(href)) {
        found.add(href);
      }
    }
  }

  return [...found];
}
