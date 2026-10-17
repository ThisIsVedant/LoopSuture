import "server-only";
import { randomUUID } from "node:crypto";
import { loadRun, saveRun, updateSnapshot, readWorkflows } from "./graph";
import { getScenario } from "./scenarios";
import { evaluateCandidate, simulate } from "./simulator";
import { investigateRun } from "./investigator";
import type { BusinessValue, Run, ScenarioId, SystemId } from "./domain";

export class RequestError extends Error { constructor(message: string, public status = 400) { super(message); } }
const globalLocks = globalThis as unknown as { loopSutureLocks?: Map<string, Promise<unknown>> };
const locks = globalLocks.loopSutureLocks ??= new Map();
export async function withRunLock<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const previous = locks.get(id) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  locks.set(id, next);
  try { return await next; } finally { if (locks.get(id) === next) locks.delete(id); }
}
export async function requireRun(id: string): Promise<Run> {
  const run = await loadRun(id);
  if (!run) throw new RequestError("Run not found or its graph projection is incomplete.", 404);
  return run;
}
export async function createRun(scenarioId: ScenarioId, origin?: SystemId, value?: BusinessValue): Promise<Run> {
  const scenario = getScenario(scenarioId);
  const input = { id: randomUUID(), origin: origin ?? scenario.systems[0], value: value ?? { name: "Alex Morgan", status: "new", version: 1 } };
  if (!scenario.systems.includes(input.origin)) throw new RequestError("That origin is not available in this scenario.");
  const run: Run = { id: randomUUID(), createdAt: new Date().toISOString(), scenario, input, revision: 0, simulation: simulate(scenario, input), history: [] };
  await saveRun(run);
  return run;
}
export async function investigate(id: string): Promise<Run> {
  return withRunLock(id, async () => {
    const run = await requireRun(id);
    run.investigation = await investigateRun(run);
    await updateSnapshot(run);
    return run;
  });
}
export async function applyRepair(id: string, candidateId: string, revision: number): Promise<Run> {
  return withRunLock(id, async () => {
    const run = await requireRun(id);
    if (run.revision !== revision || run.investigation?.revision !== revision) throw new RequestError("The run changed. Investigate its current revision before applying a repair.", 409);
    const candidate = run.investigation.candidates.find((item) => item.id === candidateId);
    if (!candidate?.eligible) throw new RequestError("This candidate has not passed every required check.", 422);
    const workflows = await readWorkflows(id, revision);
    if (workflows.length !== run.scenario.workflows.length) throw new RequestError("Graph workflow configuration changed; replay again.", 409);
    for (const item of run.scenario.workflows) {
      const stored = workflows.find((w) => w.id === item.id);
      if (!stored || stored.repair !== item.repair || stored.source !== item.source || stored.target !== item.target || stored.failuresBeforeSuccess !== (item.failuresBeforeSuccess ?? 0)) throw new RequestError("Graph workflow configuration changed; replay again.", 409);
    }
    const verified = evaluateCandidate({ ...run.scenario, workflows }, run.input, candidate.workflowIds, candidate.kind);
    if (!verified.eligible) throw new RequestError("The candidate no longer passes replay verification.", 422);
    run.history ??= [];
    run.history.push({ revision: run.revision, simulation: run.simulation, workflows: structuredClone(run.scenario.workflows), investigation: run.investigation });
    for (const workflowId of candidate.workflowIds) run.scenario.workflows.find((workflow) => workflow.id === workflowId)!.repair = candidate.kind;
    run.revision++;
    run.simulation = simulate(run.scenario, run.input);
    run.appliedRepair = { candidateId, workflowId: candidate.workflowId, workflowIds: candidate.workflowIds, kind: candidate.kind, revision: run.revision };
    await saveRun(run);
    return run;
  });
}
