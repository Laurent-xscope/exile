import { describe, it, expect, beforeEach } from "bun:test";
import {
  enforce128kCap,
  loadSavedCopilotChat,
  saveCopilotChat,
  clearCopilotChat,
  COPILOT_CHAT_STORAGE_KEY,
  COPILOT_MAX_STORAGE_BYTES,
  type CopilotChatMessageItem,
} from "../copilot-chat-store";

class LocalStorageMock {
  private store: Record<string, string> = {};
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = new LocalStorageMock() as unknown as Storage;
}
if (typeof globalThis.window === "undefined") {
  (globalThis as unknown as { window: unknown }).window = globalThis;
}

describe("copilot-chat-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("enforce128kCap", () => {
    it("preserves small conversation without modification", () => {
      const messages: CopilotChatMessageItem[] = [
        { role: "assistant", content: "Halo! Ada yang bisa dibantu?" },
        { role: "user", content: "Tolong jelaskan fotosintesis." },
        { role: "assistant", content: "Fotosintesis adalah proses tumbuhan hijau..." },
      ];

      const result = enforce128kCap(messages);
      expect(result).toEqual(messages);
      expect(JSON.stringify(result).length).toBeLessThan(COPILOT_MAX_STORAGE_BYTES);
    });

    it("drops older middle messages when total size exceeds 128k (131,072 bytes)", () => {
      // Create initial greeting
      const firstMessage: CopilotChatMessageItem = {
        role: "assistant",
        content: "Initial greeting message with context.",
      };

      // Create bulky middle messages (15KB each)
      const bulkyMiddle: CopilotChatMessageItem[] = Array.from({ length: 15 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Middle message #${i}: ` + "X".repeat(15000),
      }));

      // Create latest messages
      const latestMessage: CopilotChatMessageItem = {
        role: "user",
        content: "What is the final answer?",
      };
      const finalReply: CopilotChatMessageItem = {
        role: "assistant",
        content: "Here is the final answer to your question.",
      };

      const allMessages = [firstMessage, ...bulkyMiddle, latestMessage, finalReply];
      const initialJson = JSON.stringify(allMessages);
      expect(initialJson.length).toBeGreaterThan(COPILOT_MAX_STORAGE_BYTES);

      const capped = enforce128kCap(allMessages);

      // Must be strictly within 128KB limit
      expect(JSON.stringify(capped).length).toBeLessThanOrEqual(COPILOT_MAX_STORAGE_BYTES);

      // Must preserve the first message
      expect(capped[0]).toEqual(firstMessage);

      // Must preserve the latest messages
      expect(capped[capped.length - 2]).toEqual(latestMessage);
      expect(capped[capped.length - 1]).toEqual(finalReply);

      // Must have dropped some middle messages
      expect(capped.length).toBeLessThan(allMessages.length);
    });

    it("strips oversized imagePreviews before capping", () => {
      const hugeImage = "data:image/png;base64," + "A".repeat(40000);
      const messages: CopilotChatMessageItem[] = [
        { role: "assistant", content: "Halo" },
        { role: "user", content: "Cek gambar ini", imagePreview: hugeImage },
      ];

      const capped = enforce128kCap(messages);
      expect(capped[1].imagePreview).toBeUndefined();
      expect(capped[1].content).toBe("Cek gambar ini");
    });
  });

  describe("storage persistence & clear operations", () => {
    it("saves and loads chat messages from localStorage", () => {
      const messages: CopilotChatMessageItem[] = [
        { role: "assistant", content: "Hello tutor" },
        { role: "user", content: "How do plants grow?" },
      ];

      saveCopilotChat(messages);

      const loaded = loadSavedCopilotChat();
      expect(loaded).toEqual(messages);
    });

    it("clears chat messages from localStorage", () => {
      const messages: CopilotChatMessageItem[] = [
        { role: "assistant", content: "Welcome" },
      ];
      saveCopilotChat(messages);
      expect(localStorage.getItem(COPILOT_CHAT_STORAGE_KEY)).not.toBeNull();

      clearCopilotChat();
      expect(localStorage.getItem(COPILOT_CHAT_STORAGE_KEY)).toBeNull();
      expect(loadSavedCopilotChat()).toBeNull();
    });

    it("returns null when no chat is saved", () => {
      expect(loadSavedCopilotChat()).toBeNull();
    });
  });
});
