import { z } from "zod";
import { extractJSON } from "./gateway";
import { AIUnavailableError } from "./llm";

export interface ImageInput {
  base64: string;
  mimeType?: string;
}

export const DirectAnswerItemSchema = z.object({
  number: z.number(),
  questionSnippet: z.string(),
  answer: z.string(),
  keyExplanation: z.string(),
});
export type DirectAnswerItem = z.infer<typeof DirectAnswerItemSchema>;

export const DirectAnswerResponseSchema = z.object({
  transcription: z.string().optional().default(""),
  directAnswers: z.array(DirectAnswerItemSchema).default([]),
});
export type DirectAnswerResponse = z.infer<typeof DirectAnswerResponseSchema>;

export const OCR_TRANSCRIPTION_PROMPT = `You are an expert OCR and document digitization engine.
Transcribe the complete content of the provided document or homework image with high fidelity:
1. Transcribe all text, headings, question numbers, and instructions accurately.
2. Format all mathematical equations, variables, and formulas using standard LaTeX enclosed in $...$ (inline) or $$...$$ (display block).
3. If there are diagrams, charts, or geometric figures, provide a clear textual description in brackets, e.g. [Diagram: Triangle ABC with right angle at B, AB=3, BC=4].
4. Transcribe tables into standard Markdown tables.
5. Organize the output into clean, readable Markdown without conversational filler.`;

export const DIRECT_ANSWER_PROMPT = `You are an expert tutor solving scanned homework, worksheet, or exam problems.
Tasks:
1. Provide an accurate, comprehensive Markdown transcription of all questions, instructions, and context from the scan.
2. Format all mathematical equations, expressions, and formulas using standard LaTeX ($...$ for inline, $$...$$ for display blocks).
3. If diagrams, geometric figures, or graphs are present, describe them clearly in brackets, e.g. [Diagram: Triangle ABC with right angle at B].
4. Solve every question found in the scan and provide:
   - "number": Question number (integer).
   - "questionSnippet": A clear summary or excerpt of the question.
   - "answer": The direct, verified answer or solution.
   - "keyExplanation": A concise step-by-step reasoning or conceptual proof.

Output MUST be valid JSON matching this schema:
{
  "transcription": "<complete markdown transcription with LaTeX math>",
  "directAnswers": [
    {
      "number": 1,
      "questionSnippet": "<question snippet>",
      "answer": "<direct answer>",
      "keyExplanation": "<step-by-step key explanation>"
    }
  ]
}`;

export function cleanBase64Payload(
  base64: string,
  fallbackMime?: string
): { data: string; mimeType: string } {
  const commaIdx = base64.indexOf(",");
  if (commaIdx !== -1) {
    const header = base64.slice(0, commaIdx);
    const data = base64.slice(commaIdx + 1);
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : (fallbackMime || "image/jpeg");
    return { data, mimeType };
  }
  return {
    data: base64,
    mimeType: fallbackMime || "image/jpeg",
  };
}

export function normalizeImageDataUrl(image: ImageInput): string {
  if (image.base64.startsWith("data:")) {
    return image.base64;
  }
  const mime = image.mimeType || "image/jpeg";
  return `data:${mime};base64,${image.base64}`;
}

async function callGeminiRestAPI(
  apiKey: string,
  prompt: string,
  images: ImageInput[],
  jsonMode: boolean,
  timeoutMs: number
): Promise<string> {
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];

  for (const img of images) {
    const { data, mimeType } = cleanBase64Payload(img.base64, img.mimeType);
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data,
      },
    });
  }

  const model = process.env.AI_VISION_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      ...(jsonMode ? { response_mime_type: "application/json" } : {}),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AIUnavailableError(
      `Gemini Vision API error (${res.status}): ${detail.slice(0, 200)}`
    );
  }

  const result = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new AIUnavailableError("Gemini Vision returned an empty response.");
  }
  return rawText.trim();
}

async function callOpenAIVision(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  images: ImageInput[],
  jsonMode: boolean,
  timeoutMs: number
): Promise<string> {
  const model = process.env.AI_VISION_MODEL || "gemini-3-8-flash";
  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];

  for (const img of images) {
    const dataUrl = normalizeImageDataUrl(img);
    content.push({
      type: "image_url",
      image_url: { url: dataUrl },
    });
  }

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content }],
    temperature: 0.2,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AIUnavailableError(
      `AI Vision menolak permintaan (${res.status}). ${detail.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const rawText = data.choices?.[0]?.message?.content;
  if (rawText === undefined || rawText === null) {
    throw new AIUnavailableError("AI Vision mengembalikan respons kosong.");
  }
  return rawText.trim();
}

export async function completeVision(
  prompt: string,
  images: ImageInput[],
  opts: { jsonMode?: boolean; timeoutMs?: number } = {}
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const jsonMode = opts.jsonMode ?? false;

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      return await callGeminiRestAPI(geminiApiKey, prompt, images, jsonMode, timeoutMs);
    } catch (err) {
      // Fallback to AI_BASE_URL if available
      const baseUrl = (process.env.AI_BASE_URL || "").replace(/\/+$/, "");
      const apiKey = process.env.AI_API_KEY || "";
      if (baseUrl && apiKey) {
        return await callOpenAIVision(baseUrl, apiKey, prompt, images, jsonMode, timeoutMs);
      }
      throw err;
    }
  }

  const baseUrl = (process.env.AI_BASE_URL || "").replace(/\/+$/, "");
  const apiKey = process.env.AI_API_KEY || "";
  if (!baseUrl || !apiKey) {
    throw new AIUnavailableError(
      "AI Vision belum dikonfigurasi (AI_BASE_URL / AI_API_KEY / GEMINI_API_KEY)."
    );
  }

  return await callOpenAIVision(baseUrl, apiKey, prompt, images, jsonMode, timeoutMs);
}

export async function transcribeImagesWithVision(
  images: ImageInput[],
  customPrompt?: string
): Promise<string> {
  if (images.length === 0) {
    return "";
  }

  let prompt = OCR_TRANSCRIPTION_PROMPT;
  if (customPrompt && customPrompt.trim().length > 0) {
    prompt += `\n\nSpecific instructions from user:\n${customPrompt.trim()}`;
  }

  return await completeVision(prompt, images, { jsonMode: false, timeoutMs: 90_000 });
}

export async function solveHomeworkFromImages(
  images: ImageInput[],
  customPrompt?: string
): Promise<DirectAnswerResponse> {
  let prompt = DIRECT_ANSWER_PROMPT;
  if (customPrompt && customPrompt.trim().length > 0) {
    prompt += `\n\nSpecific instructions from user:\n${customPrompt.trim()}`;
  }

  const raw = await completeVision(prompt, images, { jsonMode: true, timeoutMs: 110_000 });

  try {
    return extractJSON<DirectAnswerResponse>(raw, DirectAnswerResponseSchema);
  } catch {
    // Attempt fallback parsing if direct JSON parsing failed
    const fallback = extractJSON<Record<string, unknown>>(raw);
    const transcription =
      typeof fallback.transcription === "string" ? fallback.transcription : "";
    const directAnswers = Array.isArray(fallback.directAnswers)
      ? (fallback.directAnswers as DirectAnswerItem[])
      : [];
    return { transcription, directAnswers };
  }
}
