import { NextResponse } from "next/server";
import { z } from "zod";
import { callGeminiWithRotation, geminiKeyPool } from "@/lib/ai/gateway";
import { getTeacherRoomDetails, ensureRoomLoaded } from "@/lib/rooms/store";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const HostCopilotSchema = z.object({
  roomCode: z.string().min(4),
  messages: z.array(MessageSchema).min(1),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = HostCopilotSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Format permintaan tidak valid", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { roomCode, messages } = parsed.data;
    const roomDetails = await getTeacherRoomDetails(roomCode);
    const room = await ensureRoomLoaded(roomCode);

    if (!roomDetails || !room) {
      return NextResponse.json(
        { error: `Ruang kuis ${roomCode} tidak ditemukan.` },
        { status: 404 }
      );
    }

    const activePlayers = roomDetails.approvedPlayers || roomDetails.players || [];
    const questions = room.questions || [];
    const currentQ = roomDetails.currentQuestion;

    const studentRosterText =
      activePlayers.length > 0
        ? activePlayers
            .map(
              (p, idx) =>
                `${idx + 1}. ${p.nickname} (Skor: ${p.score}, Beruntun: ${p.streak}, Status: ${p.isConnected ? "Terhubung" : "Offline"})`
            )
            .join("\n")
        : "Belum ada siswa yang bergabung di ruangan ini.";

    const questionsListText =
      questions.length > 0
        ? questions
            .map(
              (q, idx) =>
                `Soal ${idx + 1}: "${q.question}" [Konsep: ${q.conceptTag || "Umum"}]`
            )
            .join("\n")
        : "Tidak ada soal terdaftar.";

    const systemInstruction = `Anda adalah Exile Host Copilot, asisten cerdas khusus pengajar untuk ruang kuis "${roomCode}".

TUGAS DAN KEMAMPUAN ANDA:
1. Membaca dan memahami situasi kelas saat ini:
   - Jumlah siswa terhubung: ${activePlayers.length} orang.
   - Soal aktif saat ini: ${
     currentQ
       ? `Soal ${(roomDetails.currentQuestionIndex || 0) + 1}: "${currentQ.question}"`
       : "Belum ada soal aktif / sesi di lobi"
   }.
   - Akurasi rata-rata kelas: ${roomDetails.stats?.accuracyPercentage ?? 0}%.
   - Total soal: ${roomDetails.totalQuestions}.

2. PEMILIH SISWA & EVALUASI REKAN KELAS:
   - Jika guru bertanya siapa yang cocok untuk presentasi ("siapa yang cocok di presentasi?", "pilih siswa untuk maju", "tunjuk satu orang acak"), Anda HARUS memilih nama nyata dari daftar siswa di bawah ini!
   - Sebutkan nama siswa secara tegas, misalnya: "Siswa yang terpilih untuk presentasi adalah **[Nama Siswa]**." Berikan alasan pedagogis singkat (misalnya keaktifan, skornya, atau kesempatan belajar berimbang).
   - Jika guru meminta siswa acak, pilih secara acak dari daftar yang hadir.

3. EVALUASI DAN DIAGNOSTIK KELAS:
   - Berikan rekomendasi jika siswa banyak yang keliru pada suatu konsep.
   - Bantu guru menyusun pertanyaan pemantik lisan sebelum melanjutkan ke soal berikutnya.
   - Gunakan gaya bahasa profesional, suportif, ringkas, dan jelas dalam bahasa Indonesia. Jangan menggunakan huruf kapital berlebihan (ALL CAPS).

--- DAFTAR SISWA AKTIF DI RUANGAN ---
${studentRosterText}
--- DAFTAR MATERI & SOAL KUIS ---
${questionsListText}
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
        console.warn("[host-copilot] Gemini call failed, using heuristic fallback:", geminiErr);
      }
    }

    // Heuristic Fallback
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || "";
    let fallbackReply = "";

    if (
      lastMessage.includes("presentasi") ||
      lastMessage.includes("pilih") ||
      lastMessage.includes("siapa") ||
      lastMessage.includes("tunjuk") ||
      lastMessage.includes("acak")
    ) {
      if (activePlayers.length === 0) {
        fallbackReply =
          "Saat ini belum ada siswa yang bergabung di dalam ruangan kuis ini. Silakan bagikan kode PIN ke siswa terlebih dahulu.";
      } else {
        const randomPlayer =
          activePlayers[Math.floor(Math.random() * activePlayers.length)];
        fallbackReply = `Siswa yang terpilih untuk presentasi adalah **${randomPlayer.nickname}** (Skor: ${randomPlayer.score} poin). Siswa ini memiliki partisipasi aktif di ruangan kuis saat ini. Anda dapat meminta ${randomPlayer.nickname} untuk menjelaskan alasannya memilih jawaban pada soal terkini.`;
      }
    } else if (lastMessage.includes("evaluasi") || lastMessage.includes("kelas")) {
      fallbackReply = `Ringkasan performa kelas saat ini:\n• Total siswa aktif: ${activePlayers.length} orang\n• Akurasi kelas: ${roomDetails.stats?.accuracyPercentage ?? 0}%\n• Status kuis: ${roomDetails.status}\n\nRekomendasi: Jika ada siswa yang mengalami kendala, buka diskusi terbuka pada opsi pengecoh yang paling sering dipilih sebelum melangkah ke soal berikutnya.`;
    } else {
      fallbackReply = `Halo Guru! Saya Exile Host Copilot. Saat ini ada ${activePlayers.length} siswa aktif di ruang kuis ${roomCode}. Saya dapat membantu Anda menunjuk siswa untuk presentasi secara acak, merangkum performa materi, atau memberikan strategi remedi interaktif.`;
    }

    return NextResponse.json({
      success: true,
      reply: fallbackReply,
      fallback: true,
    });
  } catch (err: unknown) {
    console.error("[host-copilot error]", err);
    return NextResponse.json(
      { error: "Gagal memproses Copilot pengajar" },
      { status: 500 }
    );
  }
}
