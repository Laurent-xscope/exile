import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_MEMORY_BUCKETS = 10_000;
const PRUNE_MAP_THRESHOLD = 2_000;
const PRUNE_INTERVAL_MS = 60_000;

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimitState {
  store: Map<string, RateLimitRecord>;
  cleanup?: ReturnType<typeof setInterval>;
  lastPrunedAt: number;
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __exileRateLimit?: RateLimitState;
};

const state: RateLimitState =
  globalForRateLimit.__exileRateLimit ??
  (globalForRateLimit.__exileRateLimit = {
    store: new Map(),
    lastPrunedAt: Date.now(),
  });

if (!state.lastPrunedAt) {
  state.lastPrunedAt = Date.now();
}

/**
 * Prune expired entries in O(n) over the in-memory map.
 * Executed periodically or when the map size passes threshold.
 */
function pruneExpiredEntries(now: number, maxAgeMs = 60_000) {
  state.lastPrunedAt = now;
  for (const [key, record] of state.store.entries()) {
    const list = record.timestamps;
    let validStart = 0;
    while (validStart < list.length && now - list[validStart] >= maxAgeMs) {
      validStart++;
    }
    if (validStart > 0) {
      if (validStart >= list.length) {
        state.store.delete(key);
        continue;
      }
      list.splice(0, validStart);
    }
    if (list.length === 0) {
      state.store.delete(key);
    }
  }
}

if (!state.cleanup) {
  state.cleanup = setInterval(() => {
    pruneExpiredEntries(Date.now(), 60_000);
  }, PRUNE_INTERVAL_MS);
  state.cleanup.unref?.();
}

/**
 * Prefer platform-provided headers (CF-Connecting-IP, X-Vercel-Forwarded-For).
 */
function getClientIp(req: Request): string {
  const cloudflare = req.headers.get("cf-connecting-ip");
  if (cloudflare) return cloudflare.trim();

  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const parts = vercel.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
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
        "Cache-Control": "no-store",
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

  // Prune expired entries periodically when map exceeds threshold, throttled to 1s to prevent per-request full scans
  if (state.store.size > PRUNE_MAP_THRESHOLD && now - state.lastPrunedAt > 1_000) {
    pruneExpiredEntries(now, windowMs);
  }

  let record = state.store.get(bucket);
  if (!record) {
    if (state.store.size >= MAX_MEMORY_BUCKETS) {
      const oldestKey = state.store.keys().next().value;
      if (oldestKey) state.store.delete(oldestKey);
    }
    record = { timestamps: [] };
    state.store.set(bucket, record);
  }

  // In-place prune of only this bucket's timestamps in O(k) without full map scan
  const list = record.timestamps;
  let validStart = 0;
  while (validStart < list.length && now - list[validStart] >= windowMs) {
    validStart++;
  }
  if (validStart > 0) {
    list.splice(0, validStart);
  }

  if (list.length >= limit) {
    const oldest = list[0];
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

  list.push(now);
  return {
    allowed: true,
    remaining: Math.max(0, limit - list.length),
    resetInSec: Math.ceil(windowMs / 1000),
  };
}
