export type ModelProvider = "openai" | "gemini" | "compatible";
export interface ModelSettings {
  provider: ModelProvider; label: string; apiKey: string; model: string;
  baseUrl: string; reasoningEffort?: string; fallbackModel?: string;
}
export function readModelSettings(env: Record<string, string | undefined>): ModelSettings | null {
  if (!env.LLM_API_KEY || !env.LLM_MODEL) return null;
  const provider: ModelProvider = env.LLM_PROVIDER === "gemini" ? "gemini" : env.LLM_PROVIDER === "compatible" ? "compatible" : "openai";
  // Gemini credentials always go to Google's endpoint, even if a stale OpenAI
  // base URL remains in the environment after switching providers.
  const baseUrl = provider === "gemini" ? "https://generativelanguage.googleapis.com/v1"
    : (env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  return { provider, label: provider === "gemini" ? "Gemini" : provider === "openai" ? "OpenAI" : "Model", apiKey: env.LLM_API_KEY, model: env.LLM_MODEL, baseUrl, reasoningEffort: env.LLM_REASONING_EFFORT, fallbackModel: provider === "gemini" ? env.LLM_FALLBACK_MODEL?.trim() || undefined : undefined };
}
export function functionTool(name: string, provider: ModelProvider) {
  return { type: "function", function: {
    name, description: `Read verified ${name.replaceAll("_", " ")} evidence for this run.`,
    // Google's zero-argument function declarations omit the parameter schema.
    ...(provider === "gemini" ? {} : { parameters: { type: "object", properties: {}, additionalProperties: false } }),
  } };
}
