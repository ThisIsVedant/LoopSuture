import { ModelConnectionError, providerFailureFromResponse } from "./model-errors";
import { verifiedModelConclusion } from "./model-conclusion";
import type { ModelSettings } from "./model-config";

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1/interactions";
const REQUEST_TIMEOUT_MS = 25000;
const INVESTIGATION_TIMEOUT_MS = 120000;
const MAX_REQUESTS = 9;
const MAX_TURNS = 5;
type Step = { type: string; id?: string; name?: string; arguments?: unknown; content?: { type: string; text?: string }[] };
type Runtime = { fetch: typeof fetch; now: () => number; sleep: (ms: number) => Promise<void>; budgetMs: number; maxRequests: number; onRequest: () => void; onRetry: () => void };
const runtime: Runtime = { fetch: (...args) => fetch(...args), now: Date.now, sleep: ms => new Promise(resolve => setTimeout(resolve, ms)), budgetMs: INVESTIGATION_TIMEOUT_MS, maxRequests: MAX_REQUESTS, onRequest: () => {}, onRetry: () => {} };
class GeminiTransientError extends ModelConnectionError {}

export interface GeminiResult { explanation: string; requests: number; retries: number; elapsedMs: number; model: string }
export class GeminiInvestigationError extends ModelConnectionError {
  constructor(message: string, public execution: Omit<GeminiResult, "explanation">) { super(message); }
}
export async function runGeminiInvestigation(
  settings: ModelSettings,
  toolData: Record<string, unknown>,
  instruction: string,
  prompt: string,
  selectedId: string | null,
  onTool: (name: string) => void,
  overrides: Partial<Runtime> = {},
): Promise<GeminiResult> {
  const io = { ...runtime, ...overrides };
  const started = io.now();
  const models = [...new Set([settings.model, settings.fallbackModel].filter((model): model is string => Boolean(model)))];
  let requests = 0;
  let retries = 0;
  for (let index = 0; index < models.length; index++) {
    const remaining = INVESTIGATION_TIMEOUT_MS - (io.now() - started);
    if (remaining <= 0 || requests >= MAX_REQUESTS) throw new GeminiInvestigationError("Gemini could not finish within this investigation's time limit. The verified graph report remains available.", { model: models[index], requests, retries, elapsedMs: io.now() - started });
    // Start a new conversation on fallback; signatures and partial conclusions
    // belong to their original model and must never cross model boundaries.
    const requestedTools: string[] = [];
    try {
      const result = await runModel({ ...settings, model: models[index] }, toolData, instruction, prompt, selectedId, name => requestedTools.push(name), {
        ...io, budgetMs: models.length > 1 && index === 0 ? Math.min(60000, remaining) : remaining,
        maxRequests: MAX_REQUESTS - requests,
        onRequest: () => { requests++; }, onRetry: () => { retries++; },
      });
      requestedTools.forEach(onTool);
      return { ...result, requests, retries, elapsedMs: io.now() - started };
    } catch (error) {
      if (!(error instanceof GeminiTransientError) || index === models.length - 1) throw new GeminiInvestigationError(error instanceof ModelConnectionError ? error.message : "Gemini could not complete this investigation. The verified graph report remains available.", { model: models[index], requests, retries, elapsedMs: io.now() - started });
    }
  }
  throw new GeminiTransientError("Gemini is unavailable. The verified graph report remains available.");
}

