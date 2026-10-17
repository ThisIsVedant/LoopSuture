import assert from "node:assert/strict";
import test from "node:test";
import type { Run } from "../src/lib/domain";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3025";
async function api(path: string, body?: unknown, method = "POST") {
  const response = await fetch(`${base}${path}`, { method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}

test("create and retrieve a graph-backed simulation run", async () => {
  const created = await api("/api/runs", { scenarioId: "three-way" });
  assert.equal(created.status, 201);
  const run = created.body as Run;
  const loaded = await api(`/api/runs/${run.id}`, undefined, "GET");
  assert.equal(loaded.body.id, run.id);
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
