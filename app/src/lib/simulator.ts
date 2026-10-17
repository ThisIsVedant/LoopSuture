import type { BusinessValue, Candidate, InputChange, Scenario, Simulation, SystemId, VerificationProbe } from "./domain";

export function businessHash(value: BusinessValue): string {
  return JSON.stringify([value.name, value.status, value.version]);
}

// Event IDs represent deliveries; root IDs represent distinct user changes.
// These identities must not be conflated when deciding whether a write is a duplicate.
export function simulate(scenario: Scenario, input: InputChange, initialRecords: Simulation["records"] = {}): Simulation {
  const result: Simulation = {
    events: [], actions: [], records: structuredClone(initialRecords), termination: "drained", pendingEvents: 0,
    goals: [], metrics: { attempted: 0, delivered: 0, suppressed: 0, retries: 0, repeated: 0, goalsPassed: 0, goalsTotal: 0 },
  };
  let eventSequence = 0;
  const event = (system: SystemId, parentId: string | null, workflowId: string | null) => {
    const item = { id: `e${eventSequence}`, sequence: eventSequence++, rootId: input.id, parentId, system, workflowId, value: structuredClone(input.value), payloadHash: businessHash(input.value) };
    result.events.push(item);
    return item;
  };
  result.records[input.origin] = structuredClone(input.value);
  const first = event(input.origin, null, null);
  const queue = Array.from({ length: scenario.duplicateDeliveries }, () => first);
  const processed = new Set<string>();
  const successful = new Set<string>();
  const failures = new Map<string, number>();
  while (queue.length > 0 && result.actions.length < scenario.actionBudget) {
    const current = queue.shift()!;
    for (const workflow of scenario.workflows.filter((item) => item.source === current.system)) {
      if (result.actions.length >= scenario.actionBudget) { queue.unshift(current); break; }
      const key = `${input.id}:${workflow.id}:${workflow.target}:${businessHash(current.value)}`;
      const action = { id: `a${result.actions.length}`, sequence: result.actions.length, eventId: current.id, rootId: input.id, workflowId: workflow.id, source: workflow.source, target: workflow.target, status: "delivered" as "delivered" | "suppressed" | "retry", reason: "Business update delivered", emittedEventId: null as string | null };
      if (workflow.repair === "disable") { action.status = "suppressed"; action.reason = "Workflow disabled"; }
      else if (workflow.repair === "deduplicate" && processed.has(key)) { action.status = "suppressed"; action.reason = "This change already completed this workflow"; }
      else if (workflow.repair === "suppress-noop" && result.records[workflow.target] && businessHash(result.records[workflow.target]!) === businessHash(current.value)) { action.status = "suppressed"; action.reason = "Destination business fields already match"; }
      else if ((failures.get(key) ?? 0) < (workflow.failuresBeforeSuccess ?? 0)) {
        failures.set(key, (failures.get(key) ?? 0) + 1);
        action.status = "retry"; action.reason = "Temporary delivery failure; retry remains within its bound";
        queue.push(current);
      } else {
        processed.add(key);
        if (successful.has(key)) result.metrics.repeated++;
        successful.add(key);
        result.records[workflow.target] = structuredClone(current.value);
        const emitted = event(workflow.target, current.id, workflow.id);
        action.emittedEventId = emitted.id;
        queue.push(emitted);
      }
      result.actions.push(action);
    }
  }
  result.pendingEvents = queue.length;
  result.termination = queue.length === 0 ? "drained" : "budget-exhausted";
  // Every system reachable in the original topology is a required destination.
  // This set is fixed before evaluating changes, so disabling an edge cannot weaken the goals.
  const reachable = new Set<SystemId>([input.origin]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const workflow of scenario.workflows) {
      if (reachable.has(workflow.source) && !reachable.has(workflow.target)) { reachable.add(workflow.target); expanded = true; }
    }
  }
  result.goals = Array.from(reachable).map((system) => ({ system, passed: Boolean(result.records[system] && businessHash(result.records[system]!) === businessHash(input.value)) }));
  result.metrics.attempted = result.actions.length;
  result.metrics.delivered = result.actions.filter((item) => item.status === "delivered").length;
  result.metrics.suppressed = result.actions.filter((item) => item.status === "suppressed").length;
  result.metrics.retries = result.actions.filter((item) => item.status === "retry").length;
  result.metrics.goalsPassed = result.goals.filter((item) => item.passed).length;
  result.metrics.goalsTotal = result.goals.length;
  return result;
}

export function evaluateCandidate(scenario: Scenario, input: InputChange, workflowIdsInput: string | string[], kind: Candidate["kind"]): Candidate {
  const workflowIds = [...new Set(typeof workflowIdsInput === "string" ? [workflowIdsInput] : workflowIdsInput)].sort();
  if (!workflowIds.length) throw new Error("A repair must include at least one workflow.");
  const patched = structuredClone(scenario);
  for (const workflowId of workflowIds) {
    const workflow = patched.workflows.find((item) => item.id === workflowId);
    if (!workflow) throw new Error("Repair workflow is not present in this run.");
    workflow.repair = kind;
  }
  const baselineReplay = simulate(patched, input);
  // Probe from all supported origins, on top of the repaired run's state.
  // A new change ID and business version test that guards do not permanently lock a record.
  const probes: VerificationProbe[] = scenario.systems.map((origin, index) => {
    const replay = simulate(patched, { id: `${input.id}:fresh:${origin}`, origin, value: { ...input.value, status: "qualified", version: input.value.version + index + 1 } }, baselineReplay.records);
    return { origin, termination: replay.termination, passed: replay.termination === "drained" && replay.metrics.repeated === 0 && replay.goals.every((goal) => goal.passed), delivered: replay.metrics.delivered, goalsPassed: replay.metrics.goalsPassed, goalsTotal: replay.metrics.goalsTotal, repeated: replay.metrics.repeated };
  });
  const baselinePassed = baselineReplay.termination === "drained" && baselineReplay.metrics.repeated === 0 && baselineReplay.goals.every((goal) => goal.passed);
  const eligible = baselinePassed && probes.every((probe) => probe.passed);
  const label = { disable: "Disable workflow", deduplicate: "Deduplicate this change", "suppress-noop": "Skip unchanged writes" }[kind];
  const reason = !baselinePassed
    ? baselineReplay.termination !== "drained" ? "Feedback still exhausts the action budget." : baselineReplay.metrics.repeated > 0 ? "Repeated side effects remain." : "A required destination no longer receives the update."
    : probes.some((probe) => !probe.passed) ? "A fresh edit fails its delivery or termination check." : "Feedback stops; required deliveries and all fresh-edit checks pass.";
  const description = workflowIds.length === 1 ? patched.workflows.find((item) => item.id === workflowIds[0])!.name : `${workflowIds.length} connected workflows`;
  return { id: `${workflowIds.join("+")}:${kind}`, workflowId: workflowIds[0], workflowIds, kind, title: `${label} · ${description}`, eligible, reason, score: workflowIds.length * 10 + (kind === "suppress-noop" ? 1 : kind === "deduplicate" ? 2 : 100), baselineReplay, probes };
}
