import {
  BASE_SCORE,
  MAX_TIMER_BONUS,
  calculateResponseScore,
} from "@/lib/quiz/scoring";

export { BASE_SCORE, MAX_TIMER_BONUS };

export type PowerupId = "double_jeopardy" | "time_freeze" | "streak_booster" | "immunity";

export interface PowerupEffect {
  id: PowerupId;
  /** Flat bonus for custom/generic powerups. */
  bonus?: number;
}

export interface PowerupScoreResult {
  total: number;
  newStreak: number;
  immunityConsumed: boolean;
  scoreBreakup: {
    base: number;
    timer: number;
    streak: number;
    powerups: { id: PowerupId; score: number }[];
  };
}

function streakTier(streak: number): number {
  if (streak === 2) return 100;
  if (streak === 3) return 200;
  if (streak === 4) return 300;
  return streak >= 5 ? 400 : 0;
}

/**
 * Full Wayground score including powerups (03_quiz_engine_and_scoring.md):
 * - Double Jeopardy: doubles a correct score, -1000 if wrong.
 * - Time Freeze: timer bonus pinned to the maximum.
 * - Streak Booster: grants the next streak tier immediately.
 * - Immunity: a wrong answer keeps the streak (no points).
 */
export function calculateScoreWithPowerups({
  isCorrect,
  timeTakenMs,
  totalTimeMs,
  currentStreak,
  powerups = [],
}: {
  isCorrect: boolean;
  timeTakenMs: number;
  totalTimeMs: number;
  currentStreak: number;
  powerups?: PowerupEffect[];
}): PowerupScoreResult {
  const has = (id: PowerupId) => powerups.some((p) => p.id === id);

  if (!isCorrect) {
    const immune = has("immunity");
    const penalty = has("double_jeopardy") ? -1000 : 0;
    return {
      total: penalty,
      newStreak: immune ? Math.max(0, currentStreak) : 0,
      immunityConsumed: immune,
      scoreBreakup: {
        base: 0,
        timer: 0,
        streak: 0,
        powerups: penalty ? [{ id: "double_jeopardy", score: penalty }] : [],
      },
    };
  }

  const plain = calculateResponseScore({
    isCorrect: true,
    timeTakenMs,
    totalTimeMs,
    currentStreak,
  });

  const base = plain.scoreBreakup.base;
  const timer = has("time_freeze") ? MAX_TIMER_BONUS : plain.scoreBreakup.timer;
  const streak = plain.scoreBreakup.streak;

  const items: { id: PowerupId; score: number }[] = [];
  let extra = 0;

  if (has("time_freeze")) {
    items.push({ id: "time_freeze", score: timer - plain.scoreBreakup.timer });
  }
  if (has("streak_booster")) {
    const boost = Math.max(0, streakTier(plain.newStreak + 1) - streak);
    items.push({ id: "streak_booster", score: boost });
    extra += boost;
  }
  for (const p of powerups) {
    if (p.id !== "double_jeopardy" && p.id !== "time_freeze" && p.id !== "streak_booster" && p.bonus) {
      items.push({ id: p.id, score: p.bonus });
      extra += p.bonus;
    }
  }
  if (has("double_jeopardy")) {
    const doubled = base + timer + streak + extra;
    items.push({ id: "double_jeopardy", score: doubled });
    extra += doubled;
  }

  return {
    total: Math.ceil(base + timer + streak + extra),
    newStreak: plain.newStreak,
    immunityConsumed: false,
    scoreBreakup: { base, timer, streak, powerups: items },
  };
}
