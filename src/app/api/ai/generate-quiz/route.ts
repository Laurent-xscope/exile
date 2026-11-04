import { NextResponse } from "next/server";
import { z } from "zod";
import { callAI } from "@/lib/ai/gateway";
import { buildQuizGenerationPrompt, QuizSchema } from "@/lib/ai/prompts";
import { storeQuiz } from "@/lib/rooms/store";

const GenerateQuizRequestSchema = z.object({
  topic: z.string().min(2, "Topic must be at least 2 characters"),
  grade: z.string().optional().default("Fase D (SMP Kelas 7-9)"),
  category: z.string().optional().default("Muatan Lokal Bali"),
  questionCount: z.coerce.number().int().min(1).max(10).optional().default(5),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = GenerateQuizRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { topic, grade, category, questionCount } = parsed.data;

    const { systemPrompt, prompt } = buildQuizGenerationPrompt(
      topic,
      grade,
      category,
      questionCount
    );

    const quiz = await callAI(prompt, QuizSchema, {
      systemPrompt,
      temperature: 0.7,
    });

    const stored = await storeQuiz({
      id: crypto.randomUUID(),
      title: quiz.title,
      description: quiz.description,
      targetGrade: grade,
      category,
      culturalTheme: quiz.culturalTheme,
      questions: quiz.questions,
    });

    return NextResponse.json({
      success: true,
      quizId: stored.id,
      quiz: {
        ...quiz,
        questions: stored.questions,
      },
    });
  } catch (err: unknown) {
    console.error("[generate-quiz error]", err);
    // As mandated: resilient behavior, return graceful fallback
    const { systemPrompt, prompt } = buildQuizGenerationPrompt(
      "Asesmen Muatan Lokal Bali: Basa Alus & Aksara",
      "Fase D (SMP Kelas 7-9)",
      "Muatan Lokal Bali",
      5
    );
    const fallbackQuiz = await callAI(prompt, QuizSchema, { systemPrompt });

    const stored = await storeQuiz({
      id: crypto.randomUUID(),
      title: fallbackQuiz.title,
      description: fallbackQuiz.description,
      targetGrade: "Fase D (SMP Kelas 7-9)",
      category: "Muatan Lokal Bali",
      culturalTheme: fallbackQuiz.culturalTheme,
      questions: fallbackQuiz.questions,
    });

    return NextResponse.json({
      success: true,
      quizId: stored.id,
      quiz: {
        ...fallbackQuiz,
        questions: stored.questions,
      },
      fallbackActivated: true,
    });
  }
}
