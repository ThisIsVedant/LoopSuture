import assert from "node:assert/strict";
import test from "node:test";
import { verifiedModelConclusion } from "../src/lib/model-conclusion";

test("a broader eligible repair cannot replace the verified ranking winner", () => {
  assert.throws(() => verifiedModelConclusion(JSON.stringify({ selectedCandidateId: "three-guards", explanation: "Use three guards." }), "two-guards"), /disagreed/);
  assert.equal(verifiedModelConclusion(JSON.stringify({ selectedCandidateId: "two-guards", explanation: "Two guards preserve all deliveries." }), "two-guards"), "Two guards preserve all deliveries.");
});
test("healthy runs require no candidate and malformed model conclusions fail closed", () => {
  assert.equal(verifiedModelConclusion(JSON.stringify({ selectedCandidateId: null, explanation: "Bounded retries drained." }), null), "Bounded retries drained.");
  for (const response of ["unfinished", "null", '{}', '{"selectedCandidateId":null,"explanation":""}']) assert.throws(() => verifiedModelConclusion(response, null));
});
