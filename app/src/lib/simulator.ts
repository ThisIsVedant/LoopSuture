import type { BusinessValue, InputChange, Scenario, Simulation, SystemId } from "./domain";

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
      if (workflow.repair === "deduplicate" && processed.has(key)) { action.status = "suppressed"; action.reason = "This change already completed this workflow"; }
      else {
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
