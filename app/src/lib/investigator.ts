import "server-only";
import { readWorkflows, repeatedWorkflows, traceFeedback } from "./graph";
import { evaluateCandidate } from "./simulator";
import type { Candidate, Investigation, PathEvidence, Run, ToolReceipt } from "./domain";
import { ModelConnectionError, providerFailureFromResponse } from "./model-errors";
import { functionTool, readModelSettings, type ModelSettings } from "./model-config";
import { verifiedModelConclusion } from "./model-conclusion";
import { GeminiInvestigationError, runGeminiInvestigation } from "./gemini-investigation";

export async function investigateRun(run: Run): Promise<Investigation> {
  const receipts: ToolReceipt[] = [];
  const [paths, repeated, workflows] = await Promise.all([
    traceFeedback(run.id, run.revision), repeatedWorkflows(run.id, run.revision), readWorkflows(run.id, run.revision),
  ]);
  receipts.push({ tool: "trace_feedback", detail: `${paths.length} return paths from recorded causal event edges.`, source: "graph" });
  receipts.push({ tool: "inspect_workflows", detail: `${workflows.length} workflows; ${repeated.length} have repeated successful deliveries for one change.`, source: "graph" });
  if (workflows.length !== run.scenario.workflows.length) throw new Error("The graph projection is incomplete; investigation cannot continue.");
  const unhealthy = run.simulation.termination === "budget-exhausted" || repeated.length > 0;
  const affected = new Set([...paths.flatMap((path) => path.workflowIds.filter(Boolean)), ...repeated]);
  const candidates: Candidate[] = [];
  if (unhealthy) {
    for (const workflow of workflows.filter((item) => affected.has(item.id))) {
      for (const kind of ["disable", "deduplicate", "suppress-noop"] as const) {
        candidates.push(evaluateCandidate({ ...run.scenario, workflows }, run.input, workflow.id, kind));
      }
    }
  }
  if (unhealthy) {
    // One guard can stop the original input but leave repeats for another origin.
    // Evaluate small guard sets rather than weakening the preservation checks.
    const ids = workflows.filter((item) => affected.has(item.id)).map((item) => item.id).slice(0, 3);
    for (let mask = 1; mask < (1 << ids.length); mask++) {
      const subset = ids.filter((_id, index) => (mask & (1 << index)) !== 0);
      if (subset.length < 2) continue;
      for (const kind of ["deduplicate", "suppress-noop"] as const) candidates.push(evaluateCandidate({ ...run.scenario, workflows }, run.input, subset, kind));
    }
  }
  const selected = candidates.filter((candidate) => candidate.eligible).sort((a, b) => a.score - b.score || a.id.localeCompare(b.id))[0];
  receipts.push({ tool: "evaluate_repairs", detail: `${candidates.length} supported candidates replayed against fixed delivery goals and fresh edits from every origin.`, source: "replay" });
  const status = !unhealthy ? "healthy" : selected ? "repair-found" : "unresolved";
  const explanation = status === "healthy"
    ? `This run drained naturally with ${run.simulation.metrics.retries} bounded retries and no repeated successful effects. No repair is needed.`
    : selected
      ? `${paths.length ? `A recorded change returns through ${paths[0].systems.join(" → ")}.` : "The same originating change delivers its side effect more than once."} ${selected.title} passes the original delivery goals and ${selected.probes.length} fresh-edit checks. It is the best among ${candidates.length} evaluated candidates under the configured ranking.`
      : "The graph shows repeated work, but no supported candidate passed every termination and delivery check. This run remains unresolved.";
  const investigation: Investigation = { revision: run.revision, status, paths, candidates, selectedId: selected?.id ?? null, explanation, mode: "graph", receipts };
  const settings = readModelSettings(process.env);
  if (settings) {
    investigation.modelProvider = settings.label;
    try { await addModelInvestigation(run, investigation, settings); }
    catch (error) {
      if (error instanceof GeminiInvestigationError) investigation.modelExecution = error.execution;
      investigation.modelNote = error instanceof ModelConnectionError ? error.message : error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? `${settings.label} took too long to respond. Try again later. Graph analysis remains available.` : "The model investigation could not complete. The deterministic graph and replay report remains available.";
    }
  }
  return investigation;
}

