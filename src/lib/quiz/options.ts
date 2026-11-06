import type { Question } from "@/types/assessment";

export type QuizDifficultyLevel = "mudah" | "sedang" | "sulit" | "campuran";

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

export function shuffleQuestionOptions(q: Question): Question {
  const rawOptions = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
  if (rawOptions.length === 0) return q;

  const declaredCorrect = (q.correctAnswer || "").trim().toUpperCase();
  let foundCorrectIdx = rawOptions.findIndex((opt) => opt.isCorrect === true);
  if (foundCorrectIdx === -1 && declaredCorrect) {
    foundCorrectIdx = rawOptions.findIndex(
      (opt) => (opt.label || "").trim().toUpperCase() === declaredCorrect
    );
  }
  if (foundCorrectIdx === -1) {
    foundCorrectIdx = 0;
  }

  const options = rawOptions.map((opt, idx) => ({
    ...opt,
    isCorrect: idx === foundCorrectIdx,
  }));

  for (let i = options.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }

  const labels: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  let newCorrectAnswer: "A" | "B" | "C" | "D" = "A";
  const updatedOptions = options.map((opt, idx) => {
    const label = labels[idx] || "A";
    if (opt.isCorrect) {
      newCorrectAnswer = label;
    }
    return {
      ...opt,
      label,
    };
  });

  return {
    ...q,
    options: updatedOptions,
    correctAnswer: newCorrectAnswer,
  };
}
