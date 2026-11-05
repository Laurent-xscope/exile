import { SAMPLE_QUESTIONS } from "./fixtures";
import { beforeAll, describe, expect, test } from "bun:test";

let store!: typeof import("@/lib/rooms/store");

beforeAll(async () => {
  // Force the room store's in-memory path so the integration test never
  // touches a configured Supabase project.
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    delete process.env[key];
  }

  store = await import("@/lib/rooms/store");
});

describe("room submission scoring", () => {
  test("scores live submissions, resets streaks, and exposes the leaderboard breakdown", async () => {
    const room = await store.createGameRoom({
      questions: SAMPLE_QUESTIONS.slice(0, 3),
      settings: {
        timePerQuestionSec: 30,
        streakBonus: true,
        autoApproveStudents: true,
      },
    });
    const joined = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Siswa Uji",
    });

    expect(joined).not.toBeNull();
    if (!joined) throw new Error("Room join failed");

    await store.setRoomStatus(room.roomCode, "active");

    const firstQuestion = room.questions[0];
    const first = await store.recordAnswerSubmission({
      roomCode: room.roomCode,
      playerId: joined.player.id,
      hostBypass: true,
      questionId: firstQuestion.id || "",
      selectedOption: firstQuestion.correctAnswer,
      responseTimeMs: 2500,
    });

    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(`First submission failed: ${first.reason}`);
    expect(first.submission.scoreAwarded).toBe(967);
    expect(first.updatedPlayer.score).toBe(967);
    expect(first.updatedPlayer.streak).toBe(1);

    const duplicate = await store.recordAnswerSubmission({
      roomCode: room.roomCode,
      playerId: joined.player.id,
      hostBypass: true,
      questionId: firstQuestion.id || "",
      selectedOption: firstQuestion.correctAnswer,
      responseTimeMs: 2500,
    });

    expect(duplicate.ok).toBe(true);
    if (!duplicate.ok) throw new Error("Duplicate submission failed");
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.updatedPlayer.score).toBe(967);

    await store.advanceRoomQuestion(room.roomCode);
    const secondQuestion = room.questions[1];
    const second = await store.recordAnswerSubmission({
      roomCode: room.roomCode,
      playerId: joined.player.id,
      hostBypass: true,
      questionId: secondQuestion.id || "",
      selectedOption: secondQuestion.correctAnswer,
      responseTimeMs: 2500,
    });

    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error(`Second submission failed: ${second.reason}`);
    expect(second.submission.scoreAwarded).toBe(1067);
    expect(second.updatedPlayer.score).toBe(2034);
    expect(second.updatedPlayer.streak).toBe(2);

    await store.advanceRoomQuestion(room.roomCode);
    const thirdQuestion = room.questions[2];
    const wrongOption = ["A", "B", "C", "D"].find(
      (label) => label !== thirdQuestion.correctAnswer
    );
    const third = await store.recordAnswerSubmission({
      roomCode: room.roomCode,
      playerId: joined.player.id,
      hostBypass: true,
      questionId: thirdQuestion.id || "",
      selectedOption: wrongOption || "A",
      responseTimeMs: 1200,
    });

    expect(third.ok).toBe(true);
    if (!third.ok) throw new Error(`Third submission failed: ${third.reason}`);
    expect(third.submission.scoreAwarded).toBe(0);
    expect(third.updatedPlayer.score).toBe(2034);
    expect(third.updatedPlayer.streak).toBe(0);

    const details = await store.getTeacherRoomDetails(room.roomCode);
    expect(details).not.toBeNull();
    const entry = details?.leaderboard[0];

    expect(entry?.score).toBe(2034);
    expect(entry?.breakdown).toEqual({
      base: 1200,
      timer: 734,
      streak: 100,
      total: 2034,
      correctAnswers: 2,
      submissions: 3,
    });
  });
});
