import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  theme: z.string().min(2, "Theme must be at least 2 characters"),
  track: z.string().optional().default("General"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { theme, track } = parsed.data;

    // Simulate rapid hackathon agent intelligence
    const ideas = [
      {
        id: "idea-1",
        title: `${theme} Nexus Engine`,
        wedge: `Autonomous multi-agent execution pipeline tailored for ${track}`,
        rubricScore: 9.6,
        techStack: ["Next.js 15", "Supabase pgvector", "Framer Motion", "FastAPI"],
        hook: "Solves the multi-step verification bottleneck in under 5 seconds live on stage.",
      },
      {
        id: "idea-2",
        title: `OmniFlow ${theme}`,
        wedge: `Real-time collaborative canvas with zero-latency streaming synthesis`,
        rubricScore: 9.3,
        techStack: ["React 19", "WebSockets / SSE", "Tailwind v4", "Zod"],
        hook: "High visual density with live reactive graphs that judges interact with directly.",
      },
      {
        id: "idea-3",
        title: `Shield ${theme} Guard`,
        wedge: `Deterministic safety & automated compliance auditing for AI outputs`,
        rubricScore: 9.1,
        techStack: ["TypeScript", "Playwright E2E", "PostgreSQL RLS", "Sonner"],
        hook: "Zero false-positive automated smoke-test guard with exportable compliance certificates.",
      },
    ];

    return NextResponse.json({
      success: true,
      query: { theme, track },
      timestamp: new Date().toISOString(),
      ideas,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error occurred while processing hackathon brainstorm." },
      { status: 500 }
    );
  }
}
