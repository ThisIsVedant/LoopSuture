import assert from "node:assert/strict";
import test from "node:test";
import { getScenario } from "../src/lib/scenarios";
import { evaluateCandidate, simulate } from "../src/lib/simulator";
const input = { id: "change-1", origin: "crm" as const, value: { name: "Synthetic customer", status: "new", version: 1 } };

test("a three-system feedback loop exhausts its bound while recording honest causal ancestry", () => {
  const result = simulate(getScenario("three-way"), input);
  assert.equal(result.termination, "budget-exhausted");
  assert.equal(result.actions.length, 48);
  assert.ok(result.metrics.repeated > 0);
  assert.ok(result.pendingEvents > 0);
  for (const event of result.events.slice(1)) {
    const parent = result.events.find((item) => item.id === event.parentId);
    assert.ok(parent);
    assert.ok(parent.sequence < event.sequence);
    assert.equal(parent.rootId, event.rootId);
  }
});
test("cutting a connection is rejected when a fresh edit cannot reach its required destination", () => {
  const candidate = evaluateCandidate(getScenario("two-way"), input, "support-crm", "disable");
  assert.equal(candidate.baselineReplay.termination, "drained");
  assert.equal(candidate.eligible, false);
  assert.equal(candidate.probes.find((probe) => probe.origin === "support")?.passed, false);
});
test("a single guard with repeats from another origin is rejected; two guards preserve every origin", () => {
  const single = evaluateCandidate(getScenario("three-way"), input, "crm-support", "suppress-noop");
  assert.equal(single.eligible, false);
  const candidate = evaluateCandidate(getScenario("three-way"), input, ["crm-support", "support-marketing"], "suppress-noop");
  assert.equal(candidate.eligible, true);
  assert.equal(candidate.baselineReplay.metrics.repeated, 0);
  assert.ok(candidate.probes.every((probe) => probe.passed));
  assert.equal(candidate.probes.length, 3);
});
test("duplicate deliveries execute one effect but a distinct later change to the same customer still executes", () => {
  const scenario = getScenario("duplicate");
  scenario.workflows[0].repair = "deduplicate";
  const first = simulate(scenario, input);
  assert.equal(first.metrics.delivered, 1);
  assert.equal(first.metrics.suppressed, 3);
  const later = simulate(scenario, { ...input, id: "change-2", value: { ...input.value, version: 2 } }, first.records);
  assert.equal(later.metrics.delivered, 1);
  assert.equal(later.records.marketing?.version, 2);
});
test("healthy bounded retries are preserved and do not count as repeated successful effects", () => {
  const result = simulate(getScenario("healthy-retry"), input);
  assert.equal(result.termination, "drained");
  assert.equal(result.metrics.retries, 2);
  assert.equal(result.metrics.delivered, 1);
  assert.equal(result.metrics.repeated, 0);
  assert.ok(result.goals.every((goal) => goal.passed));
});
test("candidate evaluation does not mutate the scenario or shared starting state", () => {
  const scenario = getScenario("three-way");
  const original = structuredClone(scenario);
  evaluateCandidate(scenario, input, "crm-support", "suppress-noop");
  assert.deepEqual(scenario, original);
  assert.deepEqual(simulate(scenario, input), simulate(scenario, input));
});
test("a budget stop cannot pass even if all destination values were updated", () => {
  const candidate = evaluateCandidate(getScenario("three-way"), input, ["crm-support", "support-marketing", "marketing-crm"], "deduplicate");
  assert.equal(candidate.eligible, true);
  const scenario = getScenario("three-way");
  scenario.actionBudget = 2;
  const bounded = evaluateCandidate(scenario, input, "crm-support", "suppress-noop");
  assert.equal(bounded.baselineReplay.metrics.goalsPassed, bounded.baselineReplay.metrics.goalsTotal);
  assert.equal(bounded.baselineReplay.termination, "budget-exhausted");
  assert.equal(bounded.eligible, false);
});
