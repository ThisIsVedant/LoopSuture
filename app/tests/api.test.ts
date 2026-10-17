import assert from "node:assert/strict";
import test from "node:test";
import type { Run } from "../src/lib/domain";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3025";
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(`${base}${path}`, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}

test("investigate graph evidence and rank supported repairs", async () => {
  const created = await api("/api/runs", { scenarioId: "three-way" });
  assert.equal(created.status, 201);
  const run = created.body as Run;
  const investigated = await api(`/api/runs/${run.id}/investigate`);
  assert.equal(investigated.status, 200);
  const result = investigated.body as Run;
  assert.ok(result.investigation?.paths.length);
  assert.equal(result.investigation.status, "repair-found");
  assert.equal(result.investigation.candidates.length, 17);
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
