/**
 * Wayground flashcard study algorithm (04_flashcard_algorithm.md):
 * flip front/back, self-assess "Got it" vs "Need review", re-queue unmastered
 * cards until the deck is mastered, and report a rounded confidence percent.
 */
import type { WaygroundQuestion } from "@/lib/wayground/evaluator";

export const FLASHCARD_MODE_OPTIONS = {
  memes: false,
  jumble: false,
  jumbleAnswers: false,
  redemption: "NO",
  studentLeaderboard: "NO",
  powerups: "NO",
  timer: "OFF",
} as const;

export type FlashcardMode = "study" | "practice" | "async";
export type FlashcardSide = "front" | "back";

/** Confidence = round(known / total * 100); 0 for an empty deck. */
export function confidenceLevel(known: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((Math.max(0, known) / total) * 100);
}

/** Back-of-card answers for any question type (`extractFlashcardAnswer`). */
export function extractFlashcardAnswer(
  question: WaygroundQuestion | null | undefined
): Array<{ index: number; option: unknown }> {
  const options = question?.options ?? [];
  if (!question) return [{ index: 0, option: undefined }];
  switch (question.type) {
    case "MSQ":
      return (Array.isArray(question.answer) ? question.answer : []).map((idx: number) => ({
        index: idx,
        option: options[idx],
      }));
    case "BLANK":
      return [{ index: 0, option: options[0] }];
    case "EQUATION":
      return [{ index: 0, option: { type: "latex", latex: options[0]?.math?.latex?.[0] } }];
    default: {
      const idx = Number(question.answer ?? 0);
      return [{ index: idx, option: options[idx] }];
    }
  }
}

export interface FlashcardSession<T> {
  deck: T[];
  retryQueue: T[];
  mastered: number;
  side: FlashcardSide;
  current: T | null;
  total: number;
  /** True while the session is replaying previously unmastered cards. */
  reviewing: boolean;
}

export function createFlashcardSession<T>(deck: T[]): FlashcardSession<T> {
  return {
    deck: deck.slice(1),
    retryQueue: [],
    mastered: 0,
    side: "front",
    current: deck[0] ?? null,
    total: deck.length,
    reviewing: false,
  };
}

export function flipCard<T>(s: FlashcardSession<T>): FlashcardSession<T> {
  return { ...s, side: s.side === "front" ? "back" : "front" };
}

/** Records a self-assessment for the current card and advances the session. */
export function assessCard<T>(s: FlashcardSession<T>, knewIt: boolean): FlashcardSession<T> {
  if (s.current === null) return s;

  const retryQueue = knewIt ? s.retryQueue : [...s.retryQueue, s.current];
  const mastered = s.mastered + (knewIt ? 1 : 0);

  let deck = s.deck;
  let queue = retryQueue;
  let reviewing = s.reviewing;
  if (deck.length === 0 && queue.length > 0) {
    deck = queue;
    queue = [];
    reviewing = true;
  }

  const [next, ...rest] = deck;
  return {
    ...s,
    deck: rest,
    retryQueue: queue,
    mastered,
    side: "front",
    current: next ?? null,
    reviewing,
  };
}

export function isSessionComplete<T>(s: FlashcardSession<T>): boolean {
  return s.current === null;
}

export function sessionConfidence<T>(s: FlashcardSession<T>): number {
  return confidenceLevel(s.mastered, s.total);
}
