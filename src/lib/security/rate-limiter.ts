import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimitState {
  store: Map<string, RateLimitRecord>;
  cleanup?: ReturnType<typeof setInterval>;
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __exileRateLimit?: RateLimitState;
};

const state: RateLimitState =
  globalForRateLimit.__exileRateLimit ??
  (globalForRateLimit.__exileRateLimit = { store: new Map() });

if (!state.cleanup) {
  state.cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of state.store.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 3_600_000);
      if (record.timestamps.length === 0) {
        state.store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  state.cleanup.unref?.();
}

/**
 * Prefer platform-provided headers, and take the right-most forwarded address:
 * the left-most entry is client-controlled and can be spoofed.
 */
function getClientIp(req: Request): string {
  const cloudflare = req.headers.get("cf-connecting-ip");
  if (cloudflare) return cloudflare.trim();

  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const parts = vercel.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}

function buildResponse(
  limit: number,
  remaining: number,
  resetInSec: number
): NextResponse | undefined {
  if (remaining > 0) return undefined;
  return NextResponse.json(
    {
      success: false,
      error: `Batas permintaan tercapai (maksimal ${limit} permintaan per menit). Mohon tunggu ${resetInSec} detik sebelum mencoba kembali.`,
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: resetInSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetInSec),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetInSec),
      },
    }
  );
}

export async function checkRateLimit(
  req: Request,
  limit = 10,
  windowMs = 60_000
): Promise<{
  allowed: boolean;
  remaining: number;
  resetInSec: number;
  errorResponse?: NextResponse;
}> {
  const clientIp = getClientIp(req);
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const pathname = new URL(req.url).pathname;
  const bucket = `${pathname}:${clientIp}`;

  // Distributed limiter: one atomic window per route + client across instances.
  const db = getSupabaseAdmin();
  if (db) {
    try {
      const { data, error } = await db.rpc("consume_rate_limit", {
        p_bucket: bucket,
        p_limit: limit,
        p_window_seconds: windowSec,
      });

      if (!error && Array.isArray(data) && data[0]) {
        const row = data[0] as {
          allowed: boolean;
          remaining: number;
          reset_in: number;
        };
        const remaining = Math.max(0, Number(row.remaining) || 0);
        const resetInSec = Math.max(1, Number(row.reset_in) || windowSec);
        const allowed = Boolean(row.allowed);
        return {
          allowed,
          remaining,
          resetInSec,
          errorResponse: allowed
            ? undefined
            : buildResponse(limit, 0, resetInSec),
        };
      }
    } catch (err) {
      console.warn("[RateLimit] Distributed limiter unavailable, using memory:", err);
    }
  }

  // Local/demo fallback. Not shared across instances.
  const now = Date.now();
  let record = state.store.get(bucket);
  if (!record) {
    record = { timestamps: [] };
    state.store.set(bucket, record);
  }

  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetInSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    return {
      allowed: false,
      remaining: 0,
      resetInSec,
      errorResponse: buildResponse(limit, 0, resetInSec),
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: Math.max(0, limit - record.timestamps.length),
    resetInSec: Math.ceil(windowMs / 1000),
  };
}
