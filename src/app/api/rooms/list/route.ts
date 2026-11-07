import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limiter";

export async function GET(req: Request) {
  const rateLimit = await checkRateLimit(req, 60, 60_000);
  if (!rateLimit.allowed && rateLimit.errorResponse) {
    return rateLimit.errorResponse;
  }

  // Quiz rooms are private by design; public directory listing is disabled to prevent room sharing without a pin.
  return NextResponse.json(
    { success: true, rooms: [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
