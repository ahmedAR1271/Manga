import { NextRequest, NextResponse } from "next/server";
import { parseTargetUrl } from "@/lib/extract";
import {
  GEMINI_ENDPOINT,
  GEMINI_MODEL,
  buildGeminiRequestBody,
  parseGeminiResponse,
} from "@/lib/translate";

const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const GEMINI_TIMEOUT_MS = 60_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;
const MAX_API_KEY_CHARS = 300;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// The Gemini API key arrives with each request from the client's browser
// storage and is forwarded upstream only — never persisted or logged here.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return errorResponse("Request body must be JSON.", 400);
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (apiKey === "" || apiKey.length > MAX_API_KEY_CHARS) {
    return errorResponse("A Gemini API key is required ('apiKey').", 400);
  }

  const text =
    typeof body.text === "string" && body.text.trim() !== ""
      ? body.text.trim().slice(0, MAX_TEXT_CHARS)
      : null;
  const imageUrlRaw = typeof body.imageUrl === "string" ? body.imageUrl : null;
  const pageIndex =
    typeof body.pageIndex === "number" && Number.isFinite(body.pageIndex)
      ? body.pageIndex
      : null;

  if (!text && !imageUrlRaw) {
    return errorResponse("Provide page 'text' or an 'imageUrl'.", 400);
  }

  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;

  // Extracted/OCR text is preferred when the client has it; otherwise fetch
  // the page image and let Gemini read it directly.
  if (!text && imageUrlRaw) {
    const target = parseTargetUrl(imageUrlRaw);
    if (!target) {
      return errorResponse("Provide a valid public http(s) image URL.", 400);
    }
    const referer =
      typeof body.referer === "string" ? parseTargetUrl(body.referer) : null;

    let imageResponse: Response;
    try {
      imageResponse = await fetch(target, {
        signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
        headers: {
          ...BROWSER_HEADERS,
          Accept: "image/*",
          // Some manga CDNs reject hotlinked requests without a referer.
          ...(referer ? { Referer: referer.href } : {}),
        },
      });
    } catch {
      return errorResponse("Could not fetch the page image.", 502);
    }
    if (!imageResponse.ok) {
      return errorResponse(
        `The image host responded with status ${imageResponse.status}.`,
        502,
      );
    }
    const contentType = (
      imageResponse.headers.get("content-type") ?? ""
    ).split(";")[0];
    if (!contentType.startsWith("image/")) {
      return errorResponse("The URL did not return an image.", 422);
    }
    const buffer = await imageResponse.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      return errorResponse("The page image is empty or too large.", 413);
    }
    imageBase64 = Buffer.from(buffer).toString("base64");
    imageMimeType = contentType;
  }

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(
        buildGeminiRequestBody({
          text: text ?? undefined,
          imageBase64,
          imageMimeType,
        }),
      ),
    });
  } catch {
    return errorResponse("Gemini did not respond in time.", 504);
  }

  if (geminiResponse.status === 400 || geminiResponse.status === 401 || geminiResponse.status === 403) {
    return errorResponse(
      "Gemini rejected the request — check that your API key is valid.",
      401,
    );
  }
  if (geminiResponse.status === 429) {
    return errorResponse(
      "Gemini rate limit reached — wait a moment and try again.",
      429,
    );
  }
  if (!geminiResponse.ok) {
    return errorResponse(
      `Gemini responded with status ${geminiResponse.status}.`,
      502,
    );
  }

  let payload: unknown;
  try {
    payload = await geminiResponse.json();
  } catch {
    return errorResponse("Gemini returned an unreadable response.", 502);
  }

  const blocks = parseGeminiResponse(payload);
  if (blocks === null) {
    return errorResponse("Gemini returned an unexpected response shape.", 502);
  }

  return NextResponse.json({
    page: pageIndex,
    model: GEMINI_MODEL,
    blocks,
  });
}