async function runModel(
  settings: ModelSettings, toolData: Record<string, unknown>, instruction: string, prompt: string,
  selectedId: string | null, onTool: (name: string) => void, overrides: Partial<Runtime>,
): Promise<GeminiResult> {
  const io = { ...runtime, ...overrides };
  const started = io.now();
  const deadline = started + io.budgetMs;
  const toolNames = Object.keys(toolData);
  const history: unknown[] = [{ type: "user_input", content: [{ type: "text", text: prompt }] }];
  const called = new Set<string>();
  const callIds = new Set<string>();
  let requests = 0;
  let retries = 0;
  const timeout = () => new GeminiTransientError("Gemini could not finish within this investigation's time limit. Retry Gemini when it is available. The verified graph report remains available.");

  async function request(body: object): Promise<Record<string, unknown>> {
    // Retry the same immutable request; history changes only after a complete
    // response. These tools read evidence and cannot apply a repair.
    const encoded = JSON.stringify(body);
    for (let attempt = 0; attempt < 3; attempt++) {
      const remaining = deadline - io.now();
      if (remaining <= 0 || requests >= io.maxRequests) throw timeout();
      requests++;
      io.onRequest();
      let retryAfter = 0;
      let failure: ModelConnectionError;
      try {
        const response = await io.fetch(GEMINI_ENDPOINT, {
          method: "POST", headers: { "x-goog-api-key": settings.apiKey, "Content-Type": "application/json" },
          body: encoded, signal: AbortSignal.timeout(Math.max(1, Math.min(REQUEST_TIMEOUT_MS, remaining))),
        });
        const payload = await response.json().catch(error => {
          if (error instanceof Error && ["TimeoutError", "AbortError", "TypeError"].includes(error.name)) throw error;
          return null;
        });
        if (response.ok) {
          if (io.now() >= deadline) throw timeout();
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new ModelConnectionError("Gemini returned an invalid response. The verified graph report remains available.");
          return payload;
        }
        failure = providerFailureFromResponse(response.status, payload, "Gemini");
        // Quota/auth/schema errors need action, not repeated consumption of a
        // free allowance. Retry only transient server failures.
        if (![408, 500, 502, 503, 504].includes(response.status)) throw failure;
        failure = new GeminiTransientError(failure.message);
        const header = response.headers.get("retry-after");
        if (header) retryAfter = /^\d+(\.\d+)?$/.test(header) ? Number(header) * 1000 : Math.max(0, Date.parse(header) - io.now());
        if (!Number.isFinite(retryAfter)) retryAfter = 0;
        if (retryAfter > 5000) throw failure;
      } catch (error) {
        if (error instanceof ModelConnectionError) throw error;
        if (!(error instanceof Error) || !["TimeoutError", "AbortError", "TypeError"].includes(error.name)) throw new ModelConnectionError("Gemini returned an invalid response. The verified graph report remains available.");
        failure = new GeminiTransientError("Gemini did not respond after bounded retries. Retry Gemini when it is available. The verified graph report remains available.");
      }
      const delay = Math.max(retryAfter, 1000 * 2 ** attempt);
      if (attempt === 2 || requests >= io.maxRequests || io.now() + delay >= deadline) throw failure;
      retries++;
      io.onRetry();
      await io.sleep(delay);
    }
    throw timeout();
  }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const complete = called.size === toolNames.length;
    const payload = await request({
      model: settings.model, store: false, system_instruction: instruction, input: history,
      tools: toolNames.map(name => ({ type: "function", name, description: `Read verified ${name.replaceAll("_", " ")} evidence for this run.` })),
      ...(complete ? { response_format: { type: "text", mime_type: "application/json", schema: {
        type: "object", properties: { selectedCandidateId: { type: ["string", "null"] }, explanation: { type: "string" } }, required: ["selectedCandidateId", "explanation"],
      } } } : {}),
      generation_config: { max_output_tokens: 1800, thinking_level: settings.reasoningEffort ?? "low", tool_choice: complete ? "none" : { allowed_tools: { mode: "any", tools: toolNames.filter(name => !called.has(name)) } } },
    });
    if (!Array.isArray(payload.steps) || payload.steps.some(step => !step || typeof step !== "object" || typeof step.type !== "string")) throw new ModelConnectionError("Gemini returned incomplete evidence. The verified graph report remains available.");
    const steps = payload.steps as Step[];
    const calls = steps.filter(step => step.type === "function_call");
    if (calls.length > 8) throw new ModelConnectionError("Gemini exceeded the evidence tool limit. The verified graph report remains available.");
    // Keep signed thought/function-call steps exactly as received.
    history.push(...payload.steps);
    for (const call of calls) {
      if (typeof call.name !== "string" || typeof call.id !== "string" || !call.id || !Object.hasOwn(toolData, call.name) || callIds.has(call.id)) throw new ModelConnectionError("Gemini requested an unsupported or duplicate tool call. The verified graph report remains available.");
      if (call.arguments != null && (typeof call.arguments !== "object" || Array.isArray(call.arguments) || Object.keys(call.arguments).length)) throw new ModelConnectionError("Gemini supplied unsupported tool arguments. The verified graph report remains available.");
      callIds.add(call.id);
      called.add(call.name);
      history.push({ type: "function_result", name: call.name, call_id: call.id, result: [{ type: "text", text: JSON.stringify(toolData[call.name]) }] });
      onTool(call.name);
    }
    if (!calls.length && complete && payload.status === "completed") {
      const text = steps.filter(step => step.type === "model_output").flatMap(step => step.content ?? []).filter(part => part.type === "text").map(part => part.text ?? "").join("\n");
      return { explanation: verifiedModelConclusion(text, selectedId), requests, retries, elapsedMs: io.now() - started, model: settings.model };
    }
    if (!calls.length) throw new ModelConnectionError("Gemini did not retrieve all required evidence before concluding. The verified graph report remains available.");
  }
  throw new ModelConnectionError("Gemini exceeded the investigation turn limit. The verified graph report remains available.");
}
