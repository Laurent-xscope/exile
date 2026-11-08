import {
  getSupabaseAdmin,
  isDatabaseEnabled,
} from "@/lib/supabase-admin";
import type { Question } from "@/types/assessment";
import {
  generateRandomRoomPin,
  isValidRoomCode,
  normalizeRoomCode,
} from "@/lib/rooms/code";
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
import {
  shuffleQuestionOptions,
  type QuizDifficultyLevel,
} from "@/lib/quiz/options";

// Guarded at every call site: when no service-role key is configured the app
// runs in stateless in-memory mode and this client is never used.
interface QuestionDbRow {
  id: string;
  question_order: number;
  question_text: string;
  options: Question["options"];
  correct_answer: Question["correctAnswer"];
  explanation: string;
  concept_tag: string;
  cultural_context?: string | null;
}

function db() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required when Supabase is configured.");
  return client;
}

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

export interface RoomChatMessage {
  id: string;
  roomCode: string;
  senderId: string;
  senderName: string;
  senderRole: "teacher" | "student";
  avatar?: string;
  text: string;
  createdAt: string;
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
  isAbandoned?: boolean;
  settings: {
    timePerQuestionSec: number;
    streakBonus: boolean;
    shuffleQuestions?: boolean;
    autoApproveStudents: boolean;
    difficulty?: QuizDifficultyLevel;
    questionsSnapshot?: Question[];
    abandoned?: boolean;
    chatMessages?: RoomChatMessage[];
  };
  questions: Question[];
  players: Map<string, PlayerRecord>;
  submissions: SubmissionRecord[];
  chatMessages?: RoomChatMessage[];
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

export const ROOM_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function getRoomLastActivityTime(room: {
  updatedAt?: string | null;
  createdAt?: string | null;
  players?: Map<string, { lastSeenAt?: string | null }> | Iterable<{ lastSeenAt?: string | null }> | null;
  submissions?: { createdAt?: string | null }[] | null;
}): number {
  let latest = Date.parse(room.updatedAt || room.createdAt || "") || 0;

  if (room.players) {
    const playersIterable =
      room.players instanceof Map
        ? room.players.values()
        : typeof (room.players as Iterable<{ lastSeenAt?: string | null }>)[Symbol.iterator] === "function"
        ? (room.players as Iterable<{ lastSeenAt?: string | null }>)
        : [];
    for (const p of playersIterable) {
      if (p?.lastSeenAt) {
        const t = Date.parse(p.lastSeenAt);
        if (Number.isFinite(t) && t > latest) {
          latest = t;
        }
      }
    }
  }

  if (Array.isArray(room.submissions)) {
    for (const s of room.submissions) {
      if (s?.createdAt) {
        const t = Date.parse(s.createdAt);
        if (Number.isFinite(t) && t > latest) {
          latest = t;
        }
      }
    }
  }

  return latest;
}

export function isIdleRoom(
  room: {
    status?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
    players?: Map<string, { lastSeenAt?: string | null }> | Iterable<{ lastSeenAt?: string | null }> | null;
    submissions?: { createdAt?: string | null }[] | null;
  },
  now: number = Date.now(),
  timeoutMs: number = ROOM_IDLE_TIMEOUT_MS
): boolean {
  if (room.status === "finished") {
    return false;
  }
  const lastActivity = getRoomLastActivityTime(room);
  if (!lastActivity) {
    return false;
  }
  return now - lastActivity >= timeoutMs;
}

let lastDbIdleSweep = 0;
let lastCloseIdleRoomsSweep = 0;
export const CLOSE_IDLE_ROOMS_THROTTLE_MS = 60_000;
const DB_IDLE_SWEEP_THROTTLE_MS = 10_000;

export async function closeIdleRooms(options?: {
  now?: number;
  forceDb?: boolean;
  force?: boolean;
}): Promise<string[]> {
  const now = options?.now ?? Date.now();
  const isForced = Boolean(options?.force || options?.forceDb || options?.now !== undefined);

  if (!isForced && now - lastCloseIdleRoomsSweep < CLOSE_IDLE_ROOMS_THROTTLE_MS) {
    return [];
  }

  lastCloseIdleRoomsSweep = now;
  const closedCodes: string[] = [];

  for (const [code, room] of inMemoryRooms.entries()) {
    if (room.status !== "finished" && isIdleRoom(room, now)) {
      room.status = "finished";
      const nowIso = new Date(now).toISOString();
      room.updatedAt = nowIso;
      room.lastSyncedAt = now;
      closedCodes.push(code);
    }
  }

  try {
    if (
      isDatabaseEnabled() &&
      (options?.forceDb || closedCodes.length > 0 || now - lastDbIdleSweep >= DB_IDLE_SWEEP_THROTTLE_MS)
    ) {
      lastDbIdleSweep = now;
      const cutoffIso = new Date(now - ROOM_IDLE_TIMEOUT_MS).toISOString();
      await withTimeout(
        db()
          .from("game_rooms")
          .update({
            status: "finished",
            updated_at: new Date(now).toISOString(),
          })
          .neq("status", "finished")
          .lt("updated_at", cutoffIso),
        2500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] closeIdleRooms Supabase sync omitted:", err);
  }

  if (closedCodes.length > 0) {
    for (const code of closedCodes) {
      invalidateGameRoomState(code);
    }
  }

  return closedCodes;
}

export async function recordHeartbeat(
  roomCode: string,
  options?: { playerId?: string }
): Promise<boolean> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room || room.status === "finished") return false;

