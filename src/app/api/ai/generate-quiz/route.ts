import { NextResponse } from "next/server";
import { z } from "zod";
import { generateQuizFromText } from "@/lib/ai/quiz-gen";
import { AIUnavailableError } from "@/lib/ai/llm";
import { storeQuiz } from "@/lib/rooms/store";
import { checkRateLimit } from "@/lib/security/rate-limiter";

const BodySchema = z.object({
  topic: z.string().min(2),
  grade: z.string().optional(),
  contextText: z.string().optional(),
  questionCount: z.coerce.number().int().min(1).max(20).optional().default(5),
});

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 10, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  const { topic, grade, contextText, questionCount } = parsed.data;

  try {
    const sourcePrompt = contextText && contextText.trim().length > 20
      ? `Topik fokus: ${topic}${grade ? `\nTingkat: ${grade}` : ""}\n\nBahan rujukan:\n${contextText.trim().slice(0, 12000)}`
      : `Topik: ${topic}${grade ? `\nTingkat: ${grade}` : ""}\nSusun soal pilihan ganda yang akurat dan relevan tentang topik ini.`;

    const quiz = await generateQuizFromText({
      text: sourcePrompt,
      questionCount,
    });
    const stored = await storeQuiz({
      id: crypto.randomUUID(),
      title: quiz.title,
      description: "",
      targetGrade: grade,
      questions: quiz.questions,
    });
    return NextResponse.json({
      success: true,
      quizId: stored.id,
      quiz: { title: quiz.title, questions: stored.questions },
    });
  } catch (err) {
    const status = err instanceof AIUnavailableError ? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat kuis." },
      { status }
    );
  }
}
