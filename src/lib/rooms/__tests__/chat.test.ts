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

describe("Room chat store functions", () => {
  test("addRoomChatMessage and getRoomChatMessages store and retrieve messages", async () => {
    const room = await store.createGameRoom({
      hostName: "Pengajar Test",
      settings: {
        autoApproveStudents: true,
        streakBonus: true,
        timePerQuestionSec: 20,
      },
    });

    const initial = await store.getRoomChatMessages(room.roomCode);
    expect(initial).toEqual([]);

    const msg1 = await store.addRoomChatMessage({
      roomCode: room.roomCode,
      senderId: "host",
      senderName: "Pengajar Test",
      senderRole: "teacher",
      text: "Selamat pagi semua!",
    });

    expect(msg1).not.toBeNull();
    expect(msg1?.text).toBe("Selamat pagi semua!");
    expect(msg1?.senderRole).toBe("teacher");
    expect(msg1?.senderName).toBe("Pengajar Test");
    expect(msg1?.roomCode).toBe(room.roomCode);
    expect(typeof msg1?.id).toBe("string");
    expect(typeof msg1?.createdAt).toBe("string");

    const msg2 = await store.addRoomChatMessage({
      roomCode: room.roomCode,
      senderId: "player-1",
      senderName: "Budi Siswa",
      senderRole: "student",
      text: "Pagi pak, izin bertanya untuk soal 2.",
    });

    expect(msg2).not.toBeNull();
    expect(msg2?.senderRole).toBe("student");

    const messages = await store.getRoomChatMessages(room.roomCode);
    expect(messages.length).toBe(2);
    expect(messages[0].id).toBe(msg1!.id);
    expect(messages[1].id).toBe(msg2!.id);
  });

  test("addRoomChatMessage ignores empty or whitespace-only messages", async () => {
    const room = await store.createGameRoom({
      hostName: "Pengajar Test",
    });

    const emptyRes = await store.addRoomChatMessage({
      roomCode: room.roomCode,
      senderId: "player-1",
      senderName: "Budi",
      senderRole: "student",
      text: "   \n\t  ",
    });

    expect(emptyRes).toBeNull();

    const messages = await store.getRoomChatMessages(room.roomCode);
    expect(messages.length).toBe(0);
  });

  test("addRoomChatMessage returns null for non-existent room", async () => {
    const res = await store.addRoomChatMessage({
      roomCode: "999999",
      senderId: "player-1",
      senderName: "Budi",
      senderRole: "student",
      text: "Halo?",
    });

    expect(res).toBeNull();

    const messages = await store.getRoomChatMessages("999999");
    expect(messages).toEqual([]);
  });

  test("addRoomChatMessage falls back to default role names if senderName is blank", async () => {
    const room = await store.createGameRoom({
      hostName: "Pengajar Test",
    });

    const teacherMsg = await store.addRoomChatMessage({
      roomCode: room.roomCode,
      senderId: "host",
      senderName: "  ",
      senderRole: "teacher",
      text: "Pengumuman mulai.",
    });
    expect(teacherMsg?.senderName).toBe("Guru");

    const studentMsg = await store.addRoomChatMessage({
      roomCode: room.roomCode,
      senderId: "p-2",
      senderName: "",
      senderRole: "student",
      text: "Siap!",
    });
    expect(studentMsg?.senderName).toBe("Siswa");
  });

  test("limits chat history to 100 messages maximum", async () => {
    const room = await store.createGameRoom({
      hostName: "Pengajar Test",
    });

    for (let i = 1; i <= 105; i++) {
      await store.addRoomChatMessage({
        roomCode: room.roomCode,
        senderId: `user-${i}`,
        senderName: `User ${i}`,
        senderRole: "student",
        text: `Pesan ${i}`,
      });
    }

    const messages = await store.getRoomChatMessages(room.roomCode);
    expect(messages.length).toBe(100);
    // Oldest 5 messages (1 to 5) should be trimmed; first message should be Pesan 6
    expect(messages[0].text).toBe("Pesan 6");
    expect(messages[messages.length - 1].text).toBe("Pesan 105");
  });
});