  const nowIso = new Date().toISOString();
  room.updatedAt = nowIso;
  room.lastSyncedAt = Date.now();

  if (options?.playerId) {
    const player = room.players.get(options.playerId);
    if (player) {
      player.lastSeenAt = nowIso;
      player.isConnected = true;
    }
  }

  const client = getSupabaseAdmin();
  if (client) {
    try {
      await withTimeout(
        Promise.all([
          client
            .from("game_rooms")
            .update({ updated_at: nowIso })
            .match({ room_code: roomCode }),
          options?.playerId
            ? client
                .from("players")
                .update({ last_seen_at: nowIso, is_connected: true })
                .match({ room_code: roomCode, id: options.playerId })
            : Promise.resolve(null),
        ]),
        1500
      );
    } catch (err) {
      console.warn("[RoomStore] recordHeartbeat sync failed:", err);
    }
  }

  invalidateGameRoomState(roomCode);
  return true;
}

export function _resetInMemoryRoomsForTesting(): void {
  inMemoryRooms.clear();
  invalidateGameRoomState();
  lastCloseIdleRoomsSweep = 0;
  lastDbIdleSweep = 0;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(val?: string | null): boolean {
  return Boolean(val && UUID_REGEX.test(val));
}

function generateRoomCode(): string {
  let pin = "";
  let attempts = 0;
  do {
    pin = generateRandomRoomPin();
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
      chatMessages: [],
      ...(questions.length > 0 ? { questionsSnapshot: questions } : {}),
    },
    questions,
    players: new Map<string, PlayerRecord>(),
    submissions: [],
    chatMessages: [],
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: Date.now(),
  };

  inMemoryRooms.set(roomCode, newRoom);
  invalidateGameRoomState(roomCode);

  try {
    const isPlaceholder = !isDatabaseEnabled();

    if (!isPlaceholder) {
      let verifiedQuizId: string | null = null;
      if (newRoom.quizId) {
        const { data: qExists } = await db()
          .from("quizzes")
          .select("id")
          .eq("id", newRoom.quizId)
          .maybeSingle();
        if (qExists) verifiedQuizId = newRoom.quizId;
      }

      await withTimeout(
        db().from("game_rooms").insert({
          id: roomId,
          room_code: roomCode,
          quiz_id: verifiedQuizId,
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
  await closeIdleRooms();

  const cached = inMemoryRooms.get(roomCode) || null;
  if (cached && isIdleRoom(cached)) {
    cached.status = "finished";
    cached.updatedAt = new Date().toISOString();
    invalidateGameRoomState(roomCode);
  }

  if (cached && cached.lastSyncedAt && Date.now() - cached.lastSyncedAt < 750) {
    return cached;
  }

  try {
    const isPlaceholder = !isDatabaseEnabled();

    if (isPlaceholder) return cached;

    const knownQuizId =
      cached?.quizId && cached.quizId !== SEED_QUIZ_ID ? cached.quizId : null;
    const needParallelQuestions = Boolean(
      knownQuizId && (!cached?.questions || cached.questions.length === 0)
    );

    const synced = await withTimeout(
      Promise.all([
        db().from("game_rooms").select("*").eq("room_code", roomCode).maybeSingle(),
        db().from("players").select("*").eq("room_code", roomCode),
        db().from("submissions").select("*").eq("room_code", roomCode),
        needParallelQuestions && knownQuizId
          ? db()
              .from("questions")
              .select("*")
              .eq("quiz_id", knownQuizId)
              .order("question_order", { ascending: true })
          : Promise.resolve({ data: null, error: null }),
      ]),
      2500
    );

    if (!synced) return cached;

    const [
      { data: roomData, error: roomErr },
      { data: playersData },
      { data: subData },
      parallelQuestionsRes,
    ] = synced;

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

    if (
      questions.length === 0 &&
      activeQuizId &&
      knownQuizId === activeQuizId &&
      parallelQuestionsRes?.data &&
      Array.isArray(parallelQuestionsRes.data) &&
      parallelQuestionsRes.data.length > 0
    ) {
      questions = (parallelQuestionsRes.data as QuestionDbRow[]).map((q) => ({
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

    const restoredChatMessages: RoomChatMessage[] =
      cached?.chatMessages ||
      (Array.isArray(rawSettings.chatMessages) ? (rawSettings.chatMessages as RoomChatMessage[]) : []);

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
        chatMessages: restoredChatMessages,
      },
      questions,
      players: playerMap,
      submissions,
      chatMessages: restoredChatMessages,
      createdAt: roomData.created_at || cached?.createdAt || new Date().toISOString(),
      updatedAt: roomData.updated_at || cached?.updatedAt || new Date().toISOString(),
      lastSyncedAt: Date.now(),
    };

    if (restoredRoom.status !== "finished" && isIdleRoom(restoredRoom)) {
      restoredRoom.status = "finished";
      restoredRoom.updatedAt = new Date().toISOString();
      restoredRoom.lastSyncedAt = Date.now();
      if (isDatabaseEnabled()) {
        withTimeout(
          db()
            .from("game_rooms")
            .update({ status: "finished", updated_at: restoredRoom.updatedAt })
            .match({ room_code: roomCode }),
          1500
        ).catch(() => {});
      }
    }

    inMemoryRooms.set(roomCode, restoredRoom);
    return restoredRoom;
  } catch (err) {
    console.warn("[RoomStore] Failed to restore room from Supabase:", err);
    return cached;
  }
}

/**
 * Resolves a unique room nickname by appending (1), (2), etc. if the base nickname
 * is already taken by another player in the room (case-insensitive).
 */
export function resolveUniqueRoomNickname(
  rawNickname: string,
  existingNicknames: Iterable<string>
): string {
  const base = rawNickname.trim() || "Siswa";
  const taken = new Set<string>();

  for (const n of existingNicknames) {
    if (typeof n === "string") {
      taken.add(n.trim().toLowerCase());
    }
  }

  if (!taken.has(base.toLowerCase())) {
    return base;
  }

  let index = 1;
  while (taken.has(`${base}(${index})`.toLowerCase())) {
    index++;
  }

  return `${base}(${index})`;
}

export async function joinGameRoom(params: {
  roomCode: string;
  nickname: string;
  avatar?: string;
  playerToken?: string;
}): Promise<{ player: PlayerRecord; room: GameRoomRecord } | null> {
  const roomCode = normalizeRoomCode(params.roomCode);
  if (!isValidRoomCode(roomCode)) return null;

  await closeIdleRooms();

  const room = await ensureRoomLoaded(roomCode);

  if (!room || room.status === "finished") {
    return null;
  }

  const initialStatus: "approved" | "pending" =
    room.settings.autoApproveStudents !== false ? "approved" : "pending";
  const db = getSupabaseAdmin();

  // 1. Check if an existing player is reconnecting via valid playerToken
  let reconnectingPlayer: PlayerRecord | undefined;
  if (params.playerToken) {
    for (const p of room.players.values()) {
      if (safeEqual(p.token, params.playerToken)) {
        reconnectingPlayer = p;
        break;
      }
    }
  }

  if (reconnectingPlayer) {
    const nowIso = new Date().toISOString();
    reconnectingPlayer.isConnected = true;
    reconnectingPlayer.lastSeenAt = nowIso;
    if (reconnectingPlayer.status === "rejected") {
      reconnectingPlayer.status = initialStatus;
    }
    room.updatedAt = nowIso;
    room.lastSyncedAt = Date.now();
    try {
      if (db) {
        await withTimeout(
          Promise.all([
            db
              .from("players")
              .update({
                player_token: reconnectingPlayer.token,
                is_connected: true,
                last_seen_at: reconnectingPlayer.lastSeenAt,
              })
              .match({ room_code: roomCode, id: reconnectingPlayer.id }),
            db
              .from("game_rooms")
              .update({ updated_at: nowIso })
              .match({ room_code: roomCode }),
          ]),
          1500
        );
      }
    } catch (err) {
      console.warn("[RoomStore] Supabase player reconnect sync omitted:", err);
    }
    invalidateGameRoomState(roomCode);
    return { player: reconnectingPlayer, room };
  }

  // 2. New join: Auto-number duplicate nicknames so conflicts never error out
  const existingNicknames = Array.from(room.players.values()).map((p) => p.nickname);
  const resolvedNickname = resolveUniqueRoomNickname(params.nickname, existingNicknames);

  const playerId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const newPlayer: PlayerRecord = {
    id: playerId,
    roomCode,
    nickname: resolvedNickname,
    avatar: params.avatar || "garuda",
    score: 0,
    streak: 0,
    isConnected: true,
    lastSeenAt: nowIso,
    status: initialStatus,
    token: crypto.randomUUID(),
  };

  room.players.set(playerId, newPlayer);
  room.updatedAt = nowIso;
  room.lastSyncedAt = Date.now();

  try {
    if (db) {
      const insertResults = await withTimeout(
        Promise.all([
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
          db
            .from("game_rooms")
            .update({ updated_at: nowIso })
            .match({ room_code: roomCode }),
        ]),
        1500
      );

      const insertRes = insertResults ? insertResults[0] : null;
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

  invalidateGameRoomState(roomCode);
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

export type GameRoomPublicState = NonNullable<Awaited<ReturnType<typeof computeGameRoomState>>>;

interface InflightStateEntry {
  promise?: Promise<GameRoomPublicState | null>;
  resolvedAt?: number;
  data?: GameRoomPublicState | null;
}

const stateInflightMap = new Map<string, InflightStateEntry>();
const roomInvalidatedAt = new Map<string, number>();

export function invalidateGameRoomState(roomCode?: string): void {
  const now = Date.now();
  if (roomCode) {
    const code = normalizeRoomCode(roomCode);
    stateInflightMap.delete(code);
    roomInvalidatedAt.set(code, now);
  } else {
    stateInflightMap.clear();
    roomInvalidatedAt.clear();
  }
}

async function computeGameRoomState(roomCode: string) {
  await closeIdleRooms();
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
    chatMessages: room.chatMessages || room.settings?.chatMessages || [],
    isAbandoned: Boolean(room.isAbandoned || room.settings?.abandoned),
    updatedAt: room.updatedAt,
  };
}

export async function getGameRoomState(roomCode: string) {
  const code = normalizeRoomCode(roomCode);
  const now = Date.now();

  const existing = stateInflightMap.get(code);
  if (existing) {
    if (existing.data && existing.resolvedAt && now - existing.resolvedAt < 400) {
      return existing.data;
    }
    if (!existing.resolvedAt && existing.promise) {
      return existing.promise;
    }
  }

  const queryStartTime = now;

  const entry: InflightStateEntry = {};
  const promise: Promise<GameRoomPublicState | null> = (async () => {
    try {
      const state = await computeGameRoomState(code);
      const resolveTime = Date.now();
      const lastInvalidation = roomInvalidatedAt.get(code) || 0;

      if (lastInvalidation <= queryStartTime) {
        entry.resolvedAt = resolveTime;
        entry.data = state;
        stateInflightMap.set(code, entry);

        setTimeout(() => {
          const curr = stateInflightMap.get(code);
          if (curr && curr.resolvedAt === resolveTime) {
            stateInflightMap.delete(code);
          }
        }, 400).unref?.();
      } else {
        stateInflightMap.delete(code);
      }

      return state;
    } catch (err) {
      stateInflightMap.delete(code);
      throw err;
    }
  })();

  entry.promise = promise;
  stateInflightMap.set(code, entry);
  return promise;
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

  const rawTime =
    validPowerup === "time_freeze"
      ? 0
      : Math.max(
          0,
          Math.min(
            params.hostBypass ? params.responseTimeMs : serverElapsed ?? params.responseTimeMs,
            120_000
          )
        );
  const responseTimeMs = Number.isFinite(rawTime) ? rawTime : 3000;

  let scoreAwarded = 0;
  let nextStreak = isCorrect ? player.streak + 1 : 0;

  if (validPowerup) {
    const powerupRes = calculateScoreWithPowerups({
      isCorrect,
      timeTakenMs: responseTimeMs,
      totalTimeMs: timeLimitMs,
      currentStreak: player.streak,
      powerups: [{ id: validPowerup }],
      streakBonusEnabled: room.settings.streakBonus,
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

    const previousStreak = player.streak;
    const nextScore = Math.max(0, player.score + scoreAwarded);
    player.score = nextScore;
    player.streak = nextStreak;

    const streakDelta = isCorrect
      ? (validPowerup === "streak_booster" ? 2 : nextStreak - previousStreak)
      : (validPowerup === "immunity" ? 0 : -999999);

    const scoreRes = (await withTimeout(
      db.rpc("apply_player_score", {
        p_room_code: params.roomCode,
        p_player_id: player.id,
        p_score_delta: scoreAwarded,
        p_streak_delta: streakDelta,
      }),
      2000
    )) as { data: unknown; error: unknown } | null;
    const scoreRows = scoreRes?.data;
    const scoreError = scoreRes?.error;

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
    player.lastSeenAt = nowIso;
    room.updatedAt = nowIso;
    await withTimeout(
      db
        .from("game_rooms")
        .update({ updated_at: nowIso })
        .match({ room_code: params.roomCode }),
      1500
    );
  } else {
    const nowIso = new Date().toISOString();
    player.score = Math.max(0, player.score + scoreAwarded);
    player.streak = nextStreak;
    player.lastSeenAt = nowIso;
    room.updatedAt = nowIso;
  }

  room.submissions.push(submission);
  room.lastSyncedAt = Date.now();
  invalidateGameRoomState(params.roomCode);

  return {
    ok: true,
    submission,
    updatedPlayer: player,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    powerupApplied: validPowerup,
  };
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

  invalidateGameRoomState(roomCode);
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

  invalidateGameRoomState(roomCode);
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
  await closeIdleRooms();

  const map = new Map<string, ActiveRoomSummary>();

  for (const room of inMemoryRooms.values()) {
    if (room.status !== "finished" && !isIdleRoom(room)) {
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
      const cutoff = new Date(Date.now() - ROOM_IDLE_TIMEOUT_MS).toISOString();
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
  await closeIdleRooms();
  const room = await ensureRoomLoaded(roomCode);
  if (!room || room.status === "finished") {
    return {
      success: false,
      isFinished: true,
      currentQuestionIndex: room?.currentQuestionIndex ?? 0,
    };
  }
  const isPlaceholder = !isDatabaseEnabled();

  // If the room has not started yet, begin at question 0 instead of skipping to 1
  if (room.status === "waiting") {
    room.status = "active";
    room.currentQuestionIndex = 0;
    room.questionStartTime = new Date().toISOString();
    room.updatedAt = new Date().toISOString();
    room.lastSyncedAt = Date.now();

    try {
      if (!isPlaceholder) {
        await withTimeout(
          db()
            .from("game_rooms")
            .update({
              status: "active",
              current_question_index: 0,
              updated_at: room.updatedAt,
            })
            .match({ room_code: roomCode }),
          1500
        );
      }
    } catch (err) {
      console.warn("[RoomStore] Supabase start sync omitted:", err);
    }

    invalidateGameRoomState(roomCode);
    return { success: true, isFinished: false, currentQuestionIndex: 0 };
  }

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

    invalidateGameRoomState(roomCode);
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

  invalidateGameRoomState(roomCode);
  return { success: true, isFinished: false, currentQuestionIndex: nextIndex };
}

export async function setRoomStatus(
  roomCode: string,
  status: GameRoomRecord["status"]
): Promise<boolean> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return false;
  room.status = status;
  if (status === "active" || status === "question_active") {
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
      if (status === "active" || status === "question_active") {
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

  invalidateGameRoomState(roomCode);
  return true;
}

export async function abandonRoom(roomCode: string): Promise<boolean> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return false;
  room.status = "finished";
  room.isAbandoned = true;
  if (!room.settings) {
    room.settings = {
      timePerQuestionSec: 20,
      streakBonus: true,
      autoApproveStudents: true,
    };
  }
  room.settings.abandoned = true;
  const nowIso = new Date().toISOString();
  room.updatedAt = nowIso;
  room.lastSyncedAt = Date.now();

  try {
    if (isDatabaseEnabled()) {
      await withTimeout(
        db()
          .from("game_rooms")
          .update({
            status: "finished",
            updated_at: nowIso,
            settings: room.settings,
          })
          .match({ room_code: roomCode }),
        1500
      );
    }
  } catch (err) {
    console.warn("[RoomStore] Supabase abandon sync omitted:", err);
  }

  invalidateGameRoomState(roomCode);
  return true;
}

export async function getTeacherRoomDetails(roomCode: string) {
  await closeIdleRooms();
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
    chatMessages: room.chatMessages || room.settings?.chatMessages || [],
    isAbandoned: Boolean(room.isAbandoned || room.settings?.abandoned),
  };
}

export async function approvePlayer(roomCode: string, playerId: string): Promise<boolean> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return false;
  const player = room.players.get(playerId);
  if (!player) return false;
  player.status = "approved";
  const nowIso = new Date().toISOString();
  room.updatedAt = nowIso;
  room.lastSyncedAt = Date.now();

  const db = getSupabaseAdmin();
  if (db) {
    try {
      await withTimeout(
        Promise.all([
          db
            .from("players")
            .update({ status: "approved" })
            .match({ room_code: roomCode, id: playerId }),
          db
            .from("game_rooms")
            .update({ updated_at: nowIso })
            .match({ room_code: roomCode }),
        ]),
        1500
      );
    } catch (err) {
      console.error("[RoomStore] approvePlayer sync failed:", err);
    }
  }
  invalidateGameRoomState(roomCode);
  return true;
}

export async function rejectPlayer(roomCode: string, playerId: string): Promise<boolean> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return false;
  const player = room.players.get(playerId);
  if (!player) return false;
  player.status = "rejected";
  const nowIso = new Date().toISOString();
  room.updatedAt = nowIso;
  room.lastSyncedAt = Date.now();

  const db = getSupabaseAdmin();
  if (db) {
    try {
      await withTimeout(
        Promise.all([
          db
            .from("players")
            .update({ status: "rejected" })
            .match({ room_code: roomCode, id: playerId }),
          db
            .from("game_rooms")
            .update({ updated_at: nowIso })
            .match({ room_code: roomCode }),
        ]),
        1500
      );
    } catch (err) {
      console.error("[RoomStore] rejectPlayer sync failed:", err);
    }
  }
  invalidateGameRoomState(roomCode);
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
  const nowIso = new Date().toISOString();
  room.updatedAt = nowIso;
  room.lastSyncedAt = Date.now();

  const dbAdmin = getSupabaseAdmin();
  if (dbAdmin) {
    try {
      await withTimeout(
        Promise.all([
          count > 0
            ? dbAdmin
                .from("players")
                .update({ status: "approved" })
                .eq("room_code", roomCode)
                .eq("status", "pending")
            : Promise.resolve(null),
          dbAdmin
            .from("game_rooms")
            .update({ updated_at: nowIso })
            .match({ room_code: roomCode }),
        ]),
        1500
      );
    } catch (err) {
      console.error("[RoomStore] approveAllPlayers sync failed:", err);
    }
  }
  invalidateGameRoomState(roomCode);
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

  const dbAdmin = getSupabaseAdmin();
  if (dbAdmin) {
    const { error } = await dbAdmin
      .from("game_rooms")
      .update({ settings: room.settings, updated_at: room.updatedAt })
      .match({ room_code: roomCode });
    if (error) console.error("[RoomStore] toggleAutoApprove sync failed:", error.message);
  }
  invalidateGameRoomState(roomCode);
  return target;
}

export async function addRoomChatMessage(params: {
  roomCode: string;
  senderId: string;
  senderName: string;
  senderRole: "teacher" | "student";
  avatar?: string;
  text: string;
}): Promise<RoomChatMessage | null> {
  const room = await ensureRoomLoaded(params.roomCode);
  if (!room) return null;

  const trimmedText = params.text.trim();
  if (!trimmedText) return null;

  const message: RoomChatMessage = {
    id: crypto.randomUUID(),
    roomCode: room.roomCode,
    senderId: params.senderId,
    senderName: params.senderName.trim() || (params.senderRole === "teacher" ? "Guru" : "Siswa"),
    senderRole: params.senderRole,
    avatar: params.avatar,
    text: trimmedText.slice(0, 500),
    createdAt: new Date().toISOString(),
  };

  if (!room.chatMessages) {
    room.chatMessages = Array.isArray(room.settings?.chatMessages) ? [...room.settings.chatMessages] : [];
  }
  room.chatMessages.push(message);
  if (room.chatMessages.length > 100) {
    room.chatMessages = room.chatMessages.slice(-100);
  }

  if (!room.settings) {
    room.settings = {
      timePerQuestionSec: 20,
      streakBonus: true,
      autoApproveStudents: true,
    };
  }
  room.settings.chatMessages = room.chatMessages;
  room.updatedAt = message.createdAt;
  room.lastSyncedAt = Date.now();

  const client = getSupabaseAdmin();
  if (client) {
    try {
      await withTimeout(
        client
          .from("game_rooms")
          .update({
            settings: room.settings,
            updated_at: room.updatedAt,
          })
          .match({ room_code: room.roomCode }),
        1500
      );
    } catch (err) {
      console.warn("[RoomStore] addRoomChatMessage Supabase sync omitted:", err);
    }
  }

  invalidateGameRoomState(params.roomCode);
  return message;
}

export async function getRoomChatMessages(roomCode: string): Promise<RoomChatMessage[]> {
  const room = await ensureRoomLoaded(roomCode);
  if (!room) return [];
  if (!room.chatMessages) {
    room.chatMessages = Array.isArray(room.settings?.chatMessages) ? room.settings.chatMessages : [];
  }
  return room.chatMessages;
}

