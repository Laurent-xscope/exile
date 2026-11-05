/**
 * Google Batchexecute codec (port of reference_impl/batchexecute_client.py).
 *
 * Request:  POST form body `f.req=[[[rpcId, JSON(args), null, "generic"]]]&at=<SNlM0e>`
 * Response: `)]}'` anti-XSSI guard, then length-prefixed chunks whose
 *           `wrb.fr` / `wres` items carry a JSON-encoded string payload.
 */

export interface BatchexecuteForm {
  "f.req": string;
  at: string;
}

export interface RpcResult {
  rpcId: string;
  data: unknown;
}

export function encodeBatchexecuteRequest(
  rpcId: string,
  args: unknown[],
  csrfToken: string
): BatchexecuteForm {
  const inner = JSON.stringify(args);
  const envelope = [[[rpcId, inner, null, "generic"]]];
  return { "f.req": JSON.stringify(envelope), at: csrfToken };
}

export function toFormBody(form: BatchexecuteForm): string {
  return new URLSearchParams({ "f.req": form["f.req"], at: form.at }).toString();
}

const RPC_TAGS = new Set(["wrb.fr", "wres"]);

export function decodeBatchexecuteResponse(raw: string): RpcResult[] {
  let clean = raw.trim();
  if (clean.startsWith(")]}'")) clean = clean.slice(4).trim();

  const results: RpcResult[] = [];
  for (const rawLine of clean.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^\d+$/.test(line)) continue;

    let chunk: unknown;
    try {
      chunk = JSON.parse(line);
    } catch {
      continue;
    }
    if (!Array.isArray(chunk) || chunk.length === 0) continue;

    // Chunks are either [[item, ...]] or [item, ...]; normalise to a list of containers.
    const first = chunk[0];
    const containers: unknown[][] =
      Array.isArray(first) && Array.isArray(first[0])
        ? (chunk as unknown[][])
        : [chunk as unknown[]];

    for (const container of containers) {
      for (const item of container) {
        if (!Array.isArray(item) || item.length < 3) continue;
        const [tag, rpcId, payload] = item;
        if (typeof tag !== "string" || !RPC_TAGS.has(tag) || typeof rpcId !== "string") continue;
        if (!payload) continue;
        try {
          const data = typeof payload === "string" ? JSON.parse(payload) : payload;
          results.push({ rpcId, data });
        } catch {
          continue;
        }
      }
    }
  }
  return results;
}

/** Extracts the per-session CSRF token embedded in the app HTML (`"SNlM0e":"…"`). */
export function extractCsrfToken(html: string): string | null {
  const match = html.match(/"SNlM0e":"([^"]+)"/);
  return match ? match[1] : null;
}
