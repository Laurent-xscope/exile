import { z } from "zod";
import { extractJSON } from "./gateway";

/**
 * Minimal OpenAI-compatible chat client (Kagiro / DeepSeek).
 * Configured with AI_BASE_URL, AI_API_KEY, AI_MODEL. No canned fallbacks:
 * when the model is unreachable the caller gets a real error.
 */

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<string> | string;
}

export class AIUnavailableError extends Error {}

function config() {
  const baseUrl = (process.env.AI_BASE_URL || "").replace(/\/+$/, "");
  const apiKey = process.env.AI_API_KEY || "";
  const model = process.env.AI_MODEL || "deepseek-v4.1-flash-1017";
  if (!baseUrl || !apiKey) {
    throw new AIUnavailableError("AI belum dikonfigurasi (AI_BASE_URL / AI_API_KEY).");
  }
  return { baseUrl, apiKey, model };
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY);
}

interface CompletionResponse {
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: ToolCall[] };
  }>;
}

async function complete(body: Record<string, unknown>, timeoutMs: number) {
  const { baseUrl, apiKey, model } = config();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, ...body }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new AIUnavailableError(
      err instanceof Error ? `AI tidak dapat dihubungi: ${err.message}` : "AI tidak dapat dihubungi."
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AIUnavailableError(`AI menolak permintaan (${res.status}). ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as CompletionResponse;
  const message = data.choices?.[0]?.message;
  if (!message) throw new AIUnavailableError("AI mengembalikan respons kosong.");
  return message;
}

export async function chatText(
  messages: ChatMessage[],
  opts: { temperature?: number; timeoutMs?: number } = {}
): Promise<string> {
  const message = await complete(
    { messages, temperature: opts.temperature ?? 0.4 },
    opts.timeoutMs ?? 60_000
  );
  return (message.content ?? "").trim();
}

/** Ask for JSON and validate it. Retries once, feeding the validation error back. */
export async function chatJSON<T>(
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  opts: { temperature?: number; timeoutMs?: number } = {}
): Promise<T> {
  const history = [...messages];
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const message = await complete(
      {
        messages: history,
        temperature: opts.temperature ?? 0.5,
        response_format: { type: "json_object" },
      },
      opts.timeoutMs ?? 90_000
    );
    const raw = message.content ?? "";
    try {
      return extractJSON<T>(raw, schema);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "JSON tidak valid";
      history.push(
        { role: "assistant", content: raw },
        {
          role: "user",
          content: `Jawabanmu tidak valid: ${lastError.slice(0, 400)}. Kirim ulang hanya JSON yang benar.`,
        }
      );
    }
  }
  throw new AIUnavailableError(`AI gagal menghasilkan format yang benar. ${lastError.slice(0, 200)}`);
}

export interface AgentResult {
  reply: string;
  steps: Array<{ tool: string; summary: string }>;
}

/** Tool-calling loop. The model may call tools up to `maxSteps` times. */
export async function runAgent(
  messages: ChatMessage[],
  tools: ToolDef[],
  opts: { maxSteps?: number; temperature?: number } = {}
): Promise<AgentResult> {
  const maxSteps = opts.maxSteps ?? 6;
  const history = [...messages];
  const steps: AgentResult["steps"] = [];
  const toolSpecs = tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  for (let i = 0; i <= maxSteps; i++) {
    const message = await complete(
      {
        messages: history,
        temperature: opts.temperature ?? 0.3,
        ...(tools.length > 0 && i < maxSteps ? { tools: toolSpecs } : {}),
      },
      90_000
    );

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      return { reply: (message.content ?? "").trim(), steps };
    }

    history.push({ role: "assistant", content: message.content ?? null, tool_calls: calls });
    for (const call of calls) {
      const tool = tools.find((t) => t.name === call.function.name);
      let output: string;
      if (!tool) {
        output = `Tool ${call.function.name} tidak tersedia.`;
      } else {
        try {
          const args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
          output = await tool.run(args);
        } catch (err) {
          output = `Error: ${err instanceof Error ? err.message : "gagal menjalankan tool"}`;
        }
      }
      steps.push({ tool: call.function.name, summary: output.slice(0, 120) });
      history.push({ role: "tool", tool_call_id: call.id, content: output.slice(0, 12_000) });
    }
  }

  return { reply: "Saya belum selesai; coba perjelas permintaannya.", steps };
}
