import assert from "node:assert/strict";
import test from "node:test";
import { reuseInvestigation } from "../src/lib/investigation-cache";
import type { Investigation } from "../src/lib/domain";

const report: Investigation = { revision: 0, status: "healthy", paths: [], candidates: [], selectedId: null, explanation: "Healthy.", mode: "graph", receipts: [] };
test("a failed model investigation can retry on the same run and revision", () => {
  assert.equal(reuseInvestigation({ ...report, modelNote: "Google unavailable" }, 0, true), false);
  assert.equal(reuseInvestigation({ ...report, modelNote: "Google unavailable" }, 0, false), true);
});
test("successful results are reused, while changed revisions require new evidence", () => {
  assert.equal(reuseInvestigation({ ...report, mode: "model" }, 0, true), true);
  assert.equal(reuseInvestigation(report, 0, false), true);
  assert.equal(reuseInvestigation(report, 0, true), false, "Reports created before a model was configured can be upgraded");
  assert.equal(reuseInvestigation(report, 1, true), false);
  assert.equal(reuseInvestigation(undefined, 0, true), false);
});
