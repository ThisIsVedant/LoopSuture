import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3025";
async function api(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(240000),
  });
  const data = await response.json();
  assert.ok(response.ok, `Application request failed with status ${response.status}.`);
  return data;
}
const health = await api("/api/health");
console.log(JSON.stringify({ graph: health.graph, model: health.model, provider: health.modelProvider, modelName: health.modelName }));
assert.equal(health.model, "configured");
const resumeId = process.argv.find(value => value.startsWith("--resume="))?.slice("--resume=".length);
if (resumeId) assert.match(resumeId, /^[a-f0-9-]{36}$/i, "Provide a valid saved run ID.");
const saved = resumeId ? await api(`/api/runs/${resumeId}`) : null;
for (const scenarioId of saved ? [saved.scenario.id] : ["three-way", "healthy-retry"]) {
  const run = saved ?? await api("/api/runs", { scenarioId });
  const result = await api(`/api/runs/${run.id}/investigate`, {});
  console.log(JSON.stringify({ scenarioId, runId: result.id, mode: result.investigation.mode, status: result.investigation.status, selectedId: result.investigation.selectedId, modelNote: result.investigation.modelNote, execution: result.investigation.modelExecution, tools: result.investigation.receipts.filter((item) => item.detail === "Model requested verified evidence.").map((item) => item.tool) }));
  assert.equal(result.investigation.mode, "model", "The model path did not complete; deterministic fallback is not a passing model test.");
  const requested = new Set(result.investigation.receipts.filter(item => item.detail === "Model requested verified evidence.").map(item => item.tool));
  for (const tool of ["inspect_run", "trace_feedback", "evaluate_repairs"]) assert.ok(requested.has(tool), `Missing model evidence tool: ${tool}`);
  if (scenarioId === "three-way") {
    const repaired = await api(`/api/runs/${run.id}/repair`, { candidateId: result.investigation.selectedId, revision: result.revision });
    assert.equal(repaired.simulation.metrics.repeated, 0);
    const fresh = await api(`/api/runs/${run.id}/edit`, { origin: "marketing", status: "qualified" });
    assert.equal(fresh.simulation.termination, "drained");
    assert.ok(fresh.simulation.goals.every((goal) => goal.passed));
    console.log("Verified repair and fresh-edit checks passed after model investigation.");
  } else {
    assert.equal(result.investigation.status, "healthy");
    assert.equal(result.investigation.selectedId, null);
    assert.equal(result.simulation.termination, "drained");
  }
}
