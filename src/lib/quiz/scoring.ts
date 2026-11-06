import type { Question } from "@/lib/ai/prompts";

/**
 * Wayground-compatible scoring.
 *
 * Base 600 points for a correct response, up to 400 speed points for the
 * remaining fraction of the question timer, and the reference streak tiers
 * (100 / 200 / 300 / 400 from the second consecutive correct answer).
 */
export const BASE_SCORE = 600;
export const MAX_TIMER_BONUS = 400;

export interface ScoreBreakdown {
  base: number;
  timer: number;
  streak: number;
}

export interface ScoreResult {
  total: number;
  newStreak: number;
  scoreBreakup: ScoreBreakdown;
}

export function calculateResponseScore({
  isCorrect,
  timeTakenMs,
  totalTimeMs,
  currentStreak,
  streakBonusEnabled = true,
}: {
  isCorrect: boolean;
  timeTakenMs: number;
  totalTimeMs: number;
  /** Consecutive correct answers before this question. */
  currentStreak: number;
  streakBonusEnabled?: boolean;
}): ScoreResult {
  if (!isCorrect) {
    return {
      total: 0,
      newStreak: 0,
      scoreBreakup: { base: 0, timer: 0, streak: 0 },
    };
  }

  const safeTotalTime = Number.isFinite(totalTimeMs) && totalTimeMs > 0 ? totalTimeMs : 20000;
  const safeTimeTaken = Number.isFinite(timeTakenMs) ? Math.max(0, timeTakenMs) : safeTotalTime;
  const limit = Math.max(1, safeTotalTime);
  const remainingRatio = Math.max(0, Math.min(1, (limit - safeTimeTaken) / limit));
  const timer = Math.round(remainingRatio * MAX_TIMER_BONUS);
  const newStreak = (Number.isFinite(currentStreak) ? Math.max(0, currentStreak) : 0) + 1;

  let streak = 0;
  if (streakBonusEnabled) {
    if (newStreak === 2) streak = 100;
    else if (newStreak === 3) streak = 200;
    else if (newStreak === 4) streak = 300;
    else if (newStreak >= 5) streak = 400;
  }

  return {
    total: Math.ceil(BASE_SCORE + timer + streak),
    newStreak,
    scoreBreakup: { base: BASE_SCORE, timer, streak },
  };
}

/**
 * Reconstructs the base/speed/streak split from a stored submission. Older
 * rows predate explicit component columns, but the scoring formula is
 * deterministic, so the host leaderboard can still show a truthful breakdown.
 */
export function deriveScoreBreakdown({
  isCorrect,
  scoreAwarded,
  timeTakenMs,
  totalTimeMs,
}: {
  isCorrect: boolean;
  scoreAwarded: number;
  timeTakenMs: number;
  totalTimeMs: number;
}): ScoreBreakdown {
  if (!isCorrect || scoreAwarded <= 0) {
    return { base: 0, timer: 0, streak: 0 };
  }

  const safeTotalTime = Number.isFinite(totalTimeMs) && totalTimeMs > 0 ? totalTimeMs : 20000;
  const safeTimeTaken = Number.isFinite(timeTakenMs) ? Math.max(0, timeTakenMs) : safeTotalTime;
  const limit = Math.max(1, safeTotalTime);
  const remainingRatio = Math.max(0, Math.min(1, (limit - safeTimeTaken) / limit));
  const base = Math.min(BASE_SCORE, scoreAwarded);
  const timer = Math.min(
    Math.round(remainingRatio * MAX_TIMER_BONUS),
    Math.max(0, scoreAwarded - base)
  );

  return {
    base,
    timer,
    streak: Math.max(0, scoreAwarded - base - timer),
  };
}

/**
 * MCQ evaluator equivalent to the reference's direct single-choice check.
 * `correctAnswer` is authoritative; the option flag is a fallback for older
 * persisted questions that predate the field.
 */
export function evaluateQuizResponse(
  question: Pick<Question, "correctAnswer" | "options">,
  selectedLabel: string | null | undefined
): boolean {
  const selected = String(selectedLabel ?? "").trim().toUpperCase();
  const expected = String(
    question.correctAnswer ||
      (Array.isArray(question.options) ? question.options.find((option) => option.isCorrect)?.label : "") ||
      ""
  )
    .trim()
    .toUpperCase();

  return Boolean(selected && expected && selected === expected);
}
