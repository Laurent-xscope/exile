import { NextResponse } from "next/server";
import { z } from "zod";
import { callGeminiWithRotation, geminiKeyPool } from "@/lib/ai/gateway";
import { getGameRoomState, ensureRoomLoaded } from "@/lib/rooms/store";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const StudentCopilotSchema = z.object({
  roomCode: z.string().min(4),
  playerId: z.string().optional(),
  messages: z.array(MessageSchema).min(1),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = StudentCopilotSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Format pesan tidak valid", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { roomCode, playerId, messages } = parsed.data;
    const room = await ensureRoomLoaded(roomCode);
    const state = await getGameRoomState(roomCode);

    if (!room || !state) {
      return NextResponse.json(
        { error: `Ruang kuis ${roomCode} tidak ditemukan.` },
        { status: 404 }
      );
    }

    const currentPlayer = playerId ? room.players.get(playerId) : null;
    const currentQ = state.currentQuestion;
    const questions = room.questions || [];

    const materialsSummary = questions
      .map(
        (q, idx) =>
          `Poin ${idx + 1}: ${q.conceptTag || "Materi Umum"} — ${q.explanation || q.question}`
      )
      .join("\n");

    const systemInstruction = `Anda adalah Exile Student Copilot, asisten belajar pribadi yang ramah, santun, dan jelas bagi siswa yang sedang mengikuti sesi kelas di ruang kuis "${roomCode}".

IDENTITAS DAN PERAN:
1. Nama Anda adalah Exile Student Copilot.
2. Tugas Anda adalah membantu siswa memahami materi yang baru saja diterangkan oleh guru atau ditanyakan di kuis.
3. Anda dapat:
   - Merangkum (summarize) konsep inti materi pelajaran secara sederhana dan mudah dicerna.
   - Menjelaskan istilah asing atau konsep yang membingungkan siswa.
   - Memberi petunjuk berpikir (clues / scaffolding) tanpa langsung membocorkan jawaban mentah jika soal sedang aktif dijawab.
4. Gaya bicara: Hangat, menyemangati, edukatif, bahasa Indonesia yang santun dan jelas, tidak menggunakan huruf besar berlebihan (no ALL CAPS).

KONTEKS SISWA:
- Nama panggilan siswa: ${currentPlayer?.nickname || "Siswa"}
- Skor saat ini: ${currentPlayer?.score ?? 0} poin
- Soal aktif saat ini: ${
      currentQ
        ? `Soal ${currentQ.questionOrder}: "${currentQ.question}" (Topik: ${
            currentQ.conceptTag || "Konsep Umum"
          })`
        : "Menunggu pertanyaan berikutnya dari pengajar"
    }

RINGKASAN KONSEP MATERI KELAS:
${materialsSummary || "Materi sedang disampaikan oleh pengajar."}
`;

    const conversationHistory = messages.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

    if (geminiKeyPool.hasConfiguredKeys()) {
      try {
        const responseText = await callGeminiWithRotation(
          {
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: conversationHistory,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          },
          6000
        );
        if (responseText && responseText.trim().length > 0) {
          return NextResponse.json({
            success: true,
            reply: responseText.trim(),
          });
        }
      } catch (geminiErr) {
        console.warn("[student-copilot] Gemini call failed, using fallback:", geminiErr);
      }
    }

    // Heuristic Fallback
    const lastMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
    let fallbackReply = "";

    if (lastMsg.includes("rangkum") || lastMsg.includes("summarize") || lastMsg.includes("ringkas")) {
      fallbackReply = `Berikut rangkuman inti materi pelajaran kita hari ini:\n1. Setiap konsep ilmiah dibangun dari observasi terarah dan verifikasi data objektif.\n2. Dalam menganalisis fenomena (grafik atau ekosistem), amati pola hubungan sebab-akibat secara teliti.\n3. Jangan ragu bertanya pada bagian konsep yang terasa belum jelas!`;
    } else if (lastMsg.includes("jelas") || lastMsg.includes("paham") || lastMsg.includes("maksud")) {
      fallbackReply = `Tenang, mari kita bedah bersama! Yang perlu diperhatikan adalah fokus pada konsep dasarnya terlebih dahulu. Coba perhatikan petunjuk utama dari pertanyaan guru dan kaitkan dengan contoh di kehidupan sehari-hari.`;
    } else {
      fallbackReply = `Halo ${currentPlayer?.nickname || "teman belajar"}! Saya Exile Student Copilot. Jika ada bagian penjelasan guru atau pertanyaan kuis yang belum kamu pahami, tanyakan saja di sini ya. Saya siap membantu merangkum dan menjelaskannya!`;
    }

    return NextResponse.json({
      success: true,
      reply: fallbackReply,
      fallback: true,
    });
  } catch (err: unknown) {
    console.error("[student-copilot error]", err);
    return NextResponse.json(
      { error: "Gagal memproses Copilot siswa" },
      { status: 500 }
    );
  }
}
