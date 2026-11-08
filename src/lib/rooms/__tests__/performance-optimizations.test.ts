import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { GET as getStateRoute } from "@/app/api/rooms/[code]/state/route";
import { GET as getChatRoute } from "@/app/api/rooms/[code]/chat/route";

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
  store.invalidateGameRoomState();
});

describe("Performance optimizations - closeIdleRooms throttling", () => {
  test("throttles subsequent sweep calls within CLOSE_IDLE_ROOMS_THROTTLE_MS", async () => {
    const now = Date.now();

    // Create an old idle room
    const room = await store.createGameRoom({
      hostName: "Guru Fisika",
      settings: { autoApproveStudents: true },
    });

    // Directly backdate room timestamps by 35 minutes
    room.updatedAt = new Date(now - 35 * 60 * 1000).toISOString();
    room.createdAt = new Date(now - 40 * 60 * 1000).toISOString();

    // 1. First sweep with force: true to close the idle room
    const sweep1 = await store.closeIdleRooms({ force: true, now });
    expect(sweep1).toContain(room.roomCode);
    expect(room.status).toBe("finished");

    // 2. Create another room and backdate it
    const room2 = await store.createGameRoom({
      hostName: "Guru Kimia",
      settings: { autoApproveStudents: true },
    });
    room2.updatedAt = new Date(Date.now() - 35 * 60 * 1000).toISOString();
    room2.createdAt = new Date(Date.now() - 40 * 60 * 1000).toISOString();

    // Standard unforced sweep right after sweep1 (within 60s throttle)
    // Note: Calling closeIdleRooms() with no args sets isForced = false
    const sweepThrottled = await store.closeIdleRooms();
    expect(sweepThrottled).toEqual([]);
    expect(room2.status).toBe("waiting");

    // 3. Forcing bypasses throttle and successfully closes room2
    const sweepForced = await store.closeIdleRooms({ force: true });
    expect(sweepForced).toContain(room2.roomCode);
    expect(room2.status).toBe("finished");
  });

  test("CLOSE_IDLE_ROOMS_THROTTLE_MS constant is 60,000ms", () => {
    expect(store.CLOSE_IDLE_ROOMS_THROTTLE_MS).toBe(60_000);
  });
});

describe("Performance optimizations - invalidateGameRoomState", () => {
  test("computes state and caches resolution until invalidation", async () => {
    const room = await store.createGameRoom({
      hostName: "Pengajar Biologi",
      settings: { autoApproveStudents: true },
    });

    const state1 = await store.getGameRoomState(room.roomCode);
    expect(state1).not.toBeNull();
    expect(state1?.hostName).toBe("Pengajar Biologi");

    // Second immediate call returns cached result
    const state2 = await store.getGameRoomState(room.roomCode);
    expect(state2).toBe(state1);

    // Invalidate room state
    store.invalidateGameRoomState(room.roomCode);

    // Re-query computes fresh state object
    const state3 = await store.getGameRoomState(room.roomCode);
    expect(state3).not.toBeNull();
    expect(state3).not.toBe(state1);
    expect(state3?.roomCode).toBe(room.roomCode);
  });

  test("global invalidateGameRoomState() clears cache for all rooms", async () => {
    const roomA = await store.createGameRoom({ hostName: "Guru A" });
    const roomB = await store.createGameRoom({ hostName: "Guru B" });

    const stateA1 = await store.getGameRoomState(roomA.roomCode);
    const stateB1 = await store.getGameRoomState(roomB.roomCode);

    expect(await store.getGameRoomState(roomA.roomCode)).toBe(stateA1);
    expect(await store.getGameRoomState(roomB.roomCode)).toBe(stateB1);

    // Invalidate all rooms
    store.invalidateGameRoomState();

    const stateA2 = await store.getGameRoomState(roomA.roomCode);
    const stateB2 = await store.getGameRoomState(roomB.roomCode);

    expect(stateA2).not.toBe(stateA1);
    expect(stateB2).not.toBe(stateB1);
  });
});

