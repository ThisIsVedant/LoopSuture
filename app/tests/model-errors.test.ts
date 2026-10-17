import assert from "node:assert/strict";
import test from "node:test";
import { providerFailure, providerFailureFromResponse } from "../src/lib/model-errors";

test("exhausted credits are distinguished from transient rate limits", () => {
  const quota = providerFailure(429, "credit_balance_exhausted", "insufficient_quota");
  const rate = providerFailure(429, "rate_limit_exceeded", "rate_limit_error");
  assert.match(quota.message, /credits are exhausted/);
  assert.match(rate.message, /rate limit/);
  assert.doesNotMatch(quota.message, /Wait before/);
});
test("credential, permission, and model errors identify the action needed without provider text", () => {
  assert.match(providerFailure(401, "invalid_api_key", "authentication_error").message, /server-only credential/);
  assert.match(providerFailure(403, "permission_denied", "permission_error").message, /permission/);
  assert.match(providerFailure(404, "model_not_found", "invalid_request_error").message, /accessible model/);
});
test("unrecognized provider identifiers are never echoed into user-facing errors", () => {
  const secretLike = "sk-proj-test-value-that-must-not-be-echoed";
  const failure = providerFailure(400, secretLike, { private: secretLike });
  assert.ok(!failure.message.includes(secretLike));
  assert.match(failure.message, /graph and replay report remains available/);
});
test("Gemini quota errors point to Google allowance rather than OpenAI credits", () => {
  const error = providerFailure(429, 429, "RESOURCE_EXHAUSTED", "Gemini");
  assert.match(error.message, /Google AI Studio/);
  assert.doesNotMatch(error.message, /OpenAI/);
});
test("array-wrapped Google errors are recognized without echoing their messages", () => {
  const error = providerFailureFromResponse(429, [{ error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Private provider detail" } }], "Gemini");
  assert.match(error.message, /Google AI Studio/);
  assert.doesNotMatch(error.message, /Private provider detail/);
});
test("Google high demand is distinguished from credential and quota failures", () => {
  const error = providerFailureFromResponse(503, [{ error: { code: 503, status: "UNAVAILABLE" } }], "Gemini");
  assert.match(error.message, /high demand/);
  assert.doesNotMatch(error.message, /credits are exhausted|invalid or expired/);
});
