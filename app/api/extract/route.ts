import { NextRequest, NextResponse } from "next/server";
import { extractImageUrls, parseTargetUrl } from "@/lib/extract";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON with a 'url' field." },
      { status: 400 },
    );
  }

  const target = parseTargetUrl((body as { url?: unknown })?.url);
  if (!target) {
    return NextResponse.json(
      { error: "Provide a valid public http(s) chapter URL." },
      { status: 400 },
    );
  }

  let response: Response;
  try {
    response = await fetch(target, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the chapter URL (timeout or network error)." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `The site responded with status ${response.status}.` },
      { status: 502 },
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    return NextResponse.json(
      { error: "The URL did not return an HTML page." },
      { status: 422 },
    );
  }

  const html = (await response.text()).slice(0, MAX_HTML_BYTES);
  // response.url reflects the final URL after redirects, so relative image
  // paths resolve correctly even when the chapter URL redirects.
  const images = extractImageUrls(html, response.url || target.href);

  return NextResponse.json({
    source: response.url || target.href,
    count: images.length,
    images,
  });
}
