import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { StudioHistoryEntry } from "@/lib/studio/history-store";

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2MB cap

const StudioHistoryEntrySchema = z
  .object({
    id: z.string().min(1).max(128),
    title: z.string().min(1).max(500),
    fileName: z.string().max(500).default("materi-ajar.txt"),
    fileType: z.enum(["text", "pdf", "image"]).default("text"),
    docText: z.string().default(""),
    processedDoc: z.unknown().nullable().optional(),
    aiQuiz: z.unknown().nullable().optional(),
    selectedArtifacts: z.array(z.string()).default([]),
    activeTab: z.string().default("flashcards"),
    testedAnswers: z.record(z.string(), z.string()).default({}),
    masteredCards: z.array(z.number()).default([]),
    updatedAt: z.string().optional(),
  })
  .passthrough();

type StudioHistoryEntryPayload = z.infer<typeof StudioHistoryEntrySchema>;

async function getAuthenticatedUserClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { supabase: null, user: null };
  }

  return { supabase, user: data.user };
}

export async function GET(req: Request) {
  const rateLimit = await checkRateLimit(req, 60, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const { supabase, user } = await getAuthenticatedUserClient();
  if (!supabase || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("studio_history")
    .select("id, title, payload, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("Error fetching studio history:", error);
    return NextResponse.json({ error: "Failed to fetch studio history." }, { status: 500 });
  }

  const entries: StudioHistoryEntry[] = (rows ?? []).map((row) => {
    const payload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
    return {
      ...payload,
      id: row.id,
      title: row.title || (typeof payload.title === "string" ? payload.title : "Notebook materi"),
      updatedAt: row.updated_at || (typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString()),
    } as StudioHistoryEntry;
  });

  return NextResponse.json({ entries });
}

export async function PUT(req: Request) {
  const rateLimit = await checkRateLimit(req, 60, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const { supabase, user } = await getAuthenticatedUserClient();
  if (!supabase || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Payload too large (maximum 2MB)." },
      { status: 413 }
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
  }

  const rawEntry =
    json && typeof json === "object" && "entry" in json
      ? (json as { entry: unknown }).entry
      : json;

  const parsed = StudioHistoryEntrySchema.safeParse(rawEntry);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid studio history payload.", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const entry: StudioHistoryEntryPayload = parsed.data;
  const updatedAt = entry.updatedAt || new Date().toISOString();

  const { error: upsertError } = await supabase.from("studio_history").upsert(
    {
      id: entry.id,
      user_id: user.id,
      title: entry.title,
      payload: {
        ...entry,
        updatedAt,
      },
      updated_at: updatedAt,
    },
    { onConflict: "user_id,id" }
  );

  if (upsertError) {
    console.warn("Failed to upsert studio history entry:", upsertError);
    return NextResponse.json(
      { error: "Failed to save studio history entry." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    entry: {
      ...entry,
      updatedAt,
    },
  });
}

export async function DELETE(req: Request) {
  const rateLimit = await checkRateLimit(req, 60, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) return rateLimit.errorResponse;

  const { supabase, user } = await getAuthenticatedUserClient();
  if (!supabase || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return NextResponse.json({ error: "Missing or invalid id query parameter." }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("studio_history")
    .delete()
    .eq("id", id.trim())
    .eq("user_id", user.id);

  if (deleteError) {
    console.warn("Failed to delete studio history entry:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete studio history entry." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
