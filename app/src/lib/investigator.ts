import "server-only";
import { readWorkflows, repeatedWorkflows, traceFeedback } from "./graph";
import { evaluateCandidate } from "./simulator";
import type { Candidate, Investigation, PathEvidence, Run, ToolReceipt } from "./domain";

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
  return investigation;
}

export function evidenceSummary(paths: PathEvidence[]) { return paths.map((path) => path.systems.join(" → ")); }
