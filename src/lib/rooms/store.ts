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
  players: Map<string, PlayerRecord>; // keyed by playerId
  submissions: SubmissionRecord[];
  createdAt: string;
  updatedAt: string;
}

// Pre-loaded seed questions for demo & fallback
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

// In-Memory Global Rooms Registry
const inMemoryRooms = new Map<string, GameRoomRecord>();

// Pre-initialize demo room 849201 as specified in hackathon README
function initDemoRoom() {
  const demoPin = "849201";
  if (!inMemoryRooms.has(demoPin)) {
    const demoPlayers = new Map<string, PlayerRecord>();
    const p1: PlayerRecord = {
      id: "b1111111-1111-1111-1111-111111111111",
      roomCode: demoPin,
      nickname: "Wayan Satria",
      avatar: "garuda",
      score: 940,
      streak: 2,
      isConnected: true,
      lastSeenAt: new Date().toISOString(),
    };
    const p2: PlayerRecord = {
      id: "b2222222-2222-2222-2222-222222222222",
      roomCode: demoPin,
      nickname: "Made Ayu",
      avatar: "barong",
      score: 880,
      streak: 1,
      isConnected: true,
      lastSeenAt: new Date().toISOString(),
    };
    const p3: PlayerRecord = {
      id: "b3333333-3333-3333-3333-333333333333",
      roomCode: demoPin,
      nickname: "Nyoman Surya",
      avatar: "dragon",
      score: 790,
      streak: 1,
      isConnected: true,
      lastSeenAt: new Date().toISOString(),
    };
    const p4: PlayerRecord = {
      id: "b4444444-4444-4444-4444-444444444444",
      roomCode: demoPin,
      nickname: "Ketut Lestari",
      avatar: "lion",
      score: 650,
      streak: 0,
      isConnected: true,
      lastSeenAt: new Date().toISOString(),
    };

    demoPlayers.set(p1.id, p1);
    demoPlayers.set(p2.id, p2);
    demoPlayers.set(p3.id, p3);
    demoPlayers.set(p4.id, p4);

    const demoSubmissions: SubmissionRecord[] = [
      {
        id: "s1",
        roomCode: demoPin,
        playerId: p1.id,
        questionId: SEED_BALI_QUESTIONS[0].id || "q1",
        selectedOption: "A",
        isCorrect: true,
        responseTimeMs: 3200,
        scoreAwarded: 940,
        microFeedback: "Bagus pisan! Kruna Alus Sor (titiang) tepat kaanggen.",
        createdAt: new Date().toISOString(),
      },
      {
        id: "s2",
        roomCode: demoPin,
        playerId: p2.id,
        questionId: SEED_BALI_QUESTIONS[0].id || "q1",
        selectedOption: "A",
        isCorrect: true,
        responseTimeMs: 4100,
        scoreAwarded: 880,
        microFeedback: "Tepat sekali!",
        createdAt: new Date().toISOString(),
      },
      {
        id: "s3",
        roomCode: demoPin,
        playerId: p3.id,
        questionId: SEED_BALI_QUESTIONS[0].id || "q1",
        selectedOption: "A",
        isCorrect: true,
        responseTimeMs: 5500,
        scoreAwarded: 790,
        microFeedback: "Tepat!",
        createdAt: new Date().toISOString(),
      },
      {
        id: "s4",
        roomCode: demoPin,
        playerId: p4.id,
        questionId: SEED_BALI_QUESTIONS[0].id || "q1",
        selectedOption: "B",
        isCorrect: false,
        responseTimeMs: 7200,
        scoreAwarded: 0,
        microFeedback: "Kata icang adalah basa andap untuk teman sebaya, bukan guru.",
        createdAt: new Date().toISOString(),
      },
    ];

    inMemoryRooms.set(demoPin, {
      id: "demo-room-849201",
      roomCode: demoPin,
      quizId: "e1a84f3c-5026-4d2c-9749-34b865fa7b21",
      hostName: "Guru Sujana",
      status: "active",
      currentQuestionIndex: 0,
      questionStartTime: new Date().toISOString(),
      settings: {
        timePerQuestionSec: 20,
        streakBonus: true,
      },
      questions: SEED_BALI_QUESTIONS,
      players: demoPlayers,
      submissions: demoSubmissions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

initDemoRoom();

/**
 * Generate a random 6-digit PIN that is not currently in use
 */
export function generateRoomCode(): string {
  let pin = "";
  let attempts = 0;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
  } while (inMemoryRooms.has(pin) && attempts < 100);
  return pin;
}

/**
 * Create a new Game Room
 */
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

  const questions =
    params.questions && params.questions.length > 0
      ? params.questions
      : SEED_BALI_QUESTIONS;

  const newRoom: GameRoomRecord = {
    id: roomId,
    roomCode,
    quizId: params.quizId || "e1a84f3c-5026-4d2c-9749-34b865fa7b21",
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
  };

  inMemoryRooms.set(roomCode, newRoom);

  // Asynchronously mirror to Supabase (best-effort, non-blocking)
  try {
    const isPlaceholder =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

    if (!isPlaceholder) {
      await supabase.from("game_rooms").insert({
        id: roomId,
        room_code: roomCode,
        quiz_id: newRoom.quizId,
        host_name: newRoom.hostName,
        status: newRoom.status,
        current_question_index: 0,
        settings: newRoom.settings,
      });
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase sync omitted, in-memory active:", err);
  }

  return newRoom;
}

/**
 * Join an existing Game Room
 */
export async function joinGameRoom(params: {
  roomCode: string;
  nickname: string;
  avatar?: string;
}): Promise<{ player: PlayerRecord; room: GameRoomRecord } | null> {
  initDemoRoom();
  const room = inMemoryRooms.get(params.roomCode);

  if (!room) {
    // Attempt to lookup in Supabase
    try {
      const { data } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", params.roomCode)
        .single();

      if (data) {
        const restoredRoom: GameRoomRecord = {
          id: data.id,
          roomCode: data.room_code,
          quizId: data.quiz_id || "e1a84f3c-5026-4d2c-9749-34b865fa7b21",
          hostName: data.host_name || "Guru",
          status: data.status || "waiting",
          currentQuestionIndex: data.current_question_index || 0,
          settings: data.settings || { timePerQuestionSec: 20, streakBonus: true },
          questions: SEED_BALI_QUESTIONS,
          players: new Map(),
          submissions: [],
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
        };
        inMemoryRooms.set(params.roomCode, restoredRoom);
        return joinGameRoom(params);
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Check if player with same nickname already exists
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

  // Asynchronously mirror player to Supabase
  try {
    const isPlaceholder =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder");

    if (!isPlaceholder) {
      await supabase.from("players").insert({
        id: playerId,
        room_code: params.roomCode,
        nickname: newPlayer.nickname,
        avatar: newPlayer.avatar,
        score: 0,
        streak: 0,
        is_connected: true,
      });
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase player sync omitted:", err);
  }

  return { player: newPlayer, room };
}

/**
 * Get Room State & Leaderboard
 */
export async function getGameRoomState(roomCode: string) {
  initDemoRoom();
  const room = inMemoryRooms.get(roomCode);

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
          options: currentQ.options.map((opt) => ({
            label: opt.label,
            text: opt.text,
          })), // Mask isCorrect and distractorRationale from live client to prevent client inspection cheating
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
  };
}

/**
 * Submit Player Answer & Compute Gamified Score
 */
export function recordAnswerSubmission(params: {
  roomCode: string;
  playerId: string;
  questionId: string;
  selectedOption: string;
  responseTimeMs: number;
  microFeedback?: string;
}) {
  const room = inMemoryRooms.get(params.roomCode);
  if (!room) return null;

  const player = room.players.get(params.playerId);
  if (!player) return null;

  const question = room.questions.find(
    (q) => q.id === params.questionId || !params.questionId
  );
  const isCorrect = question
    ? question.correctAnswer === params.selectedOption.toUpperCase()
    : false;

  // Gamification formula: Max 1000 pts per question, decay with time, streak multiplier
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

  const submission: SubmissionRecord = {
    id: crypto.randomUUID(),
    roomCode: params.roomCode,
    playerId: params.playerId,
    questionId: params.questionId,
    selectedOption: params.selectedOption,
    isCorrect,
    responseTimeMs: params.responseTimeMs,
    scoreAwarded,
    microFeedback: params.microFeedback,
    createdAt: new Date().toISOString(),
  };

  room.submissions.push(submission);
  return { submission, updatedPlayer: player };
}

/**
 * Get Room Submissions for Diagnostic Clustering
 */
export function getRoomSubmissions(roomCode: string) {
  const room = inMemoryRooms.get(roomCode);
  if (!room) return [];
  return room.submissions;
}

/**
 * Get Room Questions
 */
export function getRoomQuestions(roomCode: string): Question[] {
  const room = inMemoryRooms.get(roomCode);
  return room ? room.questions : SEED_BALI_QUESTIONS;
}
