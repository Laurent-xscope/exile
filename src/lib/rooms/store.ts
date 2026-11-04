import { supabase } from "@/lib/supabase";
import type { Question } from "@/lib/ai/prompts";

export interface PlayerRecord {
  id: string;
  roomCode: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  isConnected: boolean;
  lastSeenAt: string;
}

export interface SubmissionRecord {
  id: string;
  roomCode: string;
  playerId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  responseTimeMs: number;
  scoreAwarded: number;
  microFeedback?: string;
  createdAt: string;
}

export interface GameRoomRecord {
  id: string;
  roomCode: string;
  quizId: string;
  hostName: string;
  status: "waiting" | "active" | "question_active" | "showing_leaderboard" | "finished";
  currentQuestionIndex: number;
  questionStartTime?: string;
  settings: {
    timePerQuestionSec: number;
    streakBonus: boolean;
    shuffleQuestions?: boolean;
  };
  questions: Question[];
  players: Map<string, PlayerRecord>;
  submissions: SubmissionRecord[];
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: number;
}

function withTimeout<T>(promise: PromiseLike<T>, ms = 1500): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export const SEED_BALI_QUESTIONS: Question[] = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    questionOrder: 1,
    question:
      "Rikala mabaos majeng ring Bapak utawi Ibu Guru ring sekolah, kruna sane patut kaanggen nyihnayang raga (diri sendiri) mangda manut ring anggah-ungguhing basa inggih punika...",
    options: [
      {
        label: "A",
        text: "Titiang",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Kruna Alus Sor (ASO) kaanggen ngasorang raga majeng ring wangsa utawi status sane kasinggihang sakadi guru.",
      },
      {
        label: "B",
        text: "Icang",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Icang punika Basa Andap/Kasar sane wantah dados kaanggen majeng ring timpal sane sampun lulut raket.",
      },
      {
        label: "C",
        text: "Kai",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Kai punika kruna Kasar pisan, nenten dados kaanggen ring lingkungan sekolah.",
      },
      {
        label: "D",
        text: "Iraga",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Iraga punika kata ganti jamak (kita/kami), nenten tepat kaanggen nyihnayang raga pribadi tunggal majeng ring guru.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Rikala mabebaosan sareng anak sane kasungkemang (guru, sang maraga suci), raga patut nganggen kruna Alus Sor (ASO) sakadi 'titiang'.",
    conceptTag: "Anggah-ungguhing Basa: Alus Sor (Kata Ganti Diri)",
    culturalContext: "Etika Kesantunan Bahasa di Sekolah Bali",
  },
  {
    id: "a2222222-2222-2222-2222-222222222222",
    questionOrder: 2,
    question: "Kruna 'ngandika' ring anggah-ungguhing basa Bali kabaos ngranjing ring soroh kruna...",
    options: [
      {
        label: "A",
        text: "Alus Singgih (ASI)",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Ngandika kaanggen ngapingitang/ngajunjung sang kasinggihang sakadi guru, sulinggih, utawi pejabat.",
      },
      {
        label: "B",
        text: "Alus Sor (ASO)",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Miskonsepsi umum siswa sering menganggap ngandika adalah Alus Sor, padahal untuk Alus Sor kata yang tepat adalah matur atau nguningayang.",
      },
      {
        label: "C",
        text: "Alus Madia (AMA)",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Alus Madia adalah bentuk sopan menengah santai, bukan kruna kasinggihan formal.",
      },
      {
        label: "D",
        text: "Basa Andap",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Bentuk Andap dari kata ini adalah ngomong atau munyi.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "'Ngandika' punika kruna Alus Singgih (ASI) sane kanggen majeng ring sang maraga utama/singgih. Yening dewek ngraga patut ngangge 'matur'.",
    conceptTag: "Anggah-ungguhing Basa: Alus Singgih (Kruna Kriya)",
    culturalContext: "Tata Krama Mabebaosan Adat Bali",
  },
  {
    id: "a3333333-3333-3333-3333-333333333333",
    questionOrder: 3,
    question:
      "Tengenan 'r' ring pungkur kruna 'pasar' yening kasurat ring Pasang Aksara Bali patut nganggen...",
    options: [
      {
        label: "A",
        text: "Surang",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Tengenan r ring tengah utawi ungkur kruna kasurat nganggen Pangangge Tengenan Surang ring duur aksara.",
      },
      {
        label: "B",
        text: "Adeg-adeg ring aksara Ra",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Siswa sering keliru menggunakan adeg-adeg untuk mematikan aksara Ra, padahal uger-uger melarang adeg-adeg pada konsonan r.",
      },
      {
        label: "C",
        text: "Cecek",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Cecek adalah pangangge tengenan untuk bunyi sengau ng, bukan r.",
      },
      {
        label: "D",
        text: "Bisah",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Bisah adalah pangangge tengenan untuk bunyi hembusan h.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Manut uger-uger pasang aksara Bali, tengenan 'r' kasurat nganggen Surang. Adeg-adeg nenten dados kasurat ring aksara Ra.",
    conceptTag: "Pasang Aksara: Pangangge Tengenan Surang",
    culturalContext: "Uger-uger Pasang Aksara Pasamuan Alit",
  },
  {
    id: "a4444444-4444-4444-4444-444444444444",
    questionOrder: 4,
    question:
      "Pangangge suara sane kaanggen ngembasang suara vokal 'u' ring aksara Bali inggih punika...",
    options: [
      {
        label: "A",
        text: "Suku",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Suku magenah ring sor aksara mangda ngasilang swara vokal u.",
      },
      {
        label: "B",
        text: "Ulu",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Siswa sering tertukar antara Ulu (vokal i) dan Suku (vokal u).",
      },
      {
        label: "C",
        text: "Pepet",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Pepet digunakan untuk suara e lemah (pepet), bukan u.",
      },
      {
        label: "D",
        text: "Tedung",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Tedung digunakan untuk memperpanjang vokal atau kombinasi taling tedong.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Pangangge suara sane mawasta Suku magenah ring sor aksara anggen ngembasang suara 'u'. Ulu mangge suara 'i'.",
    conceptTag: "Pasang Aksara: Pangangge Suara Suku",
    culturalContext: "Pangangge Suara Baku Bali",
  },
  {
    id: "a5555555-5555-5555-5555-555555555555",
    questionOrder: 5,
    question:
      "Parilaksana gotong royong nyiagayang genah upacara piodalan sareng krama banjar punika pamargi Tri Hita Karana pahan...",
    options: [
      {
        label: "A",
        text: "Pawongan",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Pawongan fokus ring pasawitran miwah rasa sagilik-saguluk salunglung sabayantaka sesama karma banjar.",
      },
      {
        label: "B",
        text: "Parahyangan kemanten",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Walaupun tujuannya untuk piodalan pura (Parahyangan), kegiatan gotong royong antarmanusia secara sosiologis adalah pilar Pawongan.",
      },
      {
        label: "C",
        text: "Palemahan",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Palemahan menyangkut hubungan manusia dengan alam lingkungan fisik.",
      },
      {
        label: "D",
        text: "Sad Ripu",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Sad Ripu adalah enam musuh dalam diri manusia, bukan bagian dari Tri Hita Karana.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Pawongan inggih punika pasubayan miwah rasa asah, asih, asuh ring krama banjar sane kadasarin gotong royong.",
    conceptTag: "Tri Hita Karana: Pawongan & Banjar Adat",
    culturalContext: "Sistem Kemasyarakatan Banjar Adat Bali",
  },
];

const inMemoryRooms = new Map<string, GameRoomRecord>();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUuid(val?: string | null): boolean {
  return Boolean(val && UUID_REGEX.test(val));
}

export function generateRoomCode(): string {
  let pin = "";
  let attempts = 0;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
  } while (inMemoryRooms.has(pin) && attempts < 100);
  return pin;
}

export async function createGameRoom(params: {
  quizId?: string;
  hostName?: string;
  settings?: {
    timePerQuestionSec?: number;
    streakBonus?: boolean;
    shuffleQuestions?: boolean;
  };
  questions?: Question[];
}): Promise<GameRoomRecord> {
  const roomCode = generateRoomCode();
  const roomId = crypto.randomUUID();
  const now = new Date().toISOString();

  const hasCustomQuestions = Boolean(params.questions && params.questions.length > 0);
  let questions: Question[] = hasCustomQuestions
    ? params.questions!.map((q, idx) => ({
        ...q,
        id: isValidUuid(q.id) ? q.id : crypto.randomUUID(),
        questionOrder: q.questionOrder ?? idx + 1,
      }))
    : SEED_BALI_QUESTIONS.map((q) => ({ ...q }));

  if (params.settings?.shuffleQuestions) {
    questions = [...questions];
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    questions = questions.map((q, idx) => ({
      ...q,
      questionOrder: idx + 1,
    }));
  }

  let resolvedQuizId = isValidUuid(params.quizId)
    ? params.quizId!
    : "e1a84f3c-5026-4d2c-9749-34b865fa7b21";

  if (!isValidUuid(params.quizId) || hasCustomQuestions) {
    const stored = await storeQuiz({
      id: isValidUuid(params.quizId) ? params.quizId! : crypto.randomUUID(),
      title: "Kuis Kelas Exile",
      description: "Asesmen interaktif Kurikulum Merdeka",
      questions,
    });
    resolvedQuizId = stored.id;
    questions = stored.questions;
  }

  const newRoom: GameRoomRecord = {
    id: roomId,
    roomCode,
    quizId: resolvedQuizId,
    hostName: params.hostName?.trim() || "Guru",
    status: "waiting",
    currentQuestionIndex: 0,
    settings: {
      timePerQuestionSec: params.settings?.timePerQuestionSec || 20,
      streakBonus: params.settings?.streakBonus ?? true,
      shuffleQuestions: params.settings?.shuffleQuestions ?? false,
    },
    questions,
    players: new Map<string, PlayerRecord>(),
    submissions: [],
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: Date.now(),
  };

  inMemoryRooms.set(roomCode, newRoom);

  try {
    const isPlaceholder =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

    if (!isPlaceholder) {
      await withTimeout(
        supabase.from("game_rooms").insert({
          id: roomId,
          room_code: roomCode,
          quiz_id: newRoom.quizId,
          host_name: newRoom.hostName,
          status: newRoom.status,
          current_question_index: 0,
          settings: newRoom.settings,
        }),
        1500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase sync omitted, in-memory active:", err);
  }

  return newRoom;
}

export async function ensureRoomLoaded(roomCode: string): Promise<GameRoomRecord | null> {
  const cached = inMemoryRooms.get(roomCode) || null;
  if (cached && cached.lastSyncedAt && Date.now() - cached.lastSyncedAt < 1500) {
    return cached;
  }

  try {
    const isPlaceholder =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

    if (isPlaceholder) return cached;

    const synced = await withTimeout(
      Promise.all([
        supabase.from("game_rooms").select("*").eq("room_code", roomCode).maybeSingle(),
        supabase.from("players").select("*").eq("room_code", roomCode),
        supabase.from("submissions").select("*").eq("room_code", roomCode),
      ]),
      2000
    );

    if (!synced) return cached;

    const [{ data: roomData, error: roomErr }, { data: playersData }, { data: subData }] = synced;

    if (roomErr || !roomData) return cached;

    const playerMap = new Map<string, PlayerRecord>();
    if (cached) {
      for (const [k, v] of cached.players.entries()) {
        playerMap.set(k, v);
      }
    }
    if (playersData) {
      for (const p of playersData) {
        playerMap.set(p.id, {
          id: p.id,
          roomCode: p.room_code,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score,
          streak: p.streak,
          isConnected: p.is_connected,
          lastSeenAt: p.last_seen_at || new Date().toISOString(),
        });
      }
    }

    const submissionsMap = new Map<string, SubmissionRecord>();
    if (cached) {
      for (const s of cached.submissions) {
        submissionsMap.set(s.id, s);
      }
    }
    if (subData) {
      for (const s of subData) {
        submissionsMap.set(s.id, {
          id: s.id,
          roomCode: s.room_code,
          playerId: s.player_id,
          questionId: s.question_id || "",
          selectedOption: s.selected_option,
          isCorrect: s.is_correct,
          responseTimeMs: s.response_time_ms,
          scoreAwarded: s.score_awarded,
          microFeedback: s.micro_feedback || undefined,
          createdAt: s.created_at,
        });
      }
    }
    const submissions = Array.from(submissionsMap.values());

    let questions: Question[] = cached?.questions || SEED_BALI_QUESTIONS;
    if ((!cached || cached.questions.length === 0) && roomData.quiz_id) {
      const qRes = await withTimeout(
        supabase
          .from("questions")
          .select("*")
          .eq("quiz_id", roomData.quiz_id)
          .order("question_order", { ascending: true }),
        2000
      );

      const qData = qRes?.data;
      if (qData && qData.length > 0) {
        questions = qData.map((q) => ({
          id: q.id,
          questionOrder: q.question_order,
          question: q.question_text,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation,
          conceptTag: q.concept_tag,
          culturalContext: q.cultural_context || undefined,
        }));
      }
    }

    const restoredRoom: GameRoomRecord = {
      id: roomData.id,
      roomCode: roomData.room_code,
      quizId: roomData.quiz_id || cached?.quizId || "e1a84f3c-5026-4d2c-9749-34b865fa7b21",
      hostName: roomData.host_name || cached?.hostName || "Guru",
      status: roomData.status || cached?.status || "waiting",
      currentQuestionIndex: roomData.current_question_index ?? cached?.currentQuestionIndex ?? 0,
      questionStartTime: roomData.question_start_time || cached?.questionStartTime || undefined,
      settings: roomData.settings || cached?.settings || { timePerQuestionSec: 20, streakBonus: true },
      questions,
      players: playerMap,
      submissions,
      createdAt: roomData.created_at || cached?.createdAt || new Date().toISOString(),
      updatedAt: roomData.updated_at || cached?.updatedAt || new Date().toISOString(),
      lastSyncedAt: Date.now(),
    };

    inMemoryRooms.set(roomCode, restoredRoom);
    return restoredRoom;
  } catch (err) {
    console.warn("[RoomStore] Failed to restore room from Supabase:", err);
    return cached;
  }
}

export async function joinGameRoom(params: {
  roomCode: string;
  nickname: string;
  avatar?: string;
}): Promise<{ player: PlayerRecord; room: GameRoomRecord } | null> {
  const room = await ensureRoomLoaded(params.roomCode);

  if (!room) {
    return null;
  }

  let existingPlayer: PlayerRecord | undefined;
  for (const p of room.players.values()) {
    if (p.nickname.toLowerCase() === params.nickname.trim().toLowerCase()) {
      existingPlayer = p;
      break;
    }
  }

  if (existingPlayer) {
    existingPlayer.isConnected = true;
    existingPlayer.lastSeenAt = new Date().toISOString();
    room.lastSyncedAt = Date.now();
    try {
      const isPlaceholder =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

      if (!isPlaceholder) {
        await withTimeout(
          supabase
            .from("players")
            .update({
              is_connected: true,
              last_seen_at: existingPlayer.lastSeenAt,
            })
            .match({ id: existingPlayer.id }),
          1500
        );
      }
    } catch (err) {
      console.warn("[RoomStore] Supabase player reconnect sync omitted:", err);
    }
    return { player: existingPlayer, room };
  }

  const playerId = crypto.randomUUID();
  const newPlayer: PlayerRecord = {
    id: playerId,
    roomCode: params.roomCode,
    nickname: params.nickname.trim(),
    avatar: params.avatar || "garuda",
    score: 0,
    streak: 0,
    isConnected: true,
    lastSeenAt: new Date().toISOString(),
  };

  room.players.set(playerId, newPlayer);
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  try {
    const isPlaceholder =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

    if (!isPlaceholder) {
      await withTimeout(
        supabase.from("players").insert({
          id: playerId,
          room_code: params.roomCode,
          nickname: newPlayer.nickname,
          avatar: newPlayer.avatar,
          score: 0,
          streak: 0,
          is_connected: true,
        }),
        1500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase player sync omitted:", err);
  }

  return { player: newPlayer, room };
}

export async function getGameRoomState(roomCode: string) {
  const room = await ensureRoomLoaded(roomCode);

  if (!room) {
    return null;
  }

  const playersList = Array.from(room.players.values());
  const leaderboard = [...playersList].sort((a, b) => b.score - a.score);

  const currentQ =
    room.questions && room.questions.length > room.currentQuestionIndex
      ? room.questions[room.currentQuestionIndex]
      : null;

  return {
    roomId: room.id,
    roomCode: room.roomCode,
    quizId: room.quizId,
    hostName: room.hostName,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    currentQuestion: currentQ
      ? {
          id: currentQ.id,
          questionOrder: currentQ.questionOrder ?? room.currentQuestionIndex + 1,
          question: currentQ.question,
          // Mask answer key and rationale from live client payloads.
          options: currentQ.options.map((opt) => ({
            label: opt.label,
            text: opt.text,
          })),
          conceptTag: currentQ.conceptTag,
          culturalContext: currentQ.culturalContext,
        }
      : null,
    players: playersList.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak,
      isConnected: p.isConnected,
    })),
    leaderboard: leaderboard.map((p, index) => ({
      rank: index + 1,
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak,
    })),
    settings: room.settings,
    totalSubmissionsCount: room.submissions.length,
    updatedAt: room.updatedAt,
  };
}

export async function recordAnswerSubmission(params: {
  roomCode: string;
  playerId: string;
  questionId: string;
  selectedOption: string;
  responseTimeMs: number;
  microFeedback?: string;
}) {
  const room = await ensureRoomLoaded(params.roomCode);
  if (!room) return null;

  const isPlaceholder =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

  let player = room.players.get(params.playerId);
  if (!player) {
    const resolvedPlayerId = isValidUuid(params.playerId)
      ? params.playerId
      : crypto.randomUUID();
    player = {
      id: resolvedPlayerId,
      roomCode: params.roomCode,
      nickname: `Siswa ${resolvedPlayerId.slice(-3)}`,
      avatar: "garuda",
      score: 0,
      streak: 0,
      isConnected: true,
      lastSeenAt: new Date().toISOString(),
    };
    room.players.set(resolvedPlayerId, player);

    if (!isPlaceholder) {
      try {
        await withTimeout(
          supabase.from("players").upsert({
            id: player.id,
            room_code: params.roomCode,
            nickname: player.nickname,
            avatar: player.avatar,
            score: player.score,
            streak: player.streak,
            is_connected: true,
            last_seen_at: player.lastSeenAt,
          }),
          1500
        );
      } catch (err) {
        console.warn("[RoomStore] Supabase fallback player upsert omitted:", err);
      }
    }
  }

  const question = room.questions.find(
    (q) => q.id === params.questionId || !params.questionId
  );
  const isCorrect = question
    ? question.correctAnswer === params.selectedOption.toUpperCase()
    : false;

  // Base 500 + up to 500 speed bonus, plus 50 per streak step.
  let scoreAwarded = 0;
  if (isCorrect) {
    const timeLimitMs = (room.settings.timePerQuestionSec || 20) * 1000;
    const timeFactor = Math.max(0, 1 - params.responseTimeMs / timeLimitMs);
    const baseScore = 500 + Math.round(500 * timeFactor);
    const streakBonus = room.settings.streakBonus ? player.streak * 50 : 0;
    scoreAwarded = baseScore + streakBonus;

    player.score += scoreAwarded;
    player.streak += 1;
  } else {
    player.streak = 0;
  }

  const validQuestionId = isValidUuid(params.questionId)
    ? params.questionId
    : question && isValidUuid(question.id)
      ? question.id!
      : null;

  const submission: SubmissionRecord = {
    id: crypto.randomUUID(),
    roomCode: params.roomCode,
    playerId: player.id,
    questionId: validQuestionId || params.questionId,
    selectedOption: params.selectedOption,
    isCorrect,
    responseTimeMs: params.responseTimeMs,
    scoreAwarded,
    microFeedback: params.microFeedback,
    createdAt: new Date().toISOString(),
  };

  room.submissions.push(submission);
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  try {
    if (!isPlaceholder) {
      await withTimeout(
        Promise.all([
          supabase
            .from("players")
            .update({
              score: player.score,
              streak: player.streak,
              last_seen_at: new Date().toISOString(),
            })
            .match({ room_code: params.roomCode, id: player.id }),
          supabase.from("submissions").insert({
            id: submission.id,
            room_code: params.roomCode,
            player_id: player.id,
            question_id: validQuestionId,
            selected_option: params.selectedOption,
            is_correct: isCorrect,
            response_time_ms: params.responseTimeMs,
            score_awarded: scoreAwarded,
            micro_feedback: params.microFeedback || null,
          }),
        ]),
        1500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase submission sync omitted:", err);
  }

  return {
    submission,
    updatedPlayer: player,
    correctAnswer: question?.correctAnswer || "A",
    explanation: question?.explanation || "",
  };
}

export async function getRoomSubmissions(roomCode: string) {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return [];
  return room.submissions;
}

export async function getRoomQuestions(roomCode: string): Promise<Question[]> {
  const room = await ensureRoomLoaded(roomCode);
  return room ? room.questions : SEED_BALI_QUESTIONS;
}

export interface StoredQuizRecord {
  id: string;
  title: string;
  description: string;
  targetGrade?: string;
  category?: string;
  culturalTheme?: string;
  questions: Question[];
  createdAt: string;
}

const inMemoryQuizzes = new Map<string, StoredQuizRecord>();

export async function storeQuiz(
  quiz: Omit<StoredQuizRecord, "createdAt">
): Promise<StoredQuizRecord> {
  const normalizedQuizId = isValidUuid(quiz.id) ? quiz.id : crypto.randomUUID();
  const normalizedQuestions = (quiz.questions || []).map((q, index) => ({
    ...q,
    id: isValidUuid(q.id) ? q.id : crypto.randomUUID(),
    questionOrder: q.questionOrder || index + 1,
  }));

  const record: StoredQuizRecord = {
    ...quiz,
    id: normalizedQuizId,
    questions: normalizedQuestions,
    createdAt: new Date().toISOString(),
  };
  inMemoryQuizzes.set(record.id, record);

  try {
    const isPlaceholder =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

    if (!isPlaceholder) {
      await withTimeout(
        (async () => {
          await supabase.from("quizzes").upsert({
            id: record.id,
            title: record.title,
            description: record.description || null,
            grade_level: record.targetGrade || "Fase D (SMP)",
            category: record.category || "Muatan Lokal Bali",
            cultural_theme: record.culturalTheme || null,
          });

          if (record.questions && record.questions.length > 0) {
            const questionRows = record.questions.map((q, index) => ({
              id: q.id!,
              quiz_id: record.id,
              question_order: q.questionOrder || index + 1,
              question_text: q.question,
              options: q.options,
              correct_answer: q.correctAnswer,
              explanation: q.explanation,
              concept_tag: q.conceptTag,
              cultural_context: q.culturalContext || null,
            }));
            await supabase.from("questions").upsert(questionRows);
          }
        })(),
        1500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase quiz sync omitted:", err);
  }

  return record;
}

export function getStoredQuiz(quizId: string): StoredQuizRecord | null {
  return inMemoryQuizzes.get(quizId) || null;
}

export async function advanceRoomQuestion(roomCode: string): Promise<{
  success: boolean;
  isFinished: boolean;
  currentQuestionIndex: number;
}> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return { success: false, isFinished: false, currentQuestionIndex: 0 };

  const isPlaceholder =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

  const nextIndex = room.currentQuestionIndex + 1;
  if (nextIndex >= room.questions.length) {
    room.status = "finished";
    room.updatedAt = new Date().toISOString();
    room.lastSyncedAt = Date.now();

    try {
      if (!isPlaceholder) {
        await withTimeout(
          supabase
            .from("game_rooms")
            .update({
              status: "finished",
              updated_at: room.updatedAt,
            })
            .match({ room_code: roomCode }),
          1500
        );
      }
    } catch (err) {
      console.warn("[RoomStore] Supabase finish sync omitted:", err);
    }

    return { success: true, isFinished: true, currentQuestionIndex: room.currentQuestionIndex };
  }

  room.currentQuestionIndex = nextIndex;
  room.status = "active";
  room.questionStartTime = new Date().toISOString();
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  try {
    if (!isPlaceholder) {
      await withTimeout(
        supabase
          .from("game_rooms")
          .update({
            current_question_index: nextIndex,
            status: "active",
            question_start_time: room.questionStartTime,
            updated_at: room.updatedAt,
          })
          .match({ room_code: roomCode }),
        1500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase question advance sync omitted:", err);
  }

  return { success: true, isFinished: false, currentQuestionIndex: nextIndex };
}

export async function setRoomStatus(
  roomCode: string,
  status: GameRoomRecord["status"]
): Promise<boolean> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return false;
  room.status = status;
  if (status === "active") {
    room.questionStartTime = new Date().toISOString();
  }
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  try {
    const isPlaceholder =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

    if (!isPlaceholder) {
      const updatePayload: Record<string, unknown> = {
        status,
        updated_at: room.updatedAt,
      };
      if (status === "active") {
        updatePayload.question_start_time = room.questionStartTime;
      }
      await withTimeout(
        supabase
          .from("game_rooms")
          .update(updatePayload)
          .match({ room_code: roomCode }),
        1500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase status sync omitted:", err);
  }

  return true;
}

export async function getTeacherRoomDetails(roomCode: string) {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return null;

  const currentQ = room.questions[room.currentQuestionIndex] || null;
  const submissionsForCurrentQ = currentQ
    ? room.submissions.filter((s) => s.questionId === currentQ.id)
    : [];

  const optionCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  let correctCount = 0;
  for (const sub of submissionsForCurrentQ) {
    const opt = sub.selectedOption.toUpperCase();
    if (optionCounts[opt] !== undefined) {
      optionCounts[opt] += 1;
    }
    if (sub.isCorrect) {
      correctCount += 1;
    }
  }

  const playersList = Array.from(room.players.values());
  const leaderboard = [...playersList].sort((a, b) => b.score - a.score);

  return {
    roomId: room.id,
    roomCode: room.roomCode,
    quizId: room.quizId,
    hostName: room.hostName,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    currentQuestion: currentQ,
    stats: {
      submissionsCount: submissionsForCurrentQ.length,
      totalPlayers: playersList.length,
      correctCount,
      accuracyPercentage:
        submissionsForCurrentQ.length > 0
          ? Math.round((correctCount / submissionsForCurrentQ.length) * 100)
          : 0,
      optionCounts,
    },
    leaderboard: leaderboard.map((p, index) => ({
      rank: index + 1,
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak,
    })),
    players: playersList,
  };
}