// Optional model tool protocols. The graph mode works without a key;
// the UI never presents deterministic graph analysis as model reasoning.
async function addModelInvestigation(run: Run, investigation: Investigation, settings: ModelSettings) {
  const toolData: Record<string, unknown> = {
    inspect_run: { termination: run.simulation.termination, metrics: run.simulation.metrics, goals: run.simulation.goals },
    trace_feedback: investigation.paths,
    evaluate_repairs: { selectedCandidateId: investigation.selectedId, ranking: "Only eligible candidates qualify. Lower score wins; equal scores use ascending candidate ID. Use the provided selectedCandidateId as the verified winner; do not rerank candidates.", candidates: investigation.candidates.map((candidate) => ({ id: candidate.id, title: candidate.title, score: candidate.score, eligible: candidate.eligible, reason: candidate.reason, probes: candidate.probes })) },
  };
  const instruction = "You investigate an instrumented synthetic automation environment. Request inspect_run, trace_feedback, and evaluate_repairs together in parallel before explaining your conclusion; these evidence tools are independent. Explain your conclusion concisely, within 350 words. Do not claim production integrations, formal proof, or global optimality. Repair eligibility is determined by the tools. Explain the evidence and rejected repairs. Do not invent paths or results. You cannot apply changes; the user applies a verified repair separately.";
  const prompt = `Investigate this run: ${run.scenario.name}. Its input is a synthetic customer edit. Identify whether feedback is harmful, explain the verified selected candidate if any, and describe the fresh-edit evidence. After all three tools, return only a JSON object with selectedCandidateId (the exact verified ID, or null) and explanation (a concise string). Do not invent reasons for rejection; use each candidate's reason and probe results.`;
  if (settings.provider === "gemini") {
    const result = await runGeminiInvestigation(settings, toolData, instruction, prompt, investigation.selectedId, name => {
      investigation.receipts.push({ tool: name, detail: "Model requested verified evidence.", source: name === "evaluate_repairs" ? "replay" : "graph" });
    });
    investigation.explanation = result.explanation;
    investigation.modelExecution = { model: result.model, requests: result.requests, retries: result.retries, elapsedMs: result.elapsedMs };
    investigation.mode = "model";
    return;
  }
  type ChatMessage = { role: string; content?: string | null; tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[]; tool_call_id?: string };
  const messages: ChatMessage[] = [
    { role: "system", content: instruction },
    { role: "user", content: prompt },
  ];
  const called = new Set<string>();
  for (let step = 0; step < 5; step++) {
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: "POST", headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: settings.model, messages, tools: Object.keys(toolData).map((name) => functionTool(name, settings.provider)), tool_choice: called.size < 3 ? "required" : "auto", max_completion_tokens: 1200, ...(settings.reasoningEffort ? { reasoning_effort: settings.reasoningEffort } : {}) }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      throw providerFailureFromResponse(response.status, failure, settings.label);
    }
    const payload = await response.json();
    const message = payload.choices?.[0]?.message as ChatMessage | undefined;
    if (!message) throw new Error("Model returned no message.");
    messages.push(message);
    if (message.tool_calls?.length) {
      if (message.tool_calls.length > 8) throw new ModelConnectionError("The model exceeded this investigation's tool-call limit.");
      for (const call of message.tool_calls) {
        if (!Object.hasOwn(toolData, call.function.name)) throw new Error("Model requested an unsupported tool.");
        called.add(call.function.name);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(toolData[call.function.name]) });
        investigation.receipts.push({ tool: call.function.name, detail: "Model requested verified evidence.", source: call.function.name === "evaluate_repairs" ? "replay" : "graph" });
      }
    } else if (message.content && called.size === 3) {
      investigation.explanation = verifiedModelConclusion(message.content, investigation.selectedId);
      investigation.mode = "model";
      return;
    }
  }
  throw new Error("Model tool-call budget exhausted.");
}

export function evidenceSummary(paths: PathEvidence[]) { return paths.map((path) => path.systems.join(" → ")); }
