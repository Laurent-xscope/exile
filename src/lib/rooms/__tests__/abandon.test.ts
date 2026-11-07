import { beforeAll, beforeEach, describe, expect, test } from "bun:test";

let store!: typeof import("@/lib/rooms/store");

beforeAll(async () => {
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    delete process.env[key];
  }

  store = await import("@/lib/rooms/store");
});

beforeEach(() => {
  store._resetInMemoryRoomsForTesting();
});

describe("abandonRoom and individual student approval", () => {
  test("abandonRoom marks room as finished and abandoned", async () => {
    const room = await store.createGameRoom({
      hostName: "Bu Guru",
      settings: {
        autoApproveStudents: false,
        streakBonus: true,
        timePerQuestionSec: 20,
      },
    });

    expect(room.status).toBe("waiting");
    expect(room.isAbandoned).toBeFalsy();

    const ok = await store.abandonRoom(room.roomCode);
    expect(ok).toBe(true);

    const state = await store.getGameRoomState(room.roomCode);
    expect(state).not.toBeNull();
    expect(state?.status).toBe("finished");
    expect(state?.isAbandoned).toBe(true);

    const details = await store.getTeacherRoomDetails(room.roomCode);
    expect(details).not.toBeNull();
    expect(details?.status).toBe("finished");
    expect(details?.isAbandoned).toBe(true);
  });

  test("individual student approval via approvePlayer", async () => {
    const room = await store.createGameRoom({
      hostName: "Pak Guru",
      settings: {
        autoApproveStudents: false,
        streakBonus: true,
        timePerQuestionSec: 20,
      },
    });

    const joinResult1 = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Budi",
      avatar: "garuda",
    });
    const joinResult2 = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Siti",
      avatar: "komodo",
    });

    expect(joinResult1?.player.status).toBe("pending");
    expect(joinResult2?.player.status).toBe("pending");

    let details = await store.getTeacherRoomDetails(room.roomCode);
    expect(details?.pendingPlayers.length).toBe(2);
    expect(details?.approvedPlayers.length).toBe(0);

    // Approve only Budi
    const approved = await store.approvePlayer(room.roomCode, joinResult1!.player.id);
    expect(approved).toBe(true);

    details = await store.getTeacherRoomDetails(room.roomCode);
    expect(details?.pendingPlayers.length).toBe(1);
    expect(details?.pendingPlayers[0]?.nickname).toBe("Siti");
    expect(details?.approvedPlayers.length).toBe(1);
    expect(details?.approvedPlayers[0]?.nickname).toBe("Budi");

    // Approve Siti next
    const approvedSiti = await store.approvePlayer(room.roomCode, joinResult2!.player.id);
    expect(approvedSiti).toBe(true);

    details = await store.getTeacherRoomDetails(room.roomCode);
    expect(details?.pendingPlayers.length).toBe(0);
    expect(details?.approvedPlayers.length).toBe(2);
  });

  test("rejectPlayer marks player as rejected and blocks answer submissions", async () => {
    const room = await store.createGameRoom({
      hostName: "Pak Guru",
      settings: {
        autoApproveStudents: false,
        streakBonus: true,
        timePerQuestionSec: 20,
      },
    });

    const joinResult = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Udin",
      avatar: "kancil",
    });

    expect(joinResult?.player.status).toBe("pending");

    const rejected = await store.rejectPlayer(room.roomCode, joinResult!.player.id);
    expect(rejected).toBe(true);

    const details = await store.getTeacherRoomDetails(room.roomCode);
    const udin = details?.players.find((p) => p.id === joinResult!.player.id);
    expect(udin?.status).toBe("rejected");

    // Attempting to submit an answer should fail with not_approved
    const submitRes = await store.recordAnswerSubmission({
      roomCode: room.roomCode,
      playerId: joinResult!.player.id,
      playerToken: joinResult!.player.token,
      questionId: "q1",
      selectedOption: "A",
      responseTimeMs: 3000,
    });

    expect(submitRes.ok).toBe(false);
    if (!submitRes.ok) {
      expect(submitRes.reason).toBe("not_approved");
    }
  });

  test("joinGameRoom fails and returns null for abandoned rooms", async () => {
    const room = await store.createGameRoom({
      hostName: "Bu Ani",
    });

    await store.abandonRoom(room.roomCode);

    const joinResult = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Andi",
    });

    expect(joinResult).toBeNull();
  });
});
