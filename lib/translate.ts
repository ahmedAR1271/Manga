export const GEMINI_MODEL = "gemini-2.5-flash";
export const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const BLOCK_KINDS = ["dialogue", "thought", "narration", "sfx"] as const;
export type TranslationBlockKind = (typeof BLOCK_KINDS)[number];

export type TranslationBlock = {
  /** Source text as it appears on the page. */
  original: string;
  /** Natural Arabic translation. */
  arabic: string;
  kind: TranslationBlockKind;
};

const SYSTEM_PROMPT = `You are an expert manga translator producing natural Arabic translations.

You receive one manga page, either as an image or as text extracted from it (OCR).

Find the readable story text on the page: dialogue, thoughts, narration, and meaningful sound effects.

Rules:
- Translate into natural, fluent Arabic that preserves each line's tone and emotion (casual, formal, angry, comedic, dramatic).
- Keep character names and proper nouns: transliterate them into Arabic script; never translate their meaning or localize them.
- Ignore anything that is not story text: watermarks, site names or URLs, chapter credits, scanlation group notes, page numbers, and reader UI elements.
- Keep blocks in the natural reading order of the page.
- If the page contains no translatable story text, return an empty blocks array.

Return only JSON matching the provided schema.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: {
            type: "string",
            description: "The source text exactly as it appears on the page",
          },
          arabic: {
            type: "string",
            description: "Natural Arabic translation of the text",
          },
          kind: {
            type: "string",
            enum: [...BLOCK_KINDS],
          },
        },
        required: ["original", "arabic", "kind"],
      },
    },
  },
  required: ["blocks"],
};

export type TranslateInput = {
  /** Extracted page text / OCR result, when available. */
  text?: string;
  /** Base64-encoded page image, used when no text is available. */
  imageBase64?: string;
  imageMimeType?: string;
};

export function buildGeminiRequestBody(input: TranslateInput): object {
  const parts: object[] = [];
  if (input.imageBase64 && input.imageMimeType) {
    parts.push({
      inline_data: { mime_type: input.imageMimeType, data: input.imageBase64 },
    });
  }
  if (input.text) {
    parts.push({ text: `Extracted page text (OCR):\n${input.text}` });
  }
  parts.push({ text: "Translate this manga page into Arabic." });

  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Extracts the structured translation blocks from a Gemini generateContent
 * response. Returns null when the response doesn't contain parseable JSON in
 * the expected shape; individually malformed blocks are dropped.
 */
export function parseGeminiResponse(payload: unknown): TranslationBlock[] | null {
  if (!isRecord(payload)) return null;
  const candidate = Array.isArray(payload.candidates)
    ? payload.candidates[0]
    : null;
  if (!isRecord(candidate) || !isRecord(candidate.content)) return null;
  const parts = candidate.content.parts;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .join("");
  if (text.trim() === "") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.blocks)) return null;

  const blocks: TranslationBlock[] = [];
  for (const entry of parsed.blocks) {
    if (!isRecord(entry)) continue;
    const original =
      typeof entry.original === "string" ? entry.original.trim() : "";
    const arabic = typeof entry.arabic === "string" ? entry.arabic.trim() : "";
    if (arabic === "") continue;
    const kind = (BLOCK_KINDS as readonly string[]).includes(
      entry.kind as string,
    )
      ? (entry.kind as TranslationBlockKind)
      : "dialogue";
    blocks.push({ original, arabic, kind });
  }
  return blocks;
}