describe("Performance optimizations - ETag and 304 Not Modified behavior", () => {
  test("GET /api/rooms/[code]/state returns 200 with ETag then 304 on matching If-None-Match", async () => {
    const room = await store.createGameRoom({
      hostName: "Guru Matematika",
      settings: { autoApproveStudents: true },
    });

    // 1. First GET request without If-None-Match -> 200 OK + ETag
    const req1 = new Request(`http://localhost:3000/api/rooms/${room.roomCode}/state`, {
      method: "GET",
    });
    const res1 = await getStateRoute(req1, { params: Promise.resolve({ code: room.roomCode }) });

    expect(res1.status).toBe(200);
    const etag = res1.headers.get("ETag");
    expect(etag).not.toBeNull();
    expect(etag).toMatch(/^".*"$/);

    const body1 = (await res1.json()) as { success: boolean; hostName: string };
    expect(body1.success).toBe(true);
    expect(body1.hostName).toBe("Guru Matematika");

    // 2. Second GET request with matching If-None-Match -> 304 Not Modified
    const req2 = new Request(`http://localhost:3000/api/rooms/${room.roomCode}/state`, {
      method: "GET",
      headers: { "if-none-match": etag! },
    });
    const res2 = await getStateRoute(req2, { params: Promise.resolve({ code: room.roomCode }) });

    expect(res2.status).toBe(304);
    expect(res2.headers.get("ETag")).toBe(etag);

    // 3. Weak ETag variant W/<etag> also yields 304
    const reqWeak = new Request(`http://localhost:3000/api/rooms/${room.roomCode}/state`, {
      method: "GET",
      headers: { "if-none-match": `W/${etag}` },
    });
    const resWeak = await getStateRoute(reqWeak, { params: Promise.resolve({ code: room.roomCode }) });
    expect(resWeak.status).toBe(304);

    // 4. Mutate room state by adding a student
    await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Andi Siswa",
      avatar: "avatar-1",
    });
    store.invalidateGameRoomState(room.roomCode);

    // Old ETag should now yield 200 with new updated state
    const req3 = new Request(`http://localhost:3000/api/rooms/${room.roomCode}/state`, {
      method: "GET",
      headers: { "if-none-match": etag! },
    });
    const res3 = await getStateRoute(req3, { params: Promise.resolve({ code: room.roomCode }) });

    expect(res3.status).toBe(200);
    const newEtag = res3.headers.get("ETag");
    expect(newEtag).not.toBe(etag);
    const body3 = (await res3.json()) as { success: boolean; players: unknown[] };
    expect(body3.players.length).toBe(1);
  });

  test("GET /api/rooms/[code]/chat returns 200 with ETag then 304 on matching If-None-Match", async () => {
    const room = await store.createGameRoom({
      hostName: "Guru Sejarah",
      settings: { autoApproveStudents: true },
    });

    const hostToken = room.hostToken;

    // 1. Initial chat fetch (empty) -> 200 OK + ETag
    const req1 = new Request(`http://localhost:3000/api/rooms/${room.roomCode}/chat`, {
      method: "GET",
      headers: { "x-host-token": hostToken },
    });
    const res1 = await getChatRoute(req1, { params: Promise.resolve({ code: room.roomCode }) });

    expect(res1.status).toBe(200);
    const etag1 = res1.headers.get("ETag");
    expect(etag1).not.toBeNull();

    // 2. Fetch with same ETag -> 304 Not Modified
    const req2 = new Request(`http://localhost:3000/api/rooms/${room.roomCode}/chat`, {
      method: "GET",
      headers: {
        "x-host-token": hostToken,
        "if-none-match": etag1!,
      },
    });
    const res2 = await getChatRoute(req2, { params: Promise.resolve({ code: room.roomCode }) });
    expect(res2.status).toBe(304);

    // 3. Add a message -> ETag changes and yields 200
    await store.addRoomChatMessage({
      roomCode: room.roomCode,
      senderId: "host",
      senderName: "Guru Sejarah",
      senderRole: "teacher",
      text: "Selamat datang di sesi kuis!",
    });

    const req3 = new Request(`http://localhost:3000/api/rooms/${room.roomCode}/chat`, {
      method: "GET",
      headers: {
        "x-host-token": hostToken,
        "if-none-match": etag1!,
      },
    });
    const res3 = await getChatRoute(req3, { params: Promise.resolve({ code: room.roomCode }) });

    expect(res3.status).toBe(200);
    const etag2 = res3.headers.get("ETag");
    expect(etag2).not.toBe(etag1);
    const body3 = (await res3.json()) as { success: boolean; messages: unknown[] };
    expect(body3.messages.length).toBe(1);
  });
});
