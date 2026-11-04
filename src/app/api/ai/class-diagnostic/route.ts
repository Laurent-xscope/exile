import { NextResponse } from "next/server";
import { z } from "zod";
import { callAI } from "@/lib/ai/gateway";
import {
  buildClassDiagnosticPrompt,
  ClassDiagnosticSchema,
} from "@/lib/ai/prompts";
import {
  ensureRoomLoaded,
  getRoomSubmissions,
  getRoomQuestions,
  isValidUuid,
} from "@/lib/rooms/store";
import { supabase } from "@/lib/supabase";

const SubmissionItemSchema = z.object({
  playerId: z.string().optional(),
  questionId: z.string().optional(),
  questionText: z.string().optional(),
  conceptTag: z.string().optional(),
  selectedOption: z.string().optional(),
  isCorrect: z.boolean(),
  scoreAwarded: z.number().optional(),
});

const ClassDiagnosticRequestSchema = z.object({
  roomId: z.string().optional(),
  roomCode: z.string().optional(),
  quizId: z.string().optional(),
  topic: z.string().optional().default("Asesmen Muatan Lokal Bali & Kurikulum Merdeka"),
  teacherNotes: z.string().optional(),
  submissions: z.array(SubmissionItemSchema).optional(),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = ClassDiagnosticRequestSchema.safeParse(rawBody);

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

    const targetRoom = parsed.data.roomCode || parsed.data.roomId;
    if (!targetRoom) {
      return NextResponse.json(
        { success: false, error: "roomCode atau roomId wajib disertakan." },
        { status: 400 }
      );
    }
    const { quizId, topic, submissions: customSubmissions } = parsed.data;

    // 1. Gather room, submissions, and questions from request body or room store
    const room = await ensureRoomLoaded(targetRoom);
    let submissions = customSubmissions;
    if (!submissions || submissions.length === 0) {
      const roomSubmissions = room ? room.submissions : await getRoomSubmissions(targetRoom);
      submissions = roomSubmissions.map((s) => ({
        playerId: s.playerId,
        questionId: s.questionId,
        selectedOption: s.selectedOption,
        isCorrect: s.isCorrect,
        scoreAwarded: s.scoreAwarded,
      }));
    }

    const roomQuestions = room ? room.questions : await getRoomQuestions(targetRoom);

    // 2. Synthesize aggregate question breakdown and error rates
    let totalQuestions = roomQuestions.length;
    if (totalQuestions === 0) totalQuestions = 5;

    const totalStudents = Math.max(
      room?.players.size || 0,
      new Set(submissions.map((s) => s.playerId).filter(Boolean)).size
    );

    const correctCount = submissions.filter((s) => s.isCorrect).length;
    const totalCount = submissions.length || 1;
    const computedMastery = Math.round((correctCount / totalCount) * 100);
    const averageScore = submissions.length > 0 ? computedMastery : 0;

    const questionBreakdown = roomQuestions.map((q) => {
      const qSubmissions = submissions.filter(
        (s) => s.questionId === q.id || s.questionText === q.question
      );
      const qWrong = qSubmissions.filter((s) => !s.isCorrect);
      const errorRate =
        qSubmissions.length > 0
          ? Math.round((qWrong.length / qSubmissions.length) * 100)
          : 0;

      const wrongOptionsCount: Record<string, number> = {};
      qWrong.forEach((w) => {
        if (w.selectedOption) {
          wrongOptionsCount[w.selectedOption] =
            (wrongOptionsCount[w.selectedOption] || 0) + 1;
        }
      });

      const mostCommonWrongOption =
        Object.entries(wrongOptionsCount).sort(
          ([, a], [, b]) => b - a
        )[0]?.[0] || "B";

      return {
        questionText: q.question,
        conceptTag: q.conceptTag,
        errorRate,
        mostCommonWrongOption,
      };
    });

    // 3. Build diagnostic prompt
    const { systemPrompt, prompt } = buildClassDiagnosticPrompt(topic, {
      totalStudents,
      averageScore,
      questionBreakdown,
    });

    // 4. Call Resilient AI Gateway
    const diagnostic = await callAI(prompt, ClassDiagnosticSchema, {
      systemPrompt,
      temperature: 0.6,
    });

    // 5. Persist to Supabase if configured and quizId is valid UUID
    try {
      const isPlaceholder =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

      const actualQuizId = quizId || room?.quizId;
      if (!isPlaceholder && isValidUuid(actualQuizId)) {
        await supabase.from("class_diagnostics").insert({
          room_code: targetRoom,
          quiz_id: actualQuizId,
          class_mastery_rate: diagnostic.classMasteryRate,
          summary_text: diagnostic.summaryText,
          cluster_analysis: diagnostic.clusterAnalysis,
          recommended_reteaching: diagnostic.recommendedReteaching,
          adaptive_remedial_questions: diagnostic.adaptiveRemedialQuestions,
        });
      }
    } catch (dbErr) {
      console.warn("[class-diagnostic] Supabase write skipped:", dbErr);
    }

    return NextResponse.json({
      success: true,
      diagnostic,
    });
  } catch (err: unknown) {
    console.error("[class-diagnostic error]", err);
    // Fallback safe return
    const { systemPrompt, prompt } = buildClassDiagnosticPrompt(
      "Asesmen Muatan Lokal Bali & Kurikulum Merdeka",
      {
        totalStudents: 20,
        averageScore: 70,
        questionBreakdown: [
          {
            questionText: "Kruna Alus Singgih vs Alus Sor",
            conceptTag: "Anggah-ungguhing Basa",
            errorRate: 40,
            mostCommonWrongOption: "B",
          },
        ],
      }
    );
    const fallbackDiag = await callAI(prompt, ClassDiagnosticSchema, {
      systemPrompt,
    });

    return NextResponse.json({
      success: true,
      diagnostic: fallbackDiag,
      fallbackActivated: true,
    });
  }
}
