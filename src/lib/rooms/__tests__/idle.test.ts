import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  ROOM_IDLE_TIMEOUT_MS,
  getRoomLastActivityTime,
  isIdleRoom,
} from "../store";

let store!: typeof import("@/lib/rooms/store");

beforeAll(async () => {
  // Ensure stateless in-memory mode for tests
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

describe("isIdleRoom pure helper", () => {
  const baseTime = 1_700_000_000_000;

  test("exports ROOM_IDLE_TIMEOUT_MS equal to 30 minutes", () => {
    expect(ROOM_IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });

  test("returns false for a freshly updated room", () => {
    const room = {
      status: "active",
      updatedAt: new Date(baseTime).toISOString(),
      createdAt: new Date(baseTime).toISOString(),
    };
    expect(isIdleRoom(room, baseTime)).toBe(false);
    expect(isIdleRoom(room, baseTime + 10 * 60 * 1000)).toBe(false);
  });

  test("returns true when room has had no activity for 30 minutes", () => {
    const room = {
      status: "active",
      updatedAt: new Date(baseTime).toISOString(),
      createdAt: new Date(baseTime).toISOString(),
    };
    // Exactly 30 minutes
    expect(isIdleRoom(room, baseTime + 30 * 60 * 1000)).toBe(true);
    // 35 minutes
    expect(isIdleRoom(room, baseTime + 35 * 60 * 1000)).toBe(true);
  });

  test("returns false when player was seen recently even if updatedAt is old", () => {
    const room = {
      status: "waiting",
      updatedAt: new Date(baseTime).toISOString(),
      createdAt: new Date(baseTime).toISOString(),
      players: new Map([
        [
          "p1",
          { lastSeenAt: new Date(baseTime + 25 * 60 * 1000).toISOString() },
        ],
      ]),
    };
    // At baseTime + 35 min, updatedAt is 35 min old, but player lastSeenAt is only 10 min old
    expect(isIdleRoom(room, baseTime + 35 * 60 * 1000)).toBe(false);
  });

  test("returns false when a submission was made recently", () => {
    const room = {
      status: "question_active",
      updatedAt: new Date(baseTime).toISOString(),
      createdAt: new Date(baseTime).toISOString(),
      submissions: [
        { createdAt: new Date(baseTime + 28 * 60 * 1000).toISOString() },
      ],
    };
    // At baseTime + 35 min, submission was only 7 min ago
    expect(isIdleRoom(room, baseTime + 35 * 60 * 1000)).toBe(false);
  });

  test("returns true when both player activity and submissions are older than 30 minutes", () => {
    const room = {
      status: "question_active",
      updatedAt: new Date(baseTime).toISOString(),
      players: new Map([
        [
          "p1",
          { lastSeenAt: new Date(baseTime + 2 * 60 * 1000).toISOString() },
        ],
      ]),
      submissions: [
        { createdAt: new Date(baseTime + 5 * 60 * 1000).toISOString() },
      ],
    };
    // At baseTime + 40 min, latest activity is at baseTime + 5 min (35 min elapsed)
    expect(isIdleRoom(room, baseTime + 40 * 60 * 1000)).toBe(true);
  });

  test("returns false when status is already finished", () => {
    const room = {
      status: "finished",
      updatedAt: new Date(baseTime).toISOString(),
    };
    expect(isIdleRoom(room, baseTime + 60 * 60 * 1000)).toBe(false);
  });

  test("returns false if no valid timestamp can be determined", () => {
    const room = {
      status: "active",
      updatedAt: "",
      createdAt: "",
    };
    expect(isIdleRoom(room, baseTime)).toBe(false);
  });

  test("correctly computes max activity time across all sources", () => {
    const room = {
      updatedAt: new Date(baseTime + 1000).toISOString(),
      players: [
        { lastSeenAt: new Date(baseTime + 5000).toISOString() },
        { lastSeenAt: new Date(baseTime + 2000).toISOString() },
      ],
      submissions: [
        { createdAt: new Date(baseTime + 8000).toISOString() },
      ],
    };
    expect(getRoomLastActivityTime(room)).toBe(baseTime + 8000);
  });
});

describe("in-memory idle room management", () => {
  test("closeIdleRooms marks stale rooms finished and keeps active rooms open", async () => {
    const activeRoom = await store.createGameRoom({ hostName: "Aktif" });
    const idleRoom = await store.createGameRoom({ hostName: "Pasif" });

    // Backdate idleRoom by 35 minutes
    const now = Date.now();
    idleRoom.updatedAt = new Date(now - 35 * 60 * 1000).toISOString();
    idleRoom.createdAt = new Date(now - 35 * 60 * 1000).toISOString();

    const closed = await store.closeIdleRooms({ now });
    expect(closed).toContain(idleRoom.roomCode);
    expect(closed).not.toContain(activeRoom.roomCode);

    expect(idleRoom.status).toBe("finished");
    expect(activeRoom.status).toBe("waiting");
  });

  test("listActiveRooms excludes rooms idle for more than 30 minutes", async () => {
    const activeRoom = await store.createGameRoom({ hostName: "Guru Aktif" });
    const idleRoom = await store.createGameRoom({ hostName: "Guru Tidur" });

    // Backdate idleRoom
    const now = Date.now();
    idleRoom.updatedAt = new Date(now - 31 * 60 * 1000).toISOString();
    idleRoom.createdAt = new Date(now - 31 * 60 * 1000).toISOString();

    const rooms = await store.listActiveRooms();
    const codes = rooms.map((r) => r.roomCode);

    expect(codes).toContain(activeRoom.roomCode);
    expect(codes).not.toContain(idleRoom.roomCode);
  });

  test("joinGameRoom rejects an idle room by auto-closing it and returning null", async () => {
    const idleRoom = await store.createGameRoom({ hostName: "Guru" });
    const now = Date.now();
    idleRoom.updatedAt = new Date(now - 32 * 60 * 1000).toISOString();
    idleRoom.createdAt = new Date(now - 32 * 60 * 1000).toISOString();

    const result = await store.joinGameRoom({
      roomCode: idleRoom.roomCode,
      nickname: "Budi",
    });

    expect(result).toBeNull();
    expect(idleRoom.status).toBe("finished");
  });

  test("recordHeartbeat refreshes room updatedAt and player lastSeenAt", async () => {
    const room = await store.createGameRoom({ hostName: "Guru" });
    const joined = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Ani",
    });
    expect(joined).not.toBeNull();

    const oldUpdated = room.updatedAt;
    // Advance time by 10ms to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 15));

    await store.recordHeartbeat(room.roomCode, {
      playerId: joined!.player.id,
    });

    expect(Date.parse(room.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(oldUpdated)
    );
    expect(joined!.player.lastSeenAt).toBe(room.updatedAt);
  });
});
