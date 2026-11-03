import { NextResponse } from "next/server";
import { z } from "zod";
import { callAI } from "@/lib/ai/gateway";
import {
  buildMicroExplanationPrompt,
  MicroExplanationSchema,
} from "@/lib/ai/prompts";

const ExplainErrorRequestSchema = z.object({
  question: z.string().min(3, "Question text is required"),
  selectedOption: z.string().min(1, "Selected option is required"),
  correctOption: z.string().min(1, "Correct option is required"),
  options: z
    .array(
      z.object({
        label: z.string(),
        text: z.string(),
      })
    )
    .optional(),
  conceptTag: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = ExplainErrorRequestSchema.safeParse(rawBody);

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

    const { question, selectedOption, correctOption, options, conceptTag } =
      parsed.data;

    const { systemPrompt, prompt } = buildMicroExplanationPrompt(
      question,
      selectedOption,
      correctOption,
      options,
      conceptTag
    );

    const result = await callAI(prompt, MicroExplanationSchema, {
      systemPrompt,
      temperature: 0.5,
    });

    return NextResponse.json({
      success: true,
      feedback: result.feedback,
      misconceptionIdentified: result.misconceptionIdentified,
      quickTip: result.quickTip,
    });
  } catch (err: unknown) {
    console.error("[explain-error error]", err);
    return NextResponse.json({
      success: true,
      feedback:
        "Jawabanmu hampir tepat! Ingat bahwa kata untuk memuliakan orang lain (Alus Singgih) tidak boleh dipakai untuk diri sendiri.",
      misconceptionIdentified:
        "Tertukar antara Alus Singgih dan Alus Sor",
      quickTip:
        "Ingat: 'Singgih' = meninggikan guru/orang tua, 'Sor' = merendahkan diri sendiri (titiang nunas/matur)!",
      fallbackActivated: true,
    });
  }
}
