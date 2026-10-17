export class ModelConnectionError extends Error {}

export function providerFailureFromResponse(status: number, payload: unknown, provider: string): ModelConnectionError {
  // Google's compatibility API can return an array-wrapped error object.
  const first = Array.isArray(payload) ? payload[0] : payload;
  const root = first && typeof first === "object" ? first as Record<string, unknown> : {};
  const error = root.error && typeof root.error === "object" ? root.error as Record<string, unknown> : {};
  const details = Array.isArray(error.details) ? error.details[0] : undefined;
  const reason = details && typeof details === "object" ? (details as Record<string, unknown>).reason : undefined;
  return providerFailure(status, reason ?? error.code, error.status ?? error.type, provider);
}

// Map only status and standardized error identifiers. Never surface provider
// messages, request bodies, authorization headers, or credential fragments.
export function providerFailure(status: number, code: unknown, type: unknown, provider = "OpenAI"): ModelConnectionError {
  if (provider === "Gemini" && (status === 503 || type === "UNAVAILABLE")) {
    return new ModelConnectionError("Gemini is temporarily unavailable or experiencing high demand. Try again later or select another available model. Graph analysis remains available.");
  }
  if (provider === "Gemini" && (status === 429 || type === "RESOURCE_EXHAUSTED")) {
    return new ModelConnectionError("Gemini API quota or rate limit was reached. Check this model's free-tier allowance in Google AI Studio before trying again. Graph analysis remains available.");
  }
  if (provider === "Gemini" && (code === "API_KEY_INVALID" || code === "API_KEY_SERVICE_BLOCKED")) {
    return new ModelConnectionError("The Gemini key is invalid or restricted for this API. Check its settings in Google AI Studio.");
  }
  if (code === "credit_balance_exhausted" || code === "insufficient_quota" || type === "insufficient_quota") {
    return new ModelConnectionError("OpenAI API credits are exhausted. Add API credits to enable model investigations. Graph analysis remains available.");
  }
  if (status === 401) return new ModelConnectionError("The model API key is invalid or expired. Update the server-only credential.");
  if (status === 403) return new ModelConnectionError("The API key does not have permission for this model request. Check project and model access.");
  if (code === "model_not_found" || status === 404) return new ModelConnectionError("The selected model is unavailable to this API project. Choose an accessible model.");
  if (status === 429) return new ModelConnectionError("The model request hit an API rate limit. Wait before trying another investigation.");
  return new ModelConnectionError("The provider could not complete this model request. The graph and replay report remains available.");
}
