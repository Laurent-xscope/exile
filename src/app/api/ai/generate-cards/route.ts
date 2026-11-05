import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { FlashcardItemSchema } from "@/lib/ai/prompts";
import { chatJSON, AIUnavailableError } from "@/lib/ai/llm";

export const maxDuration = 90;

const RequestSchema = z.object({
  text: z.string().min(30),
  count: z.coerce.number().int().min(2).max(15).optional().default(6),
  focus: z.string().max(400).optional(),
  existingFronts: z.array(z.string()).max(40).optional(),
});

const ResponseSchema = z.object({
  flashcards: z.array(FlashcardItemSchema).min(1),
});

const SYSTEM = `Kamu menyusun kartu belajar (flashcards) dengan ketajaman setara Google NotebookLM dari bahan ajar yang diberikan.

Aturan kartu (1:1 NotebookLM):
- Semua isi wajib bersumber dari bahan ajar. Jangan menambah fakta dari luar bahan.
- Gunakan bahasa yang sama dengan bahan ajar. Kalimat lugas, bernas, tanpa kata "miskonsepsi" atau basa-basi.
- Variasikan sudut pertanyaan agar melatih daya ingat aktif secara menyeluruh:
  1. Mekanisme / alur ("Bagaimana proses X berlangsung hingga menghasilkan Y?")
  2. Perbandingan ("Apa perbedaan utama antara X dan Y dalam bahan ini?")
  3. Sebab-akibat ("Mengapa perubahan pada X memengaruhi Y?")
  4. Kasus / penerapan ("Dalam kondisi X, prinsip mana yang bekerja?")
  5. Peran istilah penting ("Apa fungsi spesifik X pada tahapan Y?")
- "front": satu kalimat pertanyaan yang tajam dan spesifik (jangan duplikasi kartu yang sudah ada).
- "back": kalimat pertama menjawab inti secara langsung, diikuti 1-2 kalimat penjelasan mekanisme, alasan, atau contoh dari bahan.
- "tag": sub-topik spesifik (2-3 kata).
- "hint": petunjuk berpikir 1 kalimat singkat tanpa membocorkan jawaban.

Balas HANYA JSON valid:
{"flashcards": [{"id": "c1", "front": string, "back": string, "tag": string, "hint": string}]}`;

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 12, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Permintaan kartu tidak valid." }, { status: 400 });
  }

  const { text, count, focus, existingFronts } = parsed.data;

  const userPrompt = [
    `Jumlah kartu baru: ${count}`,
    focus?.trim() ? `Fokus khusus dari pengguna: ${focus.trim()}` : "",
    existingFronts?.length
      ? `Jangan ulangi pertanyaan kartu yang sudah ada berikut:\n${existingFronts
          .slice(0, 20)
          .map((f) => `- ${f}`)
          .join("\n")}`
      : "",
    "",
    "=== BAHAN AJAR ===",
    text.slice(0, 35_000),
    "=== AKHIR BAHAN AJAR ===",
  ]
    .filter((line, idx) => line !== "" || idx > 2)
    .join("\n");

  try {
    const out = await chatJSON(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
      ResponseSchema,
      { temperature: 0.45, timeoutMs: 80_000 }
    );

    const flashcards = out.flashcards.slice(0, count).map((c, idx) => ({
      id: `card-${Date.now()}-${idx + 1}`,
      front: c.front.trim(),
      back: c.back.trim(),
      tag: (c.tag || "Konsep Inti").trim(),
      hint: c.hint?.trim() || undefined,
    }));

    return NextResponse.json({ success: true, flashcards });
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Gagal membuat kartu baru." }, { status: 500 });
  }
}
