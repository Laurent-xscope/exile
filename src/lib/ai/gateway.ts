import { z } from "zod";

/** Pull a JSON object out of a model reply (tolerates code fences and trailing commas). */
export function extractJSON<T>(rawText: string, schema?: z.ZodType<T>): T {
  let cleaned = rawText.trim();

  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf("]");
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  const parsed = JSON.parse(cleaned);

  if (schema) {
    const validation = schema.safeParse(parsed);
    if (validation.success) {
      return validation.data;
    } else {
      throw new Error(`Schema validation error: ${JSON.stringify(validation.error.format())}`);
    }
  }

  return parsed as T;
}
