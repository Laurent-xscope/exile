import { NextResponse } from "next/server";
import { listActiveRooms } from "@/lib/rooms/store";

export async function GET() {
  try {
    const rooms = await listActiveRooms();
    return NextResponse.json(
      { success: true, rooms },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[rooms/list error]", err);
    return NextResponse.json(
      { success: false, rooms: [] },
      { status: 500 }
    );
  }
}
