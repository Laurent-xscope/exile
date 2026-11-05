/**
 * Wayground answer evaluation for all question types
 * (03_quiz_engine_and_scoring.md `XD`, reference_impl/quiz_evaluator.js).
 */
export type WaygroundQuestionType =
  | "MCQ"
  | "MSQ"
  | "BLANK"
  | "REORDER"
  | "MATCH"
  | "EQUATION"
  | "FLASHCARD";

export interface WaygroundQuestion {
  type: WaygroundQuestionType | string;
  answer?: unknown;
  options?: Array<{ text?: string; math?: { latex?: string[] } }>;
}

/** stripHtml: <br>/<p> become spaces, &nbsp; whitespace, tags removed, whitespace collapsed. */
export function stripHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/<\s*(br|p)\b[^>]*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^\s][^>]+>/g, "")
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

/** normalize: strip HTML, fold case, drop punctuation, collapse whitespace. */
export function normalizeText(input: unknown): string {
  return stripHtml(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function sortedEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  const sa = a.map(String).sort();
  const sb = b.map(String).sort();
  return sa.every((v, i) => v === sb[i]);
}

export function evaluateResponse(question: WaygroundQuestion, userResponse: unknown): boolean {
  switch (question.type) {
    case "BLANK": {
      const input = normalizeText(userResponse);
      if (!input) return false;
      return (question.options ?? []).some((o) => normalizeText(o.text) === input);
    }
    case "REORDER": {
      if (!Array.isArray(userResponse) || !Array.isArray(question.answer)) return false;
      return (
        userResponse.length === question.answer.length &&
        userResponse.every((item, i) => String(item) === String((question.answer as unknown[])[i]))
      );
    }
    case "MATCH": {
      if (!userResponse || typeof userResponse !== "object") return false;
      const expected = (question.answer ?? {}) as Record<string, unknown>;
      const given = userResponse as Record<string, unknown>;
      return Object.entries(expected).every(([k, v]) => String(given[k]) === String(v));
    }
    case "EQUATION": {
      const strip = (v: unknown) => String(v ?? "").replace(/\s+/g, "");
      const expected = strip(question.options?.[0]?.math?.latex?.[0]);
      return expected !== "" && strip(userResponse) === expected;
    }
    case "FLASHCARD":
      return Number(userResponse) === Number(question.answer);
    case "MCQ":
    case "MSQ":
    default:
      if (userResponse === undefined || userResponse === null || question.answer === undefined) {
        return false;
      }
      return sortedEqual(asArray(userResponse), asArray(question.answer));
  }
}
