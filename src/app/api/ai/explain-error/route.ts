import { NextResponse } from "next/server";
import { z } from "zod";
import { chatText, AIUnavailableError } from "@/lib/ai/llm";
import { checkRateLimit } from "@/lib/security/rate-limiter";

const BodySchema = z.object({
  question: z.string().min(3),
  selectedOption: z.string().min(1),
  correctOption: z.string().min(1),
  options: z.array(z.object({ label: z.string(), text: z.string() })).optional(),
  conceptTag: z.string().optional(),
});

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 20, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Format permintaan tidak valid" }, { status: 400 });
  }
  const { question, selectedOption, correctOption, options, conceptTag } = parsed.data;

  const optionText = (label: string) => options?.find((o) => o.label === label)?.text ?? label;

  try {
    const feedback = await chatText(
      [
        {
          role: "system",
          content:
            "Kamu menjelaskan kepada siswa kenapa jawabannya salah. Tulis maksimal dua kalimat bahasa Indonesia yang santai dan jelas: apa yang keliru dari pilihannya, lalu apa yang benar. Jangan membuka dengan pujian atau kata 'Tentu'. Jangan memakai kata 'miskonsepsi'.",
        },
        {
          role: "user",
          content: `Soal: ${question}\n${conceptTag ? `Topik: ${conceptTag}\n` : ""}Jawaban siswa: ${selectedOption}. ${optionText(selectedOption)}\nJawaban benar: ${correctOption}. ${optionText(correctOption)}`,
        },
      ],
      { temperature: 0.3, timeoutMs: 20_000 }
    );
    return NextResponse.json({ success: true, feedback });
  } catch (err) {
    const status = err instanceof AIUnavailableError ? 502 : 500;
    return NextResponse.json({ error: "Penjelasan tidak tersedia." }, { status });
  }
}
