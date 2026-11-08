import { NextResponse } from "next/server";
import { z } from "zod";
import { runExileAgent } from "@/lib/ai/agent";
import { applyStudioFallback } from "@/lib/ai/studio-fallback";
import { AIUnavailableError } from "@/lib/ai/llm";
import { checkRateLimit } from "@/lib/security/rate-limiter";

export const maxDuration = 120;

const BodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }))
    .min(1),
  documentContext: z.string().optional(),
  documentTitle: z.string().optional(),
  currentTab: z.string().optional(),
  image: z.object({ base64: z.string(), mimeType: z.string() }).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        mimeType: z.string().optional(),
        base64: z.string(),
      })
    )
    .max(4)
    .optional(),
});

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 20, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Format pesan tidak valid" }, { status: 400 });
  }
  const { messages, documentContext, documentTitle, currentTab, attachments, image } = parsed.data;

  const documents =
    documentContext && documentContext.trim().length > 15
      ? [{ name: documentTitle?.trim() || "materi.txt", text: documentContext }]
      : [];

  try {
    const result = await runExileAgent({
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      documents,
      attachments: attachments?.map((a) => ({ name: a.name, mimeType: a.mimeType, base64: a.base64 })),
      context: currentTab ? `Pengguna sedang di Studio, tab "${currentTab}".` : "Pengguna sedang di Studio.",
    });

    const fallback = applyStudioFallback(
      result.reply,
      result.studioActions,
      documentTitle
    );

    const notes = [
      image ? "Gambar yang dilampirkan belum bisa dibaca model ini; tempel teksnya jika perlu." : "",
      result.attachmentErrors.length
        ? `Berkas yang tidak terbaca: ${result.attachmentErrors.join("; ")}`
        : "",
    ].filter(Boolean);
    const note = notes.length ? `\n\n${notes.join("\n")}` : "";

    return NextResponse.json({
      reply: fallback.reply + note,
      steps: result.steps,
      changedDocuments: result.changedDocuments,
      studioActions: fallback.studioActions,
    });
  } catch (err) {
    const status = err instanceof AIUnavailableError ? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Asisten tidak dapat merespons." },
      { status }
    );
  }
}
