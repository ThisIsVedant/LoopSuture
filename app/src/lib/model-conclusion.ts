import { ModelConnectionError } from "./model-errors";

export function verifiedModelConclusion(text: string, selectedId: string | null): string {
  let result: unknown;
  try { result = JSON.parse(text); } catch { throw new ModelConnectionError("The model returned an incomplete conclusion. The verified graph and replay report remains available."); }
  if (!result || typeof result !== "object") throw new ModelConnectionError("The model returned an invalid conclusion. The verified graph and replay report remains available.");
  const conclusion = result as Record<string, unknown>;
  if (conclusion.selectedCandidateId !== selectedId) throw new ModelConnectionError("The model recommendation disagreed with the verified repair ranking. The graph and replay report remains available.");
  if (typeof conclusion.explanation !== "string" || !conclusion.explanation.trim() || conclusion.explanation.length > 5000) throw new ModelConnectionError("The model returned an incomplete conclusion. The verified graph and replay report remains available.");
  return conclusion.explanation;
}
