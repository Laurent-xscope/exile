import { NextResponse } from "next/server";
import { z } from "zod";
import { chatText, AIUnavailableError } from "@/lib/ai/llm";
import {
  getTeacherRoomDetails,
  ensureRoomLoaded,
  validateHostToken,
  type RoomChatMessage,
} from "@/lib/rooms/store";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";
import { checkRateLimit } from "@/lib/security/rate-limiter";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

const BodySchema = z.object({
  roomCode: z.string().min(4),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  // Fast validation path: validate body JSON before any async I/O (<1ms failure for malformed requests)
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Format permintaan tidak valid" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Format permintaan tidak valid" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { roomCode: rawCode, messages } = parsed.data;
  const roomCode = normalizeRoomCode(rawCode);

  if (!isValidRoomCode(roomCode)) {
    return NextResponse.json(
      { error: "Pin ruangan harus tepat 6 digit." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const hostToken = req.headers.get("x-host-token");
  if (!hostToken || !hostToken.trim()) {
    return NextResponse.json(
      { error: "Akses pengajar diperlukan." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  // Rate limit checked after fast schema validation
  const rateLimit = await checkRateLimit(req, 10, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) {
    return rateLimit.errorResponse;
  }

  if (!(await validateHostToken(roomCode, hostToken))) {
    return NextResponse.json(
      { error: "Akses pengajar diperlukan." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const [details, room] = await Promise.all([
    getTeacherRoomDetails(roomCode),
    ensureRoomLoaded(roomCode),
  ]);
  if (!details || !room) {
    return NextResponse.json(
      { error: `Ruang ${roomCode} tidak ditemukan.` },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const players = details.approvedPlayers || details.players || [];
  // Cap roster slice cleanly to avoid unbounded prompt bloat
  const rosterPlayers = players.slice(0, 20);
  const rosterSuffix =
    players.length > 20 ? `\n... dan ${players.length - 20} siswa lainnya` : "";
  const roster = rosterPlayers.length
    ? rosterPlayers
        .map((p) => `- ${p.nickname}: skor ${p.score}, beruntun ${p.streak}`)
        .join("\n") + rosterSuffix
    : "Belum ada siswa.";

  const current = details.currentQuestion;
  const currentQuestionText = current
    ? `${current.question.slice(0, 200)} (kunci ${current.correctAnswer})`
    : "belum ada";

  // Bound question list to 12 items with bounded length to keep TTFT low
  const questionList = room.questions.length
    ? room.questions
        .slice(0, 12)
        .map((q, i) => `${i + 1}. ${q.question.slice(0, 120)}`)
        .join("\n")
    : "Belum ada soal.";

  // Preserve Copilot reading of classroom chat messages, capped to recent 10 messages
  const rawChatMessages =
    room.chatMessages ||
    room.settings?.chatMessages ||
    details.chatMessages ||
    [];
  const chatTranscript = rawChatMessages.length
    ? (rawChatMessages as RoomChatMessage[])
        .slice(-10)
        .map((m) => {
          const role = m.senderRole === "teacher" ? "Guru" : "Siswa";
          const sender = (m.senderName || "").slice(0, 30);
          const text = (m.text || "").slice(0, 150);
          return `[${role} ${sender}]: ${text}`;
        })
        .join("\n")
    : "Belum ada pesan.";

  const system = `Kamu asisten guru di ruang kuis Exile (Pin ${roomCode}). Bantu guru mengelola kelas berdasarkan data di bawah. Jangan mengarang data yang tidak ada.

Status: ${details.status}
Soal aktif: ${currentQuestionText}
Jawaban masuk: ${details.stats?.submissionsCount ?? 0} dari ${details.stats?.totalPlayers ?? players.length}, benar ${details.stats?.correctCount ?? 0}

Siswa:
${roster}

Daftar soal:
${questionList}

Percakapan ruang kelas:
${chatTranscript}

Jawab dalam bahasa Indonesia sehari-hari, singkat dan langsung. Tanpa pembuka seperti "Tentu!", tanpa emoji. Kalau diminta memilih siswa, pilih satu dari daftar dan beri satu alasan singkat.`;

  // Bound recent conversation history cleanly to 6 messages with length capping to reduce LLM time-to-first-token
  const boundedHistory = messages
    .filter((m) => m.role !== "system")
    .slice(-6)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, 600),
    }));

  try {
    const reply = await chatText([
      { role: "system", content: system },
      ...boundedHistory,
    ]);
    return NextResponse.json({ reply }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    const status = err instanceof AIUnavailableError ? 502 : 500;
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Asisten tidak dapat merespons.",
      },
      { status, headers: NO_STORE_HEADERS }
    );
  }
}
