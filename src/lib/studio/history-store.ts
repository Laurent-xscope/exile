import type {
  DocumentAnalysis,
  Quiz,
  StudioCraftableArtifact,
} from "@/lib/ai/prompts";

export interface StudioHistoryEntry {
  id: string;
  title: string;
  fileName: string;
  fileType: "text" | "pdf" | "image";
  docText: string;
  processedDoc: (DocumentAnalysis & { quizId?: string }) | null;
  aiQuiz?: { quizId: string; quiz: Quiz } | null;
  selectedArtifacts: StudioCraftableArtifact[];
  activeTab: string;
  testedAnswers: Record<string, string>;
  masteredCards: number[];
  updatedAt: string;
}

const STORAGE_KEY = "exile_studio_history_v1";
const MAX_HISTORY_ITEMS = 20;

export function loadStudioHistory(): StudioHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StudioHistoryEntry =>
        Boolean(item && typeof item.id === "string" && typeof item.title === "string")
    );
  } catch {
    return [];
  }
}

export function saveStudioHistoryEntry(entry: StudioHistoryEntry): StudioHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = loadStudioHistory();
    const filtered = existing.filter((item) => item.id !== entry.id);
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return loadStudioHistory();
  }
}

export function deleteStudioHistoryEntry(id: string): StudioHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = loadStudioHistory().filter((item) => item.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return existing;
  } catch {
    return [];
  }
}

/**
 * Merge local and remote history entries by ID, picking the entry with the newest
 * updatedAt timestamp, then sorting newest first and capping at MAX_HISTORY_ITEMS.
 */
export function mergeHistoryEntries(
  local: StudioHistoryEntry[],
  remote: StudioHistoryEntry[]
): StudioHistoryEntry[] {
  const map = new Map<string, StudioHistoryEntry>();

  for (const item of local) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  for (const item of remote) {
    if (!item || !item.id) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const existingTime = new Date(existing.updatedAt || 0).getTime();
      const remoteTime = new Date(item.updatedAt || 0).getTime();
      if (remoteTime >= existingTime) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, MAX_HISTORY_ITEMS);
}

/**
 * Fetch remote history entries from Supabase account storage, merge with local cache,
 * and save merged result back to localStorage offline cache.
 */
export async function fetchRemoteStudioHistory(): Promise<StudioHistoryEntry[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/studio/history", {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) {
      if (res.status !== 401) {
        console.warn("Failed to fetch remote studio history:", res.status);
      }
      return loadStudioHistory();
    }
    const data = await res.json();
    const remoteEntries: StudioHistoryEntry[] = Array.isArray(data?.entries) ? data.entries : [];
    const localEntries = loadStudioHistory();
    const merged = mergeHistoryEntries(localEntries, remoteEntries);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // LocalStorage errors ignored
    }
    return merged;
  } catch (err) {
    console.warn("Error fetching remote studio history:", err);
    return loadStudioHistory();
  }
}

/**
 * Persist an entry immediately to local cache, and sync to remote Supabase storage.
 */
export async function syncStudioHistoryEntry(
  entry: StudioHistoryEntry
): Promise<StudioHistoryEntry[]> {
  const localUpdated = saveStudioHistoryEntry(entry);
  if (typeof window === "undefined") return localUpdated;

  try {
    const res = await fetch("/api/studio/history", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok && res.status !== 401) {
      console.warn("Failed to sync studio history to server:", res.status);
    }
  } catch (err) {
    console.warn("Failed to sync studio history to server:", err);
  }

  return localUpdated;
}

/**
 * Remove an entry from local cache and delete from remote Supabase storage.
 */
export async function deleteRemoteStudioHistoryEntry(
  id: string
): Promise<StudioHistoryEntry[]> {
  const localUpdated = deleteStudioHistoryEntry(id);
  if (typeof window === "undefined") return localUpdated;

  try {
    const res = await fetch(`/api/studio/history?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 401) {
      console.warn("Failed to delete remote studio history entry:", res.status);
    }
  } catch (err) {
    console.warn("Failed to delete remote studio history entry:", err);
  }

  return localUpdated;
}
