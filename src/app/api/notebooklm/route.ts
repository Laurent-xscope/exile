import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  NotebookLmAuthError,
  NotebookLmClient,
  isNotebookLmConfigured,
} from "@/lib/notebooklm/client";
import { ARTIFACT_TYPE } from "@/lib/notebooklm/rpc-catalog";

/**
 * Bridge to the operator's NotebookLM account. Because it acts with the
 * server's own Google session, it is limited to signed-in Exile users and to
 * a fixed allowlist of non-destructive actions.
 */
const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("listNotebooks") }),
  z.object({ action: z.literal("createNotebook"), title: z.string().min(1).max(120) }),
  z.object({ action: z.literal("getNotebook"), notebookId: z.string().min(1).max(100) }),
  z.object({
    action: z.literal("addTextSource"),
    notebookId: z.string().min(1).max(100),
    title: z.string().min(1).max(160),
    text: z.string().min(1).max(200_000),
  }),
  z.object({
    action: z.literal("addUrlSource"),
    notebookId: z.string().min(1).max(100),
    title: z.string().min(1).max(160),
    url: z.string().url().max(2000),
  }),
  z.object({
    action: z.literal("getSourceGuide"),
    notebookId: z.string().min(1).max(100),
    sourceId: z.string().min(1).max(100),
  }),
  z.object({
    action: z.literal("createArtifact"),
    notebookId: z.string().min(1).max(100),
    type: z.enum(["audio", "studyGuide", "mindMap", "quizFlashcards", "slides"]),
    prompt: z.string().max(2000).optional(),
    sourceIds: z.array(z.string().max(100)).max(50).optional(),
  }),
  z.object({ action: z.literal("listArtifacts"), notebookId: z.string().min(1).max(100) }),
  z.object({
    action: z.literal("getInteractiveHtml"),
    notebookId: z.string().min(1).max(100),
    artifactId: z.string().min(1).max(100),
  }),
]);

const ARTIFACT_CODES = {
  audio: ARTIFACT_TYPE.AUDIO_OVERVIEW,
  studyGuide: ARTIFACT_TYPE.STUDY_GUIDE,
  mindMap: ARTIFACT_TYPE.MIND_MAP,
  quizFlashcards: ARTIFACT_TYPE.QUIZ_FLASHCARDS,
  slides: ARTIFACT_TYPE.SLIDE_DECK,
} as const;

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, 20, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  if (!isNotebookLmConfigured()) {
    return NextResponse.json({ error: "NotebookLM bridge is not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!data.user) {
    return NextResponse.json({ error: "Sign in to use NotebookLM." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const client = NotebookLmClient.fromEnv();
    let result: unknown;
    switch (body.action) {
      case "listNotebooks":
        result = await client.listNotebooks();
        break;
      case "createNotebook":
        result = await client.createNotebook(body.title);
        break;
      case "getNotebook":
        result = await client.getNotebook(body.notebookId);
        break;
      case "addTextSource":
        result = await client.addTextSource(body.notebookId, body.text, body.title);
        break;
      case "addUrlSource":
        result = await client.addUrlSource(body.notebookId, body.url, body.title);
        break;
      case "getSourceGuide":
        result = await client.getSourceGuide(body.notebookId, body.sourceId);
        break;
      case "createArtifact":
        result = await client.createArtifact(body.notebookId, ARTIFACT_CODES[body.type], {
          prompt: body.prompt,
          sourceIds: body.sourceIds,
        });
        break;
      case "listArtifacts":
        result = await client.listArtifacts(body.notebookId);
        break;
      case "getInteractiveHtml":
        result = await client.getInteractiveHtml(body.notebookId, body.artifactId);
        break;
    }
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof NotebookLmAuthError) {
      return NextResponse.json({ error: "NotebookLM session is not valid." }, { status: 502 });
    }
    return NextResponse.json({ error: "NotebookLM request failed." }, { status: 502 });
  }
}
