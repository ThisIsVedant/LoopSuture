import assert from "node:assert/strict";
import test from "node:test";
import type { Run } from "../src/lib/domain";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3025";
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(`${base}${path}`, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}

test("live FalkorDB-backed investigation, rejected repair, selected repair, fresh edit and persisted history", async () => {
  const created = await api("/api/runs", { scenarioId: "three-way" });
  assert.equal(created.status, 201);
  const run = created.body as Run;
  const investigated = await api(`/api/runs/${run.id}/investigate`);
  assert.equal(investigated.status, 200);
  const result = investigated.body as Run;
  assert.ok(result.investigation?.paths.length);
  assert.equal(result.investigation.status, "repair-found");
  assert.equal(result.investigation.candidates.length, 17);
  const rejected = result.investigation.candidates.find((candidate) => !candidate.eligible)!;
  const badApply = await api(`/api/runs/${run.id}/repair`, { candidateId: rejected.id, revision: 0 });
  assert.equal(badApply.status, 422);
  const repaired = await api(`/api/runs/${run.id}/repair`, { candidateId: result.investigation.selectedId, revision: 0 });
  assert.equal(repaired.status, 200);
  assert.equal(repaired.body.simulation.termination, "drained");
  assert.equal(repaired.body.simulation.metrics.repeated, 0);
  assert.equal(repaired.body.history[0].simulation.termination, "budget-exhausted");
  const stale = await api(`/api/runs/${run.id}/repair`, { candidateId: result.investigation.selectedId, revision: 0 });
  assert.equal(stale.status, 409);
  const edited = await api(`/api/runs/${run.id}/edit`, { origin: "marketing", status: "qualified" });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.revision, 2);
  assert.equal(edited.body.simulation.termination, "drained");
  assert.equal(edited.body.simulation.metrics.repeated, 0);
  assert.ok(edited.body.simulation.goals.every((goal: { passed: boolean }) => goal.passed));
  const persisted = await api(`/api/runs/${run.id}`, undefined, "GET");
  assert.equal(persisted.body.revision, 2);
  assert.equal(persisted.body.history.length, 2);
});
test("healthy retries are not repaired, while repeated webhook effects are identified through graph actions", async () => {
  const healthy = await api("/api/runs", { scenarioId: "healthy-retry" });
  const report = await api(`/api/runs/${healthy.body.id}/investigate`);
  assert.equal(report.status, 200);
  assert.equal(report.body.investigation.status, "healthy");
  assert.equal(report.body.investigation.candidates.length, 0);
  const duplicate = await api("/api/runs", { scenarioId: "duplicate" });
  const duplicateReport = await api(`/api/runs/${duplicate.body.id}/investigate`);
  assert.equal(duplicateReport.status, 200);
  assert.equal(duplicateReport.body.investigation.paths.length, 0);
  assert.equal(duplicateReport.body.investigation.status, "repair-found");
});
test("malformed input, wrong origin, unknown run, and cross-origin mutations are rejected", async () => {
  assert.equal((await api("/api/runs", { scenarioId: "unknown" })).status, 400);
  assert.equal((await api("/api/runs", { scenarioId: "two-way", origin: "marketing" })).status, 400);
  assert.equal((await api("/api/runs/not-a-run", undefined, "GET")).status, 400);
  const response = await fetch(`${base}/api/runs`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://unrelated.example" }, body: JSON.stringify({ scenarioId: "two-way" }) });
  assert.equal(response.status, 403);
  const sameOrigin = await fetch(`${base}/api/runs`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ scenarioId: "two-way" }) });
  assert.equal(sameOrigin.status, 201);
});
