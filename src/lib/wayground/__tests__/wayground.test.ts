import { describe, expect, test } from "bun:test";
import { decryptOData, encryptOData } from "@/lib/wayground/odata-cipher";
import { evaluateResponse, normalizeText } from "@/lib/wayground/evaluator";
import { calculateScoreWithPowerups } from "@/lib/wayground/score-powerups";
import {
  assessCard,
  confidenceLevel,
  createFlashcardSession,
  flipCard,
  isSessionComplete,
  sessionConfidence,
} from "@/lib/wayground/flashcards";

describe("odata cipher", () => {
  test("round-trips unicode JSON", () => {
    const json = JSON.stringify({ score: 1250, nama: "Aksara Bali ᬩᬮᬶ", ok: true });
    expect(decryptOData(encryptOData(json))).toBe(json);
  });
});

describe("evaluator", () => {
  test("MCQ / MSQ ignore order", () => {
    expect(evaluateResponse({ type: "MCQ", answer: 2 }, 2)).toBe(true);
    expect(evaluateResponse({ type: "MCQ", answer: 2 }, 1)).toBe(false);
    expect(evaluateResponse({ type: "MSQ", answer: [0, 2] }, [2, 0])).toBe(true);
    expect(evaluateResponse({ type: "MSQ", answer: [0, 2] }, [0])).toBe(false);
  });

  test("BLANK normalizes html, case and punctuation", () => {
    const q = { type: "BLANK", options: [{ text: "<p>Photo&nbsp;synthesis!</p>" }] };
    expect(normalizeText("<p>Photo&nbsp;synthesis!</p>")).toBe("photo synthesis");
    expect(evaluateResponse(q, "  PHOTO synthesis ")).toBe(true);
    expect(evaluateResponse(q, "")).toBe(false);
  });

  test("REORDER and MATCH", () => {
    expect(evaluateResponse({ type: "REORDER", answer: [1, 2, 3] }, [1, 2, 3])).toBe(true);
    expect(evaluateResponse({ type: "REORDER", answer: [1, 2, 3] }, [1, 3, 2])).toBe(false);
    expect(evaluateResponse({ type: "MATCH", answer: { a: "1" } }, { a: 1 })).toBe(true);
  });
});

describe("powerup scoring", () => {
  const base = { timeTakenMs: 0, totalTimeMs: 20000, currentStreak: 0 };

  test("plain correct = 600 + 400", () => {
    expect(calculateScoreWithPowerups({ ...base, isCorrect: true }).total).toBe(1000);
  });

  test("double jeopardy doubles correct and penalises wrong", () => {
    const dj = [{ id: "double_jeopardy" as const }];
    expect(calculateScoreWithPowerups({ ...base, isCorrect: true, powerups: dj }).total).toBe(2000);
    expect(calculateScoreWithPowerups({ ...base, isCorrect: false, powerups: dj }).total).toBe(-1000);
  });

  test("time freeze pins timer, immunity keeps streak", () => {
    const slow = { ...base, timeTakenMs: 20000, isCorrect: true };
    expect(calculateScoreWithPowerups({ ...slow, powerups: [{ id: "time_freeze" }] }).total).toBe(1000);
    const r = calculateScoreWithPowerups({
      ...base,
      currentStreak: 3,
      isCorrect: false,
      powerups: [{ id: "immunity" }],
    });
    expect(r.newStreak).toBe(3);
    expect(r.total).toBe(0);
  });
});

describe("flashcards", () => {
  test("confidence rounding", () => {
    expect(confidenceLevel(0, 0)).toBe(0);
    expect(confidenceLevel(1, 3)).toBe(33);
  });

  test("unmastered cards are replayed until mastered", () => {
    let s = createFlashcardSession(["a", "b"]);
    expect(flipCard(s).side).toBe("back");
    s = assessCard(s, false); // a -> retry
    s = assessCard(s, true); // b mastered, deck empty -> replay a
    expect(s.current).toBe("a");
    expect(s.reviewing).toBe(true);
    expect(sessionConfidence(s)).toBe(50);
    s = assessCard(s, true);
    expect(isSessionComplete(s)).toBe(true);
    expect(sessionConfidence(s)).toBe(100);
  });
});
