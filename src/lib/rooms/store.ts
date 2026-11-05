import {
  getSupabaseAdmin,
  isDatabaseEnabled,
} from "@/lib/supabase-admin";
import type { Question } from "@/lib/ai/prompts";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/code";
import {
  calculateResponseScore,
  deriveScoreBreakdown,
  evaluateQuizResponse,
  type ScoreBreakdown,
} from "@/lib/quiz/scoring";
import {
  calculateScoreWithPowerups,
  type PowerupId,
} from "@/lib/wayground/score-powerups";

// Guarded at every call site: when no service-role key is configured the app
// runs in stateless in-memory mode and this client is never used.
const supabase = getSupabaseAdmin();
function db() {
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required when Supabase is configured.");
  return supabase;
}

export type QuizDifficultyLevel = "mudah" | "sedang" | "sulit" | "campuran";

export interface PlayerRecord {
  id: string;
  roomCode: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  isConnected: boolean;
  lastSeenAt: string;
  status: "approved" | "pending" | "rejected";
  token: string;
  usedPowerups?: PowerupId[];
}

export interface LeaderboardScoreBreakdown extends ScoreBreakdown {
  total: number;
  correctAnswers: number;
  submissions: number;
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
  hostToken: string;
  hostName: string;
  status: "waiting" | "active" | "question_active" | "showing_leaderboard" | "finished";
  currentQuestionIndex: number;
  questionStartTime?: string;
  settings: {
    timePerQuestionSec: number;
    streakBonus: boolean;
    shuffleQuestions?: boolean;
    autoApproveStudents: boolean;
    difficulty?: QuizDifficultyLevel;
    questionsSnapshot?: Question[];
  };
  questions: Question[];
  players: Map<string, PlayerRecord>;
  submissions: SubmissionRecord[];
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: number;
}

function withTimeout<T>(promise: PromiseLike<T>, ms = 3500): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export const SEED_QUIZ_ID = "e1a84f3c-5026-4d2c-9749-34b865fa7b21";

export class PlayerIdentityConflictError extends Error {
  constructor() {
    super("Nama ini sudah dipakai di ruangan. Gunakan perangkat yang sama atau pilih nama lain.");
    this.name = "PlayerIdentityConflictError";
  }
}

function safeEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

function normalizeQuestions(input: Question[]): Question[] {
  return input.map((q, idx) => {
    const withShuffled = shuffleQuestionOptions(q);
    return {
      ...withShuffled,
      id: isValidUuid(withShuffled.id) ? withShuffled.id : crypto.randomUUID(),
      questionOrder: withShuffled.questionOrder ?? idx + 1,
    };
  });
}

