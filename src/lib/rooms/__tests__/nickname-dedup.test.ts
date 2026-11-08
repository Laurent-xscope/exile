import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { resolveUniqueRoomNickname } from "@/lib/rooms/store";

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

describe("resolveUniqueRoomNickname pure helper", () => {
  test("returns original base nickname when no duplicates exist", () => {
    expect(resolveUniqueRoomNickname("Budi", [])).toBe("Budi");
    expect(resolveUniqueRoomNickname("Siti", ["Budi", "Andi"])).toBe("Siti");
  });

  test("auto-numbers first duplicate to (1)", () => {
    expect(resolveUniqueRoomNickname("Budi", ["Budi"])).toBe("Budi(1)");
  });

  test("auto-numbers second duplicate to (2)", () => {
    expect(resolveUniqueRoomNickname("Budi", ["Budi", "Budi(1)"])).toBe("Budi(2)");
  });

  test("handles case-insensitive duplicates", () => {
    expect(resolveUniqueRoomNickname("budi", ["BUDI"])).toBe("budi(1)");
    expect(resolveUniqueRoomNickname("BUDI", ["budi", "budi(1)"])).toBe("BUDI(2)");
  });

  test("fills lowest available numbered slot if a gap exists", () => {
    expect(resolveUniqueRoomNickname("Budi", ["Budi", "Budi(2)"])).toBe("Budi(1)");
    expect(resolveUniqueRoomNickname("Budi", ["Budi", "Budi(1)", "Budi(3)"])).toBe("Budi(2)");
  });

  test("handles empty or whitespace strings gracefully", () => {
    expect(resolveUniqueRoomNickname("   ", [])).toBe("Siswa");
    expect(resolveUniqueRoomNickname("", ["Siswa"])).toBe("Siswa(1)");
  });
});

describe("joinGameRoom auto-numbering and token reconnects", () => {
  test("assigns nama, nama(1), and nama(2) for identical nicknames across joins", async () => {
    const room = await store.createGameRoom({
      hostName: "Pak Guru",
      settings: {
        autoApproveStudents: true,
      },
    });

    // 1. First player enters with nickname "Alya"
    const join1 = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Alya",
    });
    expect(join1).not.toBeNull();
    expect(join1?.player.nickname).toBe("Alya");

    // 2. Second player enters with same nickname "Alya" (without token) -> auto-assigned "Alya(1)"
    const join2 = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Alya",
    });
    expect(join2).not.toBeNull();
    expect(join2?.player.nickname).toBe("Alya(1)");

    // 3. Third player enters with same nickname "Alya" (without token) -> auto-assigned "Alya(2)"
    const join3 = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Alya",
    });
    expect(join3).not.toBeNull();
    expect(join3?.player.nickname).toBe("Alya(2)");
  });

  test("reconnects existing player using playerToken without modifying their nickname", async () => {
    const room = await store.createGameRoom({
      hostName: "Bu Guru",
      settings: {
        autoApproveStudents: true,
      },
    });

    // Player 1 joins
    const join1 = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Dewi",
    });
    expect(join1).not.toBeNull();
    const player1 = join1!.player;
    expect(player1.nickname).toBe("Dewi");

    // Player 2 joins with same name -> gets Dewi(1)
    const join2 = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Dewi",
    });
    expect(join2).not.toBeNull();
    const player2 = join2!.player;
    expect(player2.nickname).toBe("Dewi(1)");

    // Player 1 reconnects with their saved token
    const reconnect1 = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Dewi",
      playerToken: player1.token,
    });
    expect(reconnect1).not.toBeNull();
    expect(reconnect1?.player.id).toBe(player1.id);
    expect(reconnect1?.player.nickname).toBe("Dewi");

    // Player 2 reconnects with their saved token
    const reconnect2 = await store.joinGameRoom({
      roomCode: room.roomCode,
      nickname: "Dewi",
      playerToken: player2.token,
    });
    expect(reconnect2).not.toBeNull();
    expect(reconnect2?.player.id).toBe(player2.id);
    expect(reconnect2?.player.nickname).toBe("Dewi(1)");
  });
});
