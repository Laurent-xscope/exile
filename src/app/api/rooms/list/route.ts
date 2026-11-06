import { NextResponse } from "next/server";
import { listActiveRooms } from "@/lib/rooms/store";
import { checkRateLimit } from "@/lib/security/rate-limiter";

export async function GET(req: Request) {
  const rateLimit = await checkRateLimit(req, 60, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) {
    return rateLimit.errorResponse;
  }

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