async function loadQuestionsForQuiz(quizId: string): Promise<Question[]> {
  if (!isDatabaseEnabled() || !quizId || quizId === SEED_QUIZ_ID) return [];
  const { data, error } = await db().from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("question_order", { ascending: true });

  if (error || !data) return [];

  return data.map((q) => ({
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


const inMemoryRooms = new Map<string, GameRoomRecord>();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUuid(val?: string | null): boolean {
  return Boolean(val && UUID_REGEX.test(val));
}

export function generateRoomCode(): string {
  let pin = "";
  let attempts = 0;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
    // Cryptographically uniform 6-digit number in 100000 - 999999
    const val = 100000 + (buffer[0] % 900000);
    pin = val.toString();
    attempts++;
  } while (inMemoryRooms.has(pin) && attempts < 100);
  return pin;
}

export function shuffleQuestionOptions(q: Question): Question {
  const rawOptions = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
  if (rawOptions.length === 0) return q;

  const declaredCorrect = (q.correctAnswer || "").trim().toUpperCase();
  let foundCorrectIdx = rawOptions.findIndex((opt) => opt.isCorrect === true);
  if (foundCorrectIdx === -1 && declaredCorrect) {
    foundCorrectIdx = rawOptions.findIndex(
      (opt) => (opt.label || "").trim().toUpperCase() === declaredCorrect
    );
  }
  if (foundCorrectIdx === -1) {
    foundCorrectIdx = 0;
  }

  const options = rawOptions.map((opt, idx) => ({
    ...opt,
    isCorrect: idx === foundCorrectIdx,
  }));

  for (let i = options.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }

  const labels: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  let newCorrectAnswer: "A" | "B" | "C" | "D" = "A";
  const updatedOptions = options.map((opt, idx) => {
    const label = labels[idx] || "A";
    if (opt.isCorrect) {
      newCorrectAnswer = label;
    }
    return {
      ...opt,
      label,
    };
  });

  return {
    ...q,
    options: updatedOptions,
    correctAnswer: newCorrectAnswer,
  };
}

export async function createGameRoom(params: {
  quizId?: string;
  hostName?: string;
  settings?: {
    timePerQuestionSec?: number;
    streakBonus?: boolean;
    shuffleQuestions?: boolean;
    autoApproveStudents?: boolean;
    difficulty?: QuizDifficultyLevel;
  };
  questions?: Question[];
}): Promise<GameRoomRecord> {
  const roomCode = generateRoomCode();
  const roomId = crypto.randomUUID();
  const now = new Date().toISOString();

  const providedQuestions = params.questions ?? [];
  const validQuizId =
    isValidUuid(params.quizId) && params.quizId !== SEED_QUIZ_ID
      ? params.quizId!
      : null;
  let questions = normalizeQuestions(providedQuestions);
  let resolvedQuizId = validQuizId ?? "";

  // Only hydrate from the database if an explicit non-seed quizId was requested.
  if (questions.length === 0 && resolvedQuizId) {
    questions = await loadQuestionsForQuiz(resolvedQuizId);
  }

  if (params.settings?.shuffleQuestions && questions.length > 0) {
    questions = [...questions];
    for (let i = questions.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    questions = questions.map((q, idx) => ({
      ...q,
      questionOrder: idx + 1,
    }));
  }

  if (providedQuestions.length > 0) {
    const stored = await storeQuiz({
      id: validQuizId ?? crypto.randomUUID(),
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
    hostToken: crypto.randomUUID(),
    hostName: params.hostName?.trim() || "Guru",
    status: "waiting",
    currentQuestionIndex: 0,
    settings: {
      timePerQuestionSec: params.settings?.timePerQuestionSec || 20,
      streakBonus: params.settings?.streakBonus ?? true,
      shuffleQuestions: params.settings?.shuffleQuestions ?? false,
      autoApproveStudents: params.settings?.autoApproveStudents ?? true,
      difficulty: params.settings?.difficulty || "sedang",
      ...(questions.length > 0 ? { questionsSnapshot: questions } : {}),
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
    const isPlaceholder = !isDatabaseEnabled();

    if (!isPlaceholder) {
      await withTimeout(
        db().from("game_rooms").insert({
          id: roomId,
          room_code: roomCode,
          quiz_id: newRoom.quizId || null,
          host_token: newRoom.hostToken,
          host_name: newRoom.hostName,
          status: newRoom.status,
          current_question_index: 0,
          settings: newRoom.settings,
        }),
        2500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase sync omitted, in-memory active:", err);
  }

  return newRoom;
}

export async function ensureRoomLoaded(roomCode: string): Promise<GameRoomRecord | null> {
  const cached = inMemoryRooms.get(roomCode) || null;
  if (cached && cached.lastSyncedAt && Date.now() - cached.lastSyncedAt < 250) {
    return cached;
  }

  try {
    const isPlaceholder = !isDatabaseEnabled();

    if (isPlaceholder) return cached;

    const synced = await withTimeout(
      Promise.all([
        db().from("game_rooms").select("*").eq("room_code", roomCode).maybeSingle(),
        db().from("players").select("*").eq("room_code", roomCode),
        db().from("submissions").select("*").eq("room_code", roomCode),
      ]),
      2500
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
        const prev = playerMap.get(p.id);
        playerMap.set(p.id, {
          id: p.id,
          roomCode: p.room_code,
          nickname: p.nickname,
          avatar: p.avatar,
          score: typeof p.score === "number" ? Math.max(p.score, prev?.score ?? 0) : (prev?.score ?? 0),
          streak: typeof p.streak === "number" ? p.streak : (prev?.streak ?? 0),
          isConnected: p.is_connected,
          lastSeenAt: p.last_seen_at || new Date().toISOString(),
          status: (p.status as "approved" | "pending" | "rejected") || "approved",
          token: p.player_token || prev?.token || "",
          usedPowerups: prev?.usedPowerups || [],
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

    const activeQuizId =
      roomData.quiz_id && roomData.quiz_id !== SEED_QUIZ_ID
        ? String(roomData.quiz_id)
        : "";

    let questions: Question[] =
      cached && cached.quizId === activeQuizId && cached.questions.length > 0
        ? cached.questions
        : [];

    if (questions.length === 0 && activeQuizId) {
      const qRes = await withTimeout(
        db().from("questions")
          .select("*")
          .eq("quiz_id", activeQuizId)
          .order("question_order", { ascending: true }),
        2500
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

    const rawSettings = (roomData.settings || cached?.settings || {}) as Record<string, unknown>;
    if (questions.length === 0 && Array.isArray(rawSettings.questionsSnapshot)) {
      questions = rawSettings.questionsSnapshot as Question[];
    }

    const restoredRoom: GameRoomRecord = {
      id: roomData.id,
      roomCode: roomData.room_code,
      quizId: activeQuizId,
      hostToken: roomData.host_token || cached?.hostToken || "",
      hostName: roomData.host_name || cached?.hostName || "Guru",
      status: roomData.status || cached?.status || "waiting",
      currentQuestionIndex: roomData.current_question_index ?? cached?.currentQuestionIndex ?? 0,
      questionStartTime: roomData.question_start_time || cached?.questionStartTime || undefined,
      settings: {
        timePerQuestionSec: 20,
        streakBonus: true,
        shuffleQuestions: false,
        autoApproveStudents: true,
        difficulty: "sedang",
        ...rawSettings,
      },
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
  playerToken?: string;
}): Promise<{ player: PlayerRecord; room: GameRoomRecord } | null> {
  const roomCode = normalizeRoomCode(params.roomCode);
  if (!isValidRoomCode(roomCode)) return null;

  const room = await ensureRoomLoaded(roomCode);

  if (!room || room.status === "finished") {
    return null;
  }

  let existingPlayer: PlayerRecord | undefined;
  for (const p of room.players.values()) {
    if (p.nickname.toLowerCase() === params.nickname.trim().toLowerCase()) {
      existingPlayer = p;
      break;
    }
  }

  const initialStatus: "approved" | "pending" =
    room.settings.autoApproveStudents !== false ? "approved" : "pending";
  const db = getSupabaseAdmin();

  if (existingPlayer) {
    // A nickname alone must never grant control of an existing player record.
    // Reconnects must present the token saved on the original device.
    const keepsToken = Boolean(
      params.playerToken && safeEqual(existingPlayer.token, params.playerToken)
    );
    if (!keepsToken) {
      throw new PlayerIdentityConflictError();
    }
    existingPlayer.isConnected = true;
    existingPlayer.lastSeenAt = new Date().toISOString();
    if (existingPlayer.status === "rejected") {
      existingPlayer.status = initialStatus;
    }
    room.lastSyncedAt = Date.now();
    try {
      if (db) {
        await withTimeout(
          db
            .from("players")
            .update({
              player_token: existingPlayer.token,
              is_connected: true,
              last_seen_at: existingPlayer.lastSeenAt,
            })
            .match({ room_code: roomCode, id: existingPlayer.id }),
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
    roomCode,
    nickname: params.nickname.trim(),
    avatar: params.avatar || "garuda",
    score: 0,
    streak: 0,
    isConnected: true,
    lastSeenAt: new Date().toISOString(),
    status: initialStatus,
    token: crypto.randomUUID(),
  };

  room.players.set(playerId, newPlayer);
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  try {
    if (db) {
      const insertRes = await withTimeout(
        db.from("players").insert({
          id: playerId,
          room_code: roomCode,
          nickname: newPlayer.nickname,
          avatar: newPlayer.avatar,
          score: 0,
          streak: 0,
          is_connected: true,
          status: newPlayer.status,
          player_token: newPlayer.token,
        }),
        1500
      );

      if (insertRes?.error) {
        if (insertRes.error.code === "23505") {
          room.players.delete(playerId);
          throw new PlayerIdentityConflictError();
        }
        console.error("[RoomStore] Failed to insert player into Supabase:", insertRes.error.message);
      }
    }
  } catch (err) {
    if (err instanceof PlayerIdentityConflictError) throw err;
    console.warn("[RoomStore] Supabase player sync omitted:", err);
  }

  return { player: newPlayer, room };
}

export async function validateHostToken(
  roomCode: string,
  token: string | null
): Promise<boolean> {
  if (!token) return false;
  const room = await ensureRoomLoaded(roomCode);
  return Boolean(room && safeEqual(room.hostToken, token));
}

export async function validatePlayerToken(
  roomCode: string,
  playerId: string,
  token: string | null
): Promise<boolean> {
  if (!token || !playerId) return false;
  const room = await ensureRoomLoaded(roomCode);
  return Boolean(room && safeEqual(room.players.get(playerId)?.token, token));
}

export async function getGameRoomState(roomCode: string) {
  const room = await ensureRoomLoaded(roomCode);

  if (!room) {
    return null;
  }

  const playersList = Array.from(room.players.values());
  const leaderboard = [...playersList].sort((a, b) => b.score - a.score);

  const isQuestionVisible =
    room.status === "active" || room.status === "question_active";
  const currentQ =
    isQuestionVisible &&
    room.questions &&
    room.questions.length > room.currentQuestionIndex
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
      status: p.status || "approved",
    })),
    leaderboard: leaderboard
      .filter((p) => (p.status || "approved") === "approved")
      .map((p, index) => ({
        rank: index + 1,
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score,
        streak: p.streak,
      })),
    questionStartedAt: isQuestionVisible ? room.questionStartTime : undefined,
    serverTime: new Date().toISOString(),
    settings: {
      timePerQuestionSec: room.settings.timePerQuestionSec,
      streakBonus: room.settings.streakBonus,
      shuffleQuestions: room.settings.shuffleQuestions,
      autoApproveStudents: room.settings.autoApproveStudents,
      difficulty: room.settings.difficulty || "sedang",
    },
    totalSubmissionsCount: room.submissions.length,
    updatedAt: room.updatedAt,
  };
}

export type SubmissionFailureReason =
  | "not_found"
  | "unauthorized"
  | "inactive"
  | "not_approved"
  | "invalid_question"
  | "write_failed";

export type SubmissionResult =
  | {
      ok: true;
      submission: SubmissionRecord;
      updatedPlayer: PlayerRecord;
      correctAnswer: string;
      explanation: string;
      duplicate?: boolean;
      powerupApplied?: PowerupId | null;
    }
  | { ok: false; reason: SubmissionFailureReason };

export async function recordAnswerSubmission(params: {
  roomCode: string;
  playerId: string;
  playerToken?: string;
  hostBypass?: boolean;
  questionId: string;
  selectedOption: string;
  responseTimeMs: number;
  microFeedback?: string;
  powerup?: PowerupId;
}): Promise<SubmissionResult> {
  const room = await ensureRoomLoaded(params.roomCode);
  if (!room) return { ok: false, reason: "not_found" };

  const player = room.players.get(params.playerId);
  if (!player) return { ok: false, reason: "not_found" };

  if (!params.hostBypass && !safeEqual(player.token, params.playerToken)) {
    return { ok: false, reason: "unauthorized" };
  }
  if (player.status !== "approved") {
    return { ok: false, reason: "not_approved" };
  }
  if (room.status !== "active" && room.status !== "question_active") {
    return { ok: false, reason: "inactive" };
  }

  const question = room.questions[room.currentQuestionIndex];
  if (!question || question.id !== params.questionId) {
    return { ok: false, reason: "invalid_question" };
  }

  const selectedOption = params.selectedOption.trim().toUpperCase();
  if (!["A", "B", "C", "D"].includes(selectedOption)) {
    return { ok: false, reason: "invalid_question" };
  }

  // Idempotency: a player may submit at most once per question.
  const duplicate = room.submissions.find(
    (s) => s.playerId === player.id && s.questionId === question.id
  );
  if (duplicate) {
    return {
      ok: true,
      duplicate: true,
      submission: duplicate,
      updatedPlayer: player,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    };
  }

  const isCorrect = evaluateQuizResponse(question, selectedOption);
  const timeLimitMs = (room.settings.timePerQuestionSec || 20) * 1000;
  const serverStart = room.questionStartTime
    ? Date.parse(room.questionStartTime)
    : Number.NaN;
  const serverElapsed = Number.isFinite(serverStart)
    ? Math.max(0, Date.now() - serverStart)
    : null;

  const usedPowerups = player.usedPowerups || [];
  const validPowerup =
    params.powerup &&
    ["double_jeopardy", "time_freeze", "streak_booster", "immunity"].includes(params.powerup) &&
    !usedPowerups.includes(params.powerup)
      ? params.powerup
      : null;

  // Allow extra grace when time_freeze powerup is active
  const graceMs = validPowerup === "time_freeze" ? 10_000 : 1500;
  if (
    !params.hostBypass &&
    serverElapsed !== null &&
    serverElapsed > timeLimitMs + graceMs
  ) {
    return { ok: false, reason: "inactive" };
  }

  const responseTimeMs = Math.max(
    0,
    Math.min(
      params.hostBypass ? params.responseTimeMs : serverElapsed ?? params.responseTimeMs,
      120_000
    )
  );

  let scoreAwarded = 0;
  let nextStreak = isCorrect ? player.streak + 1 : 0;

  if (validPowerup) {
    const powerupRes = calculateScoreWithPowerups({
      isCorrect,
      timeTakenMs: responseTimeMs,
      totalTimeMs: timeLimitMs,
      currentStreak: player.streak,
      powerups: [{ id: validPowerup }],
    });
    scoreAwarded = powerupRes.total;
    nextStreak = powerupRes.newStreak;
    player.usedPowerups = [...usedPowerups, validPowerup];
  } else {
    const plainRes = calculateResponseScore({
      isCorrect,
      timeTakenMs: responseTimeMs,
      totalTimeMs: timeLimitMs,
      currentStreak: player.streak,
      streakBonusEnabled: room.settings.streakBonus,
    });
    scoreAwarded = plainRes.total;
    nextStreak = plainRes.newStreak;
  }

  const submission: SubmissionRecord = {
    id: crypto.randomUUID(),
    roomCode: params.roomCode,
    playerId: player.id,
    questionId: question.id,
    selectedOption,
    isCorrect,
    responseTimeMs,
    scoreAwarded,
    microFeedback: params.microFeedback,
    createdAt: new Date().toISOString(),
  };

  const db = getSupabaseAdmin();
  if (db) {
    let { error: insertError } = await db.from("submissions").insert({
      id: submission.id,
      room_code: params.roomCode,
      player_id: player.id,
      question_id: question.id,
      selected_option: selectedOption,
      is_correct: isCorrect,
      response_time_ms: responseTimeMs,
      score_awarded: scoreAwarded,
      micro_feedback: params.microFeedback || null,
    });

    // If the question row was not yet flushed to public.questions, retry with question_id: null
    if (insertError && insertError.code === "23503") {
      const retry = await db.from("submissions").insert({
        id: submission.id,
        room_code: params.roomCode,
        player_id: player.id,
        question_id: null,
        selected_option: selectedOption,
        is_correct: isCorrect,
        response_time_ms: responseTimeMs,
        score_awarded: scoreAwarded,
        micro_feedback: params.microFeedback || null,
      });
      insertError = retry.error;
    }

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingRow } = await db
          .from("submissions")
          .select("*")
          .eq("room_code", params.roomCode)
          .eq("player_id", player.id)
          .eq("question_id", question.id)
          .maybeSingle();

        if (existingRow) {
          const existing: SubmissionRecord = {
            id: existingRow.id,
            roomCode: existingRow.room_code,
            playerId: existingRow.player_id,
            questionId: existingRow.question_id || question.id,
            selectedOption: existingRow.selected_option,
            isCorrect: existingRow.is_correct,
            responseTimeMs: existingRow.response_time_ms,
            scoreAwarded: existingRow.score_awarded,
            microFeedback: existingRow.micro_feedback || undefined,
            createdAt: existingRow.created_at,
          };
          if (!room.submissions.some((s) => s.id === existing.id)) {
            room.submissions.push(existing);
          }
          return {
            ok: true,
            duplicate: true,
            submission: existing,
            updatedPlayer: player,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
          };
        }
      }
      console.error("[RoomStore] Failed to persist submission:", insertError.message);
      return { ok: false, reason: "write_failed" };
    }

    const nextScore = Math.max(0, player.score + scoreAwarded);
    player.score = nextScore;
    player.streak = nextStreak;

    const streakDelta = nextStreak - player.streak;
    const { data: scoreRows, error: scoreError } = await db.rpc(
      "apply_player_score",
      {
        p_room_code: params.roomCode,
        p_player_id: player.id,
        p_score_delta: scoreAwarded,
        p_streak_delta: isCorrect ? 1 : validPowerup === "immunity" ? 0 : -999999,
      }
    );

    if (!scoreError && Array.isArray(scoreRows) && scoreRows[0]) {
      const updated = scoreRows[0] as { score: number; streak: number };
      player.score = updated.score;
      player.streak = updated.streak;
    } else {
      void streakDelta;
      await db
        .from("players")
        .update({
          score: player.score,
          streak: player.streak,
          last_seen_at: new Date().toISOString(),
        })
        .match({ room_code: params.roomCode, id: player.id });
    }

    const nowIso = new Date().toISOString();
    room.updatedAt = nowIso;
    await withTimeout(
      db
        .from("game_rooms")
        .update({ updated_at: nowIso })
        .match({ room_code: params.roomCode }),
      1500
    );
  } else {
    player.score = Math.max(0, player.score + scoreAwarded);
    player.streak = nextStreak;
    room.updatedAt = new Date().toISOString();
  }

  room.submissions.push(submission);
  room.lastSyncedAt = Date.now();

  return {
    ok: true,
    submission,
    updatedPlayer: player,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    powerupApplied: validPowerup,
  };
}

export async function getRoomSubmissions(roomCode: string) {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return [];
  return room.submissions;
}

export async function getRoomQuestions(roomCode: string): Promise<Question[]> {
  const room = await ensureRoomLoaded(roomCode);
  return room ? room.questions : [];
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
  const normalizedQuestions = (quiz.questions || []).map((q, index) => {
    const shuffled = shuffleQuestionOptions(q);
    return {
      ...shuffled,
      id: isValidUuid(shuffled.id) ? shuffled.id : crypto.randomUUID(),
      questionOrder: shuffled.questionOrder || index + 1,
      conceptTag: shuffled.conceptTag || "Konsep inti",
      explanation: shuffled.explanation || "Penjelasan konsep inti.",
    };
  });

  const record: StoredQuizRecord = {
    ...quiz,
    id: normalizedQuizId,
    questions: normalizedQuestions,
    createdAt: new Date().toISOString(),
  };
  inMemoryQuizzes.set(record.id, record);

  try {
    const isPlaceholder = !isDatabaseEnabled();

    if (!isPlaceholder) {
      await withTimeout(
        (async () => {
          await db().from("quizzes").upsert({
            id: record.id,
            title: record.title,
            description: record.description || null,
            grade_level: record.targetGrade || "Fase D (SMP)",
            category: record.category || "Kurikulum Merdeka",
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
              explanation: q.explanation || "Penjelasan konsep inti.",
              concept_tag: q.conceptTag || "Konsep inti",
              cultural_context: q.culturalContext || null,
            }));
            await db().from("questions").upsert(questionRows);
          }
        })(),
        4500
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

/** Attach a freshly generated question set to a room that has not started yet. */
export async function setRoomQuestions(
  roomCode: string,
  input: {
    title: string;
    description?: string;
    questions: Question[];
    difficulty?: QuizDifficultyLevel;
    timePerQuestionSec?: number;
    streakBonus?: boolean;
  }
): Promise<Question[] | null> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room || room.status !== "waiting") return null;

  const stored = await storeQuiz({
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description ?? "",
    questions: input.questions,
  });

  room.questions = stored.questions;
  room.quizId = stored.id;
  room.currentQuestionIndex = 0;
  if (input.difficulty) {
    room.settings.difficulty = input.difficulty;
  }
  if (input.timePerQuestionSec) {
    room.settings.timePerQuestionSec = input.timePerQuestionSec;
  }
  if (typeof input.streakBonus === "boolean") {
    room.settings.streakBonus = input.streakBonus;
  }
  room.settings.questionsSnapshot = stored.questions;
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  try {
    if (isDatabaseEnabled()) {
      await withTimeout(
        db()
          .from("game_rooms")
          .update({
            quiz_id: stored.id,
            settings: room.settings,
            updated_at: room.updatedAt,
          })
          .match({ room_code: roomCode }),
        3500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase quiz attach omitted:", err);
  }

  return room.questions;
}

export async function updateRoomSettings(
  roomCode: string,
  partial: {
    timePerQuestionSec?: number;
    streakBonus?: boolean;
    shuffleQuestions?: boolean;
    autoApproveStudents?: boolean;
    difficulty?: QuizDifficultyLevel;
  }
): Promise<GameRoomRecord["settings"] | null> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return null;

  if (typeof partial.timePerQuestionSec === "number") {
    room.settings.timePerQuestionSec = Math.min(120, Math.max(5, partial.timePerQuestionSec));
  }
  if (typeof partial.streakBonus === "boolean") {
    room.settings.streakBonus = partial.streakBonus;
  }
  if (typeof partial.shuffleQuestions === "boolean") {
    room.settings.shuffleQuestions = partial.shuffleQuestions;
  }
  if (typeof partial.autoApproveStudents === "boolean") {
    room.settings.autoApproveStudents = partial.autoApproveStudents;
    if (partial.autoApproveStudents) {
      for (const player of room.players.values()) {
        if (player.status === "pending") {
          player.status = "approved";
        }
      }
    }
  }
  if (partial.difficulty) {
    room.settings.difficulty = partial.difficulty;
  }

  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  try {
    if (isDatabaseEnabled()) {
      await withTimeout(
        db()
          .from("game_rooms")
          .update({
            settings: room.settings,
            updated_at: room.updatedAt,
          })
          .match({ room_code: roomCode }),
        2500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] updateRoomSettings sync omitted:", err);
  }

  return room.settings;
}

export interface ActiveRoomSummary {
  roomCode: string;
  hostName: string;
  status: GameRoomRecord["status"];
  totalQuestions: number;
  playerCount: number;
  difficulty: QuizDifficultyLevel;
  updatedAt: string;
}

export async function listActiveRooms(): Promise<ActiveRoomSummary[]> {
  const map = new Map<string, ActiveRoomSummary>();

  for (const room of inMemoryRooms.values()) {
    if (room.status !== "finished") {
      const approvedCount = Array.from(room.players.values()).filter(
        (p) => (p.status || "approved") === "approved"
      ).length;
      map.set(room.roomCode, {
        roomCode: room.roomCode,
        hostName: room.hostName,
        status: room.status,
        totalQuestions: room.questions.length,
        playerCount: approvedCount,
        difficulty: room.settings.difficulty || "sedang",
        updatedAt: room.updatedAt,
      });
    }
  }

  try {
    if (isDatabaseEnabled()) {
      const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const res = await withTimeout(
        db()
          .from("game_rooms")
          .select("room_code, host_name, status, quiz_id, settings, updated_at")
          .neq("status", "finished")
          .gte("updated_at", cutoff)
          .order("updated_at", { ascending: false })
          .limit(12),
        2000
      );
      if (res?.data) {
        for (const r of res.data) {
          if (!map.has(r.room_code)) {
            const rawSettings = (r.settings || {}) as Record<string, unknown>;
            const snapshot = Array.isArray(rawSettings.questionsSnapshot)
              ? rawSettings.questionsSnapshot.length
              : 0;
            map.set(r.room_code, {
              roomCode: r.room_code,
              hostName: r.host_name || "Guru",
              status: r.status || "waiting",
              totalQuestions: snapshot,
              playerCount: 0,
              difficulty: (rawSettings.difficulty as QuizDifficultyLevel) || "sedang",
              updatedAt: r.updated_at || new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[RoomStore] listActiveRooms query omitted:", err);
  }

  return Array.from(map.values()).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  );
}

export async function advanceRoomQuestion(roomCode: string): Promise<{
  success: boolean;
  isFinished: boolean;
  currentQuestionIndex: number;
}> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) {
    return { success: false, isFinished: false, currentQuestionIndex: 0 };
  }
  const isPlaceholder = !isDatabaseEnabled();

  const nextIndex = room.currentQuestionIndex + 1;
  if (nextIndex >= room.questions.length) {
    room.status = "finished";
    room.updatedAt = new Date().toISOString();
    room.lastSyncedAt = Date.now();

    try {
      if (!isPlaceholder) {
        await withTimeout(
          db().from("game_rooms")
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
        db().from("game_rooms")
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
    const isPlaceholder = !isDatabaseEnabled();

    if (!isPlaceholder) {
      const updatePayload: Record<string, unknown> = {
        status,
        updated_at: room.updatedAt,
      };
      if (status === "active") {
        updatePayload.question_start_time = room.questionStartTime;
      }
      await withTimeout(
        db().from("game_rooms")
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

  const currentQ =
    room.questions.length > 0
      ? room.questions[room.currentQuestionIndex] || null
      : null;
  const submissionsForCurrentQ = currentQ
    ? room.submissions.filter(
        (s) =>
          s.questionId === currentQ.id ||
          (!s.questionId && room.currentQuestionIndex === 0)
      )
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

  const playersList = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    roomCode: p.roomCode,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    streak: p.streak,
    isConnected: p.isConnected,
    lastSeenAt: p.lastSeenAt,
    status: p.status || "approved",
  }));
  const approvedList = playersList.filter((p) => p.status === "approved");
  const pendingList = playersList.filter((p) => p.status === "pending");
  const leaderboard = [...approvedList].sort((a, b) => b.score - a.score);

  const timeLimitMs = (room.settings.timePerQuestionSec || 20) * 1000;
  const breakdownByPlayer = new Map<string, LeaderboardScoreBreakdown>();
  for (const submission of room.submissions) {
    const breakdown = deriveScoreBreakdown({
      isCorrect: submission.isCorrect,
      scoreAwarded: submission.scoreAwarded,
      timeTakenMs: submission.responseTimeMs,
      totalTimeMs: timeLimitMs,
    });
    const summary = breakdownByPlayer.get(submission.playerId) || {
      base: 0,
      timer: 0,
      streak: 0,
      total: 0,
      correctAnswers: 0,
      submissions: 0,
    };
    summary.base += breakdown.base;
    summary.timer += breakdown.timer;
    summary.streak += breakdown.streak;
    summary.total += submission.scoreAwarded;
    summary.correctAnswers += submission.isCorrect ? 1 : 0;
    summary.submissions += 1;
    breakdownByPlayer.set(submission.playerId, summary);
  }

  return {
    roomId: room.id,
    roomCode: room.roomCode,
    quizId: room.quizId,
    hostName: room.hostName,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    currentQuestion: currentQ,
    autoApproveStudents: room.settings.autoApproveStudents ?? true,
    settings: {
      timePerQuestionSec: room.settings.timePerQuestionSec || 20,
      streakBonus: room.settings.streakBonus ?? true,
      shuffleQuestions: room.settings.shuffleQuestions ?? false,
      autoApproveStudents: room.settings.autoApproveStudents ?? true,
      difficulty: room.settings.difficulty || "sedang",
    },
    stats: {
      submissionsCount: submissionsForCurrentQ.length,
      totalPlayers: approvedList.length,
      pendingCount: pendingList.length,
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
      breakdown: breakdownByPlayer.get(p.id) || {
        base: 0,
        timer: 0,
        streak: 0,
        total: 0,
        correctAnswers: 0,
        submissions: 0,
      },
    })),
    players: playersList,
    pendingPlayers: pendingList,
    approvedPlayers: approvedList,
  };
}

export async function approvePlayer(roomCode: string, playerId: string): Promise<boolean> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return false;
  const player = room.players.get(playerId);
  if (!player) return false;
  player.status = "approved";
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  const db = getSupabaseAdmin();
  if (db) {
    const { error } = await db
      .from("players")
      .update({ status: "approved" })
      .match({ room_code: roomCode, id: playerId });
    if (error) console.error("[RoomStore] approvePlayer sync failed:", error.message);
  }
  return true;
}

export async function rejectPlayer(roomCode: string, playerId: string): Promise<boolean> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return false;
  const player = room.players.get(playerId);
  if (!player) return false;
  player.status = "rejected";
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  const db = getSupabaseAdmin();
  if (db) {
    const { error } = await db
      .from("players")
      .update({ status: "rejected" })
      .match({ room_code: roomCode, id: playerId });
    if (error) console.error("[RoomStore] rejectPlayer sync failed:", error.message);
  }
  return true;
}

export async function approveAllPlayers(roomCode: string): Promise<number> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return 0;
  let count = 0;
  for (const player of room.players.values()) {
    if (player.status === "pending") {
      player.status = "approved";
      count++;
    }
  }
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  const db = getSupabaseAdmin();
  if (db && count > 0) {
    const { error } = await db
      .from("players")
      .update({ status: "approved" })
      .eq("room_code", roomCode)
      .eq("status", "pending");
    if (error) console.error("[RoomStore] approveAllPlayers sync failed:", error.message);
  }
  return count;
}

export async function toggleAutoApprove(roomCode: string, enabled?: boolean): Promise<boolean> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return false;
  const target = enabled !== undefined ? enabled : !(room.settings.autoApproveStudents ?? true);
  room.settings.autoApproveStudents = target;
  if (target) {
    for (const player of room.players.values()) {
      if (player.status === "pending") {
        player.status = "approved";
      }
    }
  }
  room.updatedAt = new Date().toISOString();
  room.lastSyncedAt = Date.now();

  const db = getSupabaseAdmin();
  if (db) {
    const { error } = await db
      .from("game_rooms")
      .update({ settings: room.settings, updated_at: room.updatedAt })
      .match({ room_code: roomCode });
    if (error) console.error("[RoomStore] toggleAutoApprove sync failed:", error.message);
  }
  return target;
}
