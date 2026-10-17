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
