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
