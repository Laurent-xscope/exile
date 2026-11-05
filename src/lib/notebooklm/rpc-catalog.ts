/** NotebookLM Batchexecute RPC catalog (02_rpc_catalog_and_methods.md). */
export const NOTEBOOKLM_RPC = {
  LIST_NOTEBOOKS: "wXbhsf",
  CREATE_NOTEBOOK: "CCqFvf",
  GET_NOTEBOOK: "rLM1Ne",
  RENAME_NOTEBOOK: "s0tc2d",
  DELETE_NOTEBOOK: "WWINqb",
  ADD_SOURCE: "izAoDd",
  ADD_SOURCE_FILE: "o4cbdc",
  DELETE_SOURCE: "tGMBJ",
  GET_SOURCE_GUIDE: "tr032e",
  GET_SOURCE: "hizoJc",
  CREATE_ARTIFACT: "R7cb6c",
  LIST_ARTIFACTS: "gArtLc",
  GET_INTERACTIVE_HTML: "v9rmvd",
  GET_CONVERSATION_TURNS: "khqZz",
  CANCEL_GENERATION: "XgrPMd",
} as const;

export type NotebookLmRpcName = keyof typeof NOTEBOOKLM_RPC;

/** Studio artifact type codes accepted by CREATE_ARTIFACT. */
export const ARTIFACT_TYPE = {
  AUDIO_OVERVIEW: 1,
  STUDY_GUIDE: 2,
  VIDEO_OVERVIEW: 3,
  MIND_MAP: 4,
  QUIZ_FLASHCARDS: 5,
  SLIDE_DECK: 6,
} as const;

/** Source type codes used inside ADD_SOURCE payloads. */
export const SOURCE_KIND = { URL: 1, TEXT: 2, YOUTUBE: 3 } as const;

/** Artifact lifecycle polled via LIST_ARTIFACTS (every ~10s). */
export const ARTIFACT_STATE = { QUEUED: 1, GENERATING: 2, READY: 3 } as const;

export const NOTEBOOKLM_POLL_INTERVAL_MS = 10_000;

export const rpcArgs = {
  listNotebooks: (): unknown[] => [],
  createNotebook: (title: string): unknown[] => [title],
  getNotebook: (notebookId: string): unknown[] => [notebookId],
  renameNotebook: (notebookId: string, title: string): unknown[] => [notebookId, title],
  deleteNotebook: (notebookId: string): unknown[] => [notebookId],
  addUrlSource: (notebookId: string, url: string, title: string): unknown[] => [
    notebookId,
    null,
    [[url, title, SOURCE_KIND.URL]],
  ],
  addTextSource: (notebookId: string, body: string, title: string): unknown[] => [
    notebookId,
    null,
    [[body, title, SOURCE_KIND.TEXT]],
  ],
  addYoutubeSource: (notebookId: string, url: string, title: string): unknown[] => [
    notebookId,
    null,
    [[url, title, SOURCE_KIND.YOUTUBE]],
  ],
  deleteSource: (notebookId: string, sourceId: string): unknown[] => [notebookId, sourceId],
  getSourceGuide: (notebookId: string, sourceId: string): unknown[] => [notebookId, sourceId],
  getSource: (notebookId: string, sourceId: string): unknown[] => [notebookId, sourceId],
  createArtifact: (
    notebookId: string,
    type: number,
    options: { prompt?: string; sourceIds?: string[]; language?: number } = {}
  ): unknown[] => {
    const body: unknown[] = [null, options.prompt ?? null, null, options.sourceIds ?? []];
    if (options.language !== undefined) body.push(options.language);
    return [notebookId, type, body];
  },
  listArtifacts: (notebookId: string): unknown[] => [notebookId],
  getInteractiveHtml: (notebookId: string, artifactId: string): unknown[] => [notebookId, artifactId],
  getConversationTurns: (notebookId: string, conversationId: string): unknown[] => [
    notebookId,
    conversationId,
  ],
  cancelGeneration: (notebookId: string, sessionToken: string): unknown[] => [notebookId, sessionToken],
};
