import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import {
  mergeChatMessages,
  formatChatTime,
  type RoomChatMessage,
} from "@/components/rooms/room-chat-drawer";

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

describe("Room chat client helpers (mergeChatMessages and formatChatTime)", () => {
  test("formatChatTime handles valid ISO strings and invalid input gracefully", () => {
    expect(formatChatTime("invalid-date")).toBe("");
    expect(formatChatTime("")).toBe("");

    const formatted = formatChatTime("2026-11-08T10:30:00Z");
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });

  test("mergeChatMessages merges disjoint lists and deduplicates by ID", () => {
    const list1: RoomChatMessage[] = [
      {
        id: "msg-1",
        roomCode: "123456",
        senderId: "user-1",
        senderName: "User 1",
        senderRole: "student",
        text: "Hello",
        createdAt: "2026-11-08T10:00:00Z",
      },
    ];

    const list2: RoomChatMessage[] = [
      {
        id: "msg-1",
        roomCode: "123456",
        senderId: "user-1",
        senderName: "User 1",
        senderRole: "student",
        text: "Hello",
        createdAt: "2026-11-08T10:00:00Z",
      },
      {
        id: "msg-2",
        roomCode: "123456",
        senderId: "user-2",
        senderName: "User 2",
        senderRole: "student",
        text: "Hi there",
        createdAt: "2026-11-08T10:01:00Z",
      },
    ];

    const merged = mergeChatMessages(list1, list2);
    expect(merged.length).toBe(2);
    expect(merged[0].id).toBe("msg-1");
    expect(merged[1].id).toBe("msg-2");
  });

  test("mergeChatMessages preserves optimistic messages when new messages arrive", () => {
    const existingWithOptimistic: RoomChatMessage[] = [
      {
        id: "msg-1",
        roomCode: "123456",
        senderId: "host",
        senderName: "Guru",
        senderRole: "teacher",
        text: "Pertanyaan pertama",
        createdAt: "2026-11-08T10:00:00Z",
      },
      {
        id: "temp-999999",
        roomCode: "123456",
        senderId: "student-1",
        senderName: "Budi",
        senderRole: "student",
        text: "Pesan optimistik saya",
        createdAt: "2026-11-08T10:02:00Z",
      },
    ];

    const incomingFromServer: RoomChatMessage[] = [
      {
        id: "msg-1",
        roomCode: "123456",
        senderId: "host",
        senderName: "Guru",
        senderRole: "teacher",
        text: "Pertanyaan pertama",
        createdAt: "2026-11-08T10:00:00Z",
      },
      {
        id: "msg-2",
        roomCode: "123456",
        senderId: "student-2",
        senderName: "Siti",
        senderRole: "student",
        text: "Siap pak!",
        createdAt: "2026-11-08T10:01:00Z",
      },
    ];

    const merged = mergeChatMessages(existingWithOptimistic, incomingFromServer);
    // Should have msg-1, msg-2, and temp-999999 preserved
    expect(merged.length).toBe(3);
    expect(merged.some((m) => m.id === "temp-999999")).toBe(true);
    expect(merged.some((m) => m.id === "msg-2")).toBe(true);
    // Chronological order
    expect(merged[0].id).toBe("msg-1");
    expect(merged[1].id).toBe("msg-2");
    expect(merged[2].id).toBe("temp-999999");
  });

  test("mergeChatMessages returns identical reference if incoming has no new or changed messages", () => {
    const original: RoomChatMessage[] = [
      {
        id: "msg-1",
        roomCode: "123456",
        senderId: "user-1",
        senderName: "User 1",
        senderRole: "student",
        text: "Same content",
        createdAt: "2026-11-08T10:00:00Z",
      },
    ];

    const duplicateIncoming: RoomChatMessage[] = [
      {
        id: "msg-1",
        roomCode: "123456",
        senderId: "user-1",
        senderName: "User 1",
        senderRole: "student",
        text: "Same content",
        createdAt: "2026-11-08T10:00:00Z",
      },
    ];

    const result = mergeChatMessages(original, duplicateIncoming);
    expect(result).toBe(original); // Strict reference equality!
  });
});
