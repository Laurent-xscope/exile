import { QuestionSchema, type Question } from "@/types/assessment";
import type { StudioAction } from "./agent";

export const QUIZ_FALLBACK_NOTIFICATION =
  "Kuis latihan telah dibuat dan dimasukkan langsung ke tab Kuis adaptif di Studio. Anda dapat melihat, menguji, dan mengedit soal di tab Kuis.";

/**
 * Detects whether the text contains numbered multiple choice questions.
 * E.g. "1. Question text\na. Option text" or "1) Question\nA. Option"
 */
export function detectMcqInText(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const pattern = /(?:^|\n)\s*(?:\*\*)?\d+[\.\)]\s*.+\n\s*(?:[-*]\s*)?[a-dA-D][\.\)]\s+/i;
  return pattern.test(text);
}

/**
 * Parses answer keys if provided at the bottom of the text.
 * E.g. "Kunci jawaban:\n1. A\n2. B" or "Kunci:\n1: C"
 */
export function parseAnswerKeys(text: string): Map<number, "A" | "B" | "C" | "D"> {
  const keys = new Map<number, "A" | "B" | "C" | "D">();
  const keySectionMatch = text.match(/(?:kunci\s*(?:jawaban)?|kunci|jawaban)\s*:\s*([\s\S]*)$/i);
  if (!keySectionMatch) return keys;

  const keyText = keySectionMatch[1];
  const itemRegex = /(?:^|\s)(?:soal\s*)?(\d+)[\.\:\-\s\)]+([a-dA-D])(?:\b|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(keyText)) !== null) {
    const qNum = parseInt(match[1], 10);
    const letter = match[2].toUpperCase() as "A" | "B" | "C" | "D";
    keys.set(qNum, letter);
  }
  return keys;
}

/**
 * Extracts structured Question objects adhering to QuestionSchema from raw text.
 */
export function extractQuizQuestionsFromText(text: string): Question[] {
  if (!text || typeof text !== "string") return [];

  const answerKeys = parseAnswerKeys(text);

  // Separate question body from answer key section
  const keyIndex = text.search(/(?:\n\s*(?:kunci\s*(?:jawaban)?|kunci|jawaban)\s*:)/i);
  const questionsBody = keyIndex !== -1 ? text.slice(0, keyIndex) : text;

  // Split into candidate blocks starting with a question number
  const rawBlocks = questionsBody.split(/(?:^|\n)(?=\s*(?:\*\*)?\d+[\.\)]\s+)/);
  const parsedQuestions: Question[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^\s*(?:\*\*)?(\d+)[\.\)]\s*(?:\*\*)?\s*([\s\S]+)/);
    if (!headerMatch) continue;

    const qNum = parseInt(headerMatch[1], 10);
    const content = headerMatch[2];

    const optStartMatch = content.match(/(?:^|\n)\s*(?:[-*]\s*)?([a-dA-D])[\.\)]\s+/i);
    if (!optStartMatch || optStartMatch.index === undefined) continue;

    let stem = content.slice(0, optStartMatch.index).trim();
    stem = stem.replace(/^\*+|\*+$/g, "").trim();

    if (stem.length < 5) {
      stem = `Soal ${qNum}: ${stem || "Pilihlah jawaban yang paling tepat."}`;
    }

    const optionsContent = content.slice(optStartMatch.index);
    const optionMatches = [
      ...optionsContent.matchAll(/(?:^|\n)\s*(?:[-*]\s*)?([a-dA-D])[\.\)]\s*([^\n]+)/gi),
    ];

    if (optionMatches.length < 2) continue;

    const optionMap = new Map<"A" | "B" | "C" | "D", { text: string; isMarkedCorrect: boolean }>();
    let inlineCorrectLabel: "A" | "B" | "C" | "D" | undefined;

    for (const optMatch of optionMatches) {
      const label = optMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
      let optText = optMatch[2].trim();

      const isMarked =
        /\b(?:kunci|benar|jawaban benar|correct)\b/i.test(optText) ||
        /\(kunci\)/i.test(optText) ||
        /\[x\]/i.test(optText);

      if (isMarked) {
        inlineCorrectLabel = label;
      }

      optText = optText
        .replace(/\s*\((?:kunci(?: jawaban)?|benar|jawaban benar|correct)\)/gi, "")
        .replace(/\s*\[x\]/gi, "")
        .replace(/^\*+|\*+$/g, "")
        .trim();

      if (optText.length > 0) {
        optionMap.set(label, { text: optText, isMarkedCorrect: isMarked });
      }
    }

    const determinedCorrect: "A" | "B" | "C" | "D" =
      answerKeys.get(qNum) || inlineCorrectLabel || "A";

    const requiredLabels: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
    const finalOptions = requiredLabels.map((lbl) => {
      const existing = optionMap.get(lbl);
      const textVal = existing?.text || `Pilihan ${lbl}`;
      return {
        label: lbl,
        text: textVal,
        isCorrect: lbl === determinedCorrect,
      };
    });

    const expMatch = block.match(/(?:penjelasan|pembahasan|alasan)\s*:\s*([^\n]+)/i);
    const correctOptText = finalOptions.find((o) => o.label === determinedCorrect)?.text || "";
    const explanation = expMatch
      ? expMatch[1].trim()
      : `Pilihan ${determinedCorrect} adalah jawaban yang benar (${correctOptText}).`;

    const candidate: Question = {
      id: `fallback-q-${qNum}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      questionOrder: qNum,
      question: stem,
      options: finalOptions,
      correctAnswer: determinedCorrect,
      explanation: explanation.length >= 3 ? explanation : `Penjelasan untuk pilihan ${determinedCorrect}.`,
      conceptTag: "Konsep materi",
    };

    const parsed = QuestionSchema.safeParse(candidate);
    if (parsed.success) {
      parsedQuestions.push(parsed.data);
    }
  }

  return parsedQuestions;
}

/**
 * Checks for raw MCQ dumps in the reply. If found, extracts questions, pushes a StudioAction,
 * and replaces the chat reply with the concise studio notification.
 */
export function applyStudioFallback(
  reply: string,
  existingActions: StudioAction[] = [],
  documentTitle?: string
): { reply: string; studioActions: StudioAction[]; triggered: boolean } {
  const actions = [...existingActions];

  if (!detectMcqInText(reply)) {
    return { reply, studioActions: actions, triggered: false };
  }

  const extractedQuestions = extractQuizQuestionsFromText(reply);
  if (extractedQuestions.length === 0) {
    return { reply, studioActions: actions, triggered: false };
  }

  const existingQuizAction = actions.find(
    (a) => a.type === "create_artifact" && a.artifactType === "quiz"
  );

  if (existingQuizAction) {
    existingQuizAction.questions = extractedQuestions;
    existingQuizAction.count = extractedQuestions.length;
  } else {
    actions.push({
      type: "create_artifact",
      artifactType: "quiz",
      topic: documentTitle || "Kuis latihan",
      count: extractedQuestions.length,
      difficulty: "Sedang",
      questions: extractedQuestions,
    });
  }

  return {
    reply: QUIZ_FALLBACK_NOTIFICATION,
    studioActions: actions,
    triggered: true,
  };
}
