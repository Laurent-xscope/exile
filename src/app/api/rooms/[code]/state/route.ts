import { NextResponse } from "next/server";
import { getGameRoomState } from "@/lib/rooms/store";

export async function GET(
  _req: Request,
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

    return NextResponse.json({
      success: true,
      ...state,
    });
  } catch (err: unknown) {
    console.error("[rooms/[code]/state error]", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil status ruangan kuis." },
      { status: 500 }
    );
  }
}
