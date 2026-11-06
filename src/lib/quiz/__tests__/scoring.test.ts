import { describe, expect, test } from "bun:test";
import {
  BASE_SCORE,
  calculateResponseScore,
  evaluateQuizResponse,
} from "@/lib/quiz/scoring";
import type { Question } from "@/types/assessment";

describe("Wayground-compatible scoring", () => {
  test("awards base plus remaining-time bonus", () => {
    const result = calculateResponseScore({
      isCorrect: true,
      timeTakenMs: 2500,
      totalTimeMs: 30000,
      currentStreak: 0,
    });

    expect(result.scoreBreakup.base).toBe(BASE_SCORE);
    expect(result.scoreBreakup.timer).toBe(367);
    expect(result.scoreBreakup.streak).toBe(0);
    expect(result.total).toBe(967);
    expect(result.newStreak).toBe(1);
  });

  test("uses the reference streak tiers", () => {
    const result = calculateResponseScore({
      isCorrect: true,
      timeTakenMs: 2500,
      totalTimeMs: 30000,
      currentStreak: 2,
    });

    expect(result.scoreBreakup.streak).toBe(200);
    expect(result.total).toBe(1167);
    expect(result.newStreak).toBe(3);
  });

  test("caps the speed bonus and streak bonus", () => {
    const result = calculateResponseScore({
      isCorrect: true,
      timeTakenMs: 0,
      totalTimeMs: 30000,
      currentStreak: 4,
    });

    expect(result.scoreBreakup.timer).toBe(400);
    expect(result.scoreBreakup.streak).toBe(400);
    expect(result.total).toBe(1400);
    expect(result.newStreak).toBe(5);
  });

  test("resets the streak and scores zero on an incorrect answer", () => {
    const result = calculateResponseScore({
      isCorrect: false,
      timeTakenMs: 1000,
      totalTimeMs: 30000,
      currentStreak: 6,
    });

    expect(result.total).toBe(0);
    expect(result.newStreak).toBe(0);
    expect(result.scoreBreakup).toEqual({ base: 0, timer: 0, streak: 0 });
  });

  test("honours the room streak setting", () => {
    const result = calculateResponseScore({
      isCorrect: true,
      timeTakenMs: 0,
      totalTimeMs: 30000,
      currentStreak: 4,
      streakBonusEnabled: false,
    });

    expect(result.scoreBreakup.streak).toBe(0);
    expect(result.total).toBe(1000);
  });
});

describe("MCQ evaluation", () => {
  const question = {
    correctAnswer: "C",
    options: [
      { label: "A", text: "A", isCorrect: false, distractorRationale: "a" },
      { label: "B", text: "B", isCorrect: false, distractorRationale: "b" },
      { label: "C", text: "C", isCorrect: true, distractorRationale: "c" },
      { label: "D", text: "D", isCorrect: false, distractorRationale: "d" },
    ],
  } satisfies Pick<Question, "correctAnswer" | "options">;

  test("accepts the key regardless of case or whitespace", () => {
    expect(evaluateQuizResponse(question, " c ")).toBe(true);
  });

  test("rejects a distractor and a missing answer", () => {
    expect(evaluateQuizResponse(question, "B")).toBe(false);
    expect(evaluateQuizResponse(question, null)).toBe(false);
  });
});
