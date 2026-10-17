import assert from "node:assert/strict";
import test from "node:test";
import { getScenario } from "../src/lib/scenarios";
import { simulate } from "../src/lib/simulator";
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
