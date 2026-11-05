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
