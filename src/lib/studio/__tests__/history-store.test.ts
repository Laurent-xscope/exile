import { describe, expect, it } from "bun:test";
import {
  mergeHistoryEntries,
  type StudioHistoryEntry,
} from "../history-store";

function makeEntry(id: string, title: string, updatedAt: string): StudioHistoryEntry {
  return {
    id,
    title,
    fileName: "doc.txt",
    fileType: "text",
    docText: "content",
    processedDoc: null,
    aiQuiz: null,
    selectedArtifacts: [],
    activeTab: "flashcards",
    testedAnswers: {},
    masteredCards: [],
    updatedAt,
  };
}

describe("studio history store", () => {
  it("merges local and remote entries choosing the newest by updatedAt", () => {
    const local: StudioHistoryEntry[] = [
      makeEntry("doc-1", "Local Newer", "2026-11-06T10:00:00.000Z"),
      makeEntry("doc-2", "Local Older", "2026-11-06T08:00:00.000Z"),
    ];

    const remote: StudioHistoryEntry[] = [
      makeEntry("doc-1", "Remote Older", "2026-11-06T09:00:00.000Z"),
      makeEntry("doc-2", "Remote Newer", "2026-11-06T09:30:00.000Z"),
      makeEntry("doc-3", "Remote Only", "2026-11-06T08:30:00.000Z"),
    ];

    const merged = mergeHistoryEntries(local, remote);
    expect(merged.length).toBe(3);

    // doc-1 should come from local ("Local Newer")
    const doc1 = merged.find((e) => e.id === "doc-1");
    expect(doc1?.title).toBe("Local Newer");

    // doc-2 should come from remote ("Remote Newer")
    const doc2 = merged.find((e) => e.id === "doc-2");
    expect(doc2?.title).toBe("Remote Newer");

    // doc-3 should be preserved
    const doc3 = merged.find((e) => e.id === "doc-3");
    expect(doc3?.title).toBe("Remote Only");

    // Order should be sorted newest first: doc-1 (10:00), doc-2 (09:30), doc-3 (08:30)
    expect(merged[0]?.id).toBe("doc-1");
    expect(merged[1]?.id).toBe("doc-2");
    expect(merged[2]?.id).toBe("doc-3");
  });

  it("caps merged results at 20 entries", () => {
    const local = Array.from({ length: 15 }, (_, i) =>
      makeEntry(`local-${i}`, `Local ${i}`, new Date(Date.now() - i * 1000).toISOString())
    );
    const remote = Array.from({ length: 15 }, (_, i) =>
      makeEntry(`remote-${i}`, `Remote ${i}`, new Date(Date.now() - (i + 15) * 1000).toISOString())
    );

    const merged = mergeHistoryEntries(local, remote);
    expect(merged.length).toBe(20);
  });
});
