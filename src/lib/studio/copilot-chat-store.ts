import type { StudioCraftableArtifact } from "@/lib/ai/prompts";

export interface CopilotChatActionCard {
  type: "create_artifact";
  artifactType: StudioCraftableArtifact;
  label: string;
  topic?: string;
  count?: number;
  difficulty?: string;
  executed?: boolean;
}

export interface CopilotChatMessageItem {
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  actionCard?: CopilotChatActionCard;
}

export const COPILOT_CHAT_STORAGE_KEY = "exile_studio_copilot_chat";
export const COPILOT_MAX_STORAGE_BYTES = 131072; // Strict 128KB limit (131,072 bytes)

/**
 * Enforces a strict 128KB limit (131,072 bytes) on the serialized chat conversation.
 * If JSON.stringify(messages).length > 131072, drops older middle messages
 * while preserving the first message (greeting / context) and latest context.
 */
export function enforce128kCap<T extends { imagePreview?: string }>(messages: T[]): T[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Strip huge embedded imagePreviews (>32KB) during persistence to avoid eating 128KB quota
  const list = messages.map((m) => {
    if (m.imagePreview && m.imagePreview.length > 32768) {
      const { imagePreview: _stripped, ...rest } = m;
      return rest as T;
    }
    return m;
  });

  if (list.length <= 2) {
    return list;
  }

  // Drop older middle messages while total JSON length exceeds 128k
  while (list.length > 2 && JSON.stringify(list).length > COPILOT_MAX_STORAGE_BYTES) {
    // Drop message at index 1 (the oldest middle message)
    list.splice(1, 1);
  }

  // If still over 128k even with 2 messages, drop index 0 to preserve latest message
  if (list.length === 2 && JSON.stringify(list).length > COPILOT_MAX_STORAGE_BYTES) {
    list.splice(0, 1);
  }

  return list;
}

/**
 * Loads saved Copilot chat messages from localStorage if present.
 */
export function loadSavedCopilotChat<T = CopilotChatMessageItem>(): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COPILOT_CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter(
      (m): m is T =>
        Boolean(m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    );
  } catch (err) {
    console.warn("Failed to load saved copilot chat:", err);
    return null;
  }
}

/**
 * Persists Copilot chat messages to localStorage capped at 128KB.
 */
export function saveCopilotChat<T extends { imagePreview?: string }>(messages: T[]): void {
  if (typeof window === "undefined") return;
  try {
    const capped = enforce128kCap(messages);
    window.localStorage.setItem(COPILOT_CHAT_STORAGE_KEY, JSON.stringify(capped));
  } catch (err) {
    console.warn("Failed to persist copilot chat:", err);
  }
}

/**
 * Clears saved Copilot chat messages from localStorage.
 */
export function clearCopilotChat(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COPILOT_CHAT_STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear copilot chat from localStorage:", err);
  }
}
