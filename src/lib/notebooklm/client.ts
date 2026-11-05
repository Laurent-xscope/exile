// Server-only: reads NOTEBOOKLM_COOKIE; import from route handlers exclusively.
import { createHash } from "node:crypto";
import {
  decodeBatchexecuteResponse,
  encodeBatchexecuteRequest,
  extractCsrfToken,
  toFormBody,
  type RpcResult,
} from "@/lib/notebooklm/batchexecute";
import {
  ARTIFACT_STATE,
  NOTEBOOKLM_RPC,
  rpcArgs,
  type NotebookLmRpcName,
} from "@/lib/notebooklm/rpc-catalog";

const ORIGIN = "https://notebooklm.google.com";
const ENDPOINT = `${ORIGIN}/_/LabsTailwindUi/data/batchexecute`;
const DEFAULT_BUILD_LABEL = "boq_tailwind-ui_20261103.00_p0";

/** `SAPISIDHASH {ts}_{sha1("{ts} {sapisid} {origin}")}` (sapisid_hasher.py). */
export function generateSapisidHash(sapisid: string, origin = ORIGIN, nowMs = Date.now()): string {
  const sig = createHash("sha1").update(`${nowMs} ${sapisid} ${origin}`).digest("hex");
  return `SAPISIDHASH ${nowMs}_${sig}`;
}

function cookieValue(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export class NotebookLmAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotebookLmAuthError";
  }
}

/**
 * Credentials come from the operator's own browser session, supplied through
 * the server-only NOTEBOOKLM_COOKIE variable (cookies exported after a normal
 * login on notebooklm.google.com, including the origin-bound OSID).
 */
export function isNotebookLmConfigured(): boolean {
  return Boolean(process.env.NOTEBOOKLM_COOKIE?.trim());
}

export class NotebookLmClient {
  private csrf: string | null = null;
  private reqId = 100000 + Math.floor(Math.random() * 900000);

  constructor(private readonly cookie: string) {}

  static fromEnv(): NotebookLmClient {
    const cookie = process.env.NOTEBOOKLM_COOKIE?.trim();
    if (!cookie) throw new NotebookLmAuthError("NOTEBOOKLM_COOKIE is not configured.");
    return new NotebookLmClient(cookie);
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const sapisid =
      cookieValue(this.cookie, "SAPISID") ?? cookieValue(this.cookie, "__Secure-3PAPISID");
    return {
      Cookie: this.cookie,
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      ...(sapisid ? { Authorization: generateSapisidHash(sapisid) } : {}),
      ...extra,
    };
  }

  /** Loads the app shell to mint the session CSRF token (`SNlM0e`). */
  async ensureCsrf(): Promise<string> {
    if (this.csrf) return this.csrf;
    const res = await fetch(`${ORIGIN}/`, { headers: this.headers(), redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      throw new NotebookLmAuthError(
        "NotebookLM redirected to sign-in (stale cookies or OSID origin mismatch). Re-export cookies from notebooklm.google.com."
      );
    }
    const token = extractCsrfToken(await res.text());
    if (!token) throw new NotebookLmAuthError("Could not resolve the NotebookLM CSRF token.");
    this.csrf = token;
    return token;
  }

  async call(rpcId: string, args: unknown[]): Promise<RpcResult | null> {
    const at = await this.ensureCsrf();
    const params = new URLSearchParams({
      rpcids: rpcId,
      "source-path": "/",
      bl: process.env.NOTEBOOKLM_BUILD_LABEL || DEFAULT_BUILD_LABEL,
      hl: "en",
      _reqid: String((this.reqId += 100000)),
      rt: "c",
    });
    const res = await fetch(`${ENDPOINT}?${params}`, {
      method: "POST",
      headers: this.headers({
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      }),
      body: toFormBody(encodeBatchexecuteRequest(rpcId, args, at)),
    });
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      this.csrf = null;
      throw new NotebookLmAuthError(`NotebookLM rejected the request (HTTP ${res.status}).`);
    }
    if (!res.ok) throw new Error(`NotebookLM RPC ${rpcId} failed (HTTP ${res.status}).`);
    const results = decodeBatchexecuteResponse(await res.text());
    return results.find((r) => r.rpcId === rpcId) ?? results[0] ?? null;
  }

  private async run(name: NotebookLmRpcName, args: unknown[]) {
    return (await this.call(NOTEBOOKLM_RPC[name], args))?.data ?? null;
  }

  listNotebooks() {
    return this.run("LIST_NOTEBOOKS", rpcArgs.listNotebooks());
  }
  createNotebook(title: string) {
    return this.run("CREATE_NOTEBOOK", rpcArgs.createNotebook(title));
  }
  getNotebook(id: string) {
    return this.run("GET_NOTEBOOK", rpcArgs.getNotebook(id));
  }
  deleteNotebook(id: string) {
    return this.run("DELETE_NOTEBOOK", rpcArgs.deleteNotebook(id));
  }
  addTextSource(notebookId: string, body: string, title: string) {
    return this.run("ADD_SOURCE", rpcArgs.addTextSource(notebookId, body, title));
  }
  addUrlSource(notebookId: string, url: string, title: string) {
    return this.run("ADD_SOURCE", rpcArgs.addUrlSource(notebookId, url, title));
  }
  getSourceGuide(notebookId: string, sourceId: string) {
    return this.run("GET_SOURCE_GUIDE", rpcArgs.getSourceGuide(notebookId, sourceId));
  }
  createArtifact(
    notebookId: string,
    type: number,
    options?: { prompt?: string; sourceIds?: string[] }
  ) {
    return this.run("CREATE_ARTIFACT", rpcArgs.createArtifact(notebookId, type, options));
  }
  listArtifacts(notebookId: string) {
    return this.run("LIST_ARTIFACTS", rpcArgs.listArtifacts(notebookId));
  }
  getInteractiveHtml(notebookId: string, artifactId: string) {
    return this.run("GET_INTERACTIVE_HTML", rpcArgs.getInteractiveHtml(notebookId, artifactId));
  }
}

export { ARTIFACT_STATE };
