import { NextResponse } from "next/server";
import { z } from "zod";
import { callGeminiWithRotation, geminiKeyPool } from "@/lib/ai/gateway";
import { BALI_PEDAGOGICAL_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const StudioChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  documentContext: z.string().optional(),
  documentTitle: z.string().optional(),
  currentTab: z.string().optional(),
  studentPov: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = StudioChatRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Format pesan tidak valid", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { messages, documentContext, documentTitle, currentTab, studentPov } = parsed.data;

    const systemInstruction = `${BALI_PEDAGOGICAL_SYSTEM_PROMPT}

PERAN ANDA:
Anda adalah Exile Studio Copilot (Asisten Pedagogis Cerdas berbasis RAG & Reasoning).
${
  studentPov
    ? `MODE KHUSUS: SUDUT PANDANG SISWA (Student POV Simulator).
Jawablah dari perspektif siswa SMP/SMA: jelaskan apa yang membuat materi ini sulit atau mudah dipahami, bagaimana siswa memikirkannya, analogi apa yang masuk akal bagi mereka, dan cara mereka belajar tanpa rasa takut salah.`
    : `MODE KHUSUS: PANDUAN PENGAJAR (Teacher Curriculum Designer).
Bantu guru menyempurnakan bahan ajar, menyusun strategi mengajar aktif, mengantisipasi miskonsepsi siswa, dan merancang asesmen adaptif berstandar Kurikulum Merdeka.`
}

KONTEKS DOKUMEN AKTIF:
Judul Materi: ${documentTitle || "Dokumen Studio"}
Artifak Terpilih: ${currentTab || "Rangkuman Intisari"}

--- ISI MATERI TERDOKUMENTASI ---
${(documentContext || "Materi Kurikulum Merdeka Bahasa & Budaya Bali").slice(0, 6000)}
--- AKHIR MATERI ---

PANDUAN INTERAKSI:
1. Memori Konteks: Rujuk percakapan sebelumnya jika ada kaitan. Jangan lupakan detail dokumen.
2. Lugas, berbobot, berbasis bukti teks (grounded RAG).
3. Sertakan analogi cerdas atau contoh kalimat nyata bila menjelaskan istilah atau kaidah.
4. Format respon dengan markdown terstruktur (bold, bullet points) agar nyaman dibaca.`;

    if (geminiKeyPool.hasConfiguredKeys()) {
      // Build multi-turn contents for Gemini
      const geminiContents = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      try {
        const reply = await callGeminiWithRotation(
          {
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: geminiContents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 1024,
            },
          },
          5000
        );

        if (reply && reply.trim().length > 0) {
          return NextResponse.json({
            reply: reply.trim(),
            source: "gemini",
          });
        }
      } catch (err) {
        console.warn("[Studio Chat] Gemini call failed, falling back:", err);
      }
    }

    // Deterministic fallback if keys are unavailable or API rate-limited
    const latestUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
    let fallbackReply = "";

    if (studentPov) {
      if (latestUserMsg.includes("susah") || latestUserMsg.includes("bingung") || latestUserMsg.includes("sulit")) {
        fallbackReply = `Dari sudut pandang siswa, bagian paling membingungkan adalah **membedakan kruna untuk diri sendiri vs orang lain**. Siswa sering merasa takut salah berbicara sehingga memilih diam.\n\n*Tips ramah siswa:* Ingat rumus praktis **'Singgih = tinggikan orang lain/guru'** dan **'Sor = rendahkan diri sendiri (titiang matur)'**. Tidak perlu cemas, pembiasaan sehari-hari di kelas akan membuatnya otomatis!`;
      } else if (latestUserMsg.includes("contoh") || latestUserMsg.includes("soal")) {
        fallbackReply = `Berikut contoh percakapan santun di depan kelas:\n- **Siswa ke Guru:** *"Ritatkala Bapak Guru ngandika, titiang mirengang becik-becik."*\n- **Penjelasan Siswa:** Kata *ngandika* menghormati guru, sedangkan *titiang* dan *mirengang* menunjukkan sikap santun siswa.`;
      } else {
        fallbackReply = `Sebagai siswa yang baru mempelajari materi ini, konsep utamanya sangat menarik karena seperti **aturan etika bermain game bersama**: ada tingkatan kata untuk menghormati lawan bicara dan menjaga keharmonisan (Tri Hita Karana).\n\nApakah ada bagian istilah tertentu yang ingin dijelaskan dengan analogi sehari-hari?`;
      }
    } else {
      if (latestUserMsg.includes("asesmen") || latestUserMsg.includes("kuis") || latestUserMsg.includes("soal")) {
        fallbackReply = `Untuk asesmen materi ini, disarankan menggunakan **3 tingkat scaffolding**:\n1. **Level Dasar:** Identifikasi kruna ASI vs ASO.\n2. **Level Penerapan:** Memilih kalimat santun dalam konteks simulasi paruman atau kelas.\n3. **Level Analisis HOTS:** Mendeteksi kekeliruan etika tutur dalam studi kasus percakapan.`;
      } else if (latestUserMsg.includes("remedial") || latestUserMsg.includes("miskonsepsi")) {
        fallbackReply = `Miskonsepsi dominan adalah **siswa memakai kruna Alus Singgih untuk diri sendiri** (misal *"titiang ngandika"*).\n\n**Tindakan Remedial 5 Menit:**\nLakukan *roleplay* berpasangan: Siswa A berperan sebagai Guru, Siswa B sebagai Murid yang memohon izin. Evaluasi langsung pilihan kata kerja yang digunakan.`;
      } else {
        fallbackReply = `Berdasarkan dokumen materi yang sedang dibuka, fokus esensial Kurikulum Merdeka adalah **penguasaan kontekstual, bukan sekadar hafalan kamus**.\n\nAnda dapat meluncurkan kuis interaktif langsung ke murid lewat tombol **Buka Ruang Kuis Siswa**, atau memanfaatkan kartu belajar 3D untuk apersepsi awal pertemuan.`;
      }
    }

    return NextResponse.json({
      reply: fallbackReply,
      source: "fallback",
    });
  } catch (error) {
    console.error("[Studio Chat Error]:", error);
    return NextResponse.json(
      { error: "Gagal memproses pesan asisten studio" },
      { status: 500 }
    );
  }
}
