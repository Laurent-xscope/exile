import { NextResponse } from "next/server";
import { z } from "zod";
import { chatText, AIUnavailableError } from "@/lib/ai/llm";
import { getTeacherRoomDetails, ensureRoomLoaded, validateHostToken } from "@/lib/rooms/store";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";
import { checkRateLimit } from "@/lib/security/rate-limiter";

const BodySchema = z.object({
  roomCode: z.string().min(4),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }))
    .min(1),
});

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 10, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Format permintaan tidak valid" }, { status: 400 });
  }
  const { roomCode: rawCode, messages } = parsed.data;
  const roomCode = normalizeRoomCode(rawCode);

  if (!isValidRoomCode(roomCode)) {
    return NextResponse.json({ error: "PIN ruangan harus tepat 6 digit." }, { status: 400 });
  }

  if (!(await validateHostToken(roomCode, req.headers.get("x-host-token")))) {
    return NextResponse.json({ error: "Akses pengajar diperlukan." }, { status: 401 });
  }

  const [details, room] = await Promise.all([getTeacherRoomDetails(roomCode), ensureRoomLoaded(roomCode)]);
  if (!details || !room) {
    return NextResponse.json({ error: `Ruang ${roomCode} tidak ditemukan.` }, { status: 404 });
  }

  const players = details.approvedPlayers || details.players || [];
  const roster = players.length
    ? players.map((p) => `- ${p.nickname}: skor ${p.score}, beruntun ${p.streak}`).join("\n")
    : "Belum ada siswa.";
  const current = details.currentQuestion;
  const questionList = room.questions.length
    ? room.questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")
    : "Belum ada soal.";

  const system = `Kamu asisten guru di ruang kuis Exile (PIN ${roomCode}). Bantu guru mengelola kelas berdasarkan data di bawah. Jangan mengarang data yang tidak ada.

Status: ${details.status}
Soal aktif: ${current ? `${current.question} (kunci ${current.correctAnswer})` : "belum ada"}
Jawaban masuk: ${details.stats?.submissionsCount ?? 0} dari ${details.stats?.totalPlayers ?? players.length}, benar ${details.stats?.correctCount ?? 0}

Siswa:
${roster}

Daftar soal:
${questionList}

Jawab dalam bahasa Indonesia sehari-hari, singkat dan langsung. Tanpa pembuka seperti "Tentu!", tanpa emoji. Kalau diminta memilih siswa, pilih satu dari daftar dan beri satu alasan singkat.`;

  try {
    const reply = await chatText([
      { role: "system", content: system },
      ...messages
        .filter((m) => m.role !== "system")
        .slice(-10)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ]);
    return NextResponse.json({ reply });
  } catch (err) {
    const status = err instanceof AIUnavailableError ? 502 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Asisten tidak dapat merespons." },
      { status }
    );
  }
}
