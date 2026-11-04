import { NextResponse } from "next/server";
import { getGameRoomState } from "@/lib/rooms/store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Room code parameter is required." },
        { status: 400 }
      );
    }

    const state = await getGameRoomState(code.trim());

    if (!state) {
      return NextResponse.json(
        {
          success: false,
          error: `Room PIN "${code}" tidak ditemukan.`,
        },
        { status: 404 }
      );
    }

    // Compute lightweight ETag based on room state version
    const etag = `"${state.status}-${state.currentQuestionIndex}-${state.players.length}-${state.totalSubmissionsCount}-${state.updatedAt || ""}"`;

    const clientEtag = req.headers.get("if-none-match");
    if (clientEtag && clientEtag === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, no-transform",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        ...state,
      },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, no-transform",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[rooms/[code]/state error]", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil status ruangan kuis." },
      { status: 500 }
    );
  }
}
