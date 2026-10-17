import assert from "node:assert/strict";
import test from "node:test";
import { GEMINI_ENDPOINT, GeminiInvestigationError, runGeminiInvestigation } from "../src/lib/gemini-investigation";
import type { ModelSettings } from "../src/lib/model-config";

const settings: ModelSettings = { provider: "gemini", label: "Gemini", apiKey: "private-test-key", model: "gemini-3.1-flash-lite", baseUrl: "https://wrong-host.invalid", reasoningEffort: "low" };
const tools = { inspect_run: { repeated: 45 }, trace_feedback: ["crm", "support", "crm"], evaluate_repairs: { selectedCandidateId: "two-guards" } };
const signedSteps = [{ type: "thought", signature: "opaque-thought-signature" }, ...Object.keys(tools).map((name, i) => ({ type: "function_call", name, id: `call-${i}`, arguments: {}, signature: `opaque-call-${i}` }))];
const toolResponse = () => Response.json({ status: "requires_action", steps: signedSteps });
const finalResponse = (selectedId: string | null = "two-guards") => Response.json({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({ selectedCandidateId: selectedId, explanation: "The verified repair preserves deliveries." }) }] }] });

function harness(responses: (Response | Error)[], config: ModelSettings = settings) {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const delays: number[] = [];
  const called: string[] = [];
  let now = 0;
  const fetcher: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    const response = responses.shift();
    if (!response) throw new Error("Unexpected extra request");
    if (response instanceof Error) throw response;
    return response;
  };
  const invoke = () => runGeminiInvestigation(config, tools, "Read verified evidence.", "Investigate.", "two-guards", name => called.push(name), {
    fetch: fetcher, now: () => now, sleep: async ms => { delays.push(ms); now += ms; },
  });
  return { requests, delays, called, invoke };
}

test("stateless continuation preserves signatures and uses Google's actual JSON response format", async () => {
  const h = harness([toolResponse(), finalResponse()]);
  const result = await h.invoke();
  assert.equal(result.requests, 2);
  assert.equal(result.retries, 0);
  assert.deepEqual(h.called, Object.keys(tools));
  assert.ok(h.requests.every(request => request.url === GEMINI_ENDPOINT && request.body.store === false));
  const history = h.requests[1].body.input as unknown[];
  assert.deepEqual(history.slice(1, 5), signedSteps);
  assert.equal(history.length, 8);
  assert.deepEqual(h.requests[1].body.response_format, { type: "text", mime_type: "application/json", schema: {
    type: "object", properties: { selectedCandidateId: { type: ["string", "null"] }, explanation: { type: "string" } }, required: ["selectedCandidateId", "explanation"],
  } });
});

test("transient final-call failures retry the same history without repeating evidence execution", async () => {
  const h = harness([toolResponse(), Response.json({ error: { code: "service_unavailable" } }, { status: 503, headers: { "Retry-After": "2" } }), finalResponse()]);
  const result = await h.invoke();
  assert.equal(result.requests, 3);
  assert.equal(result.retries, 1);
  assert.deepEqual(h.delays, [2000]);
  assert.deepEqual(h.requests[1].body, h.requests[2].body);
  assert.deepEqual(h.called, Object.keys(tools));
});

test("timeout recovery is bounded and permanent outages stop after three attempts", async () => {
  const timedOut = new Error("Private transport detail"); timedOut.name = "TimeoutError";
  const recovery = harness([timedOut, toolResponse(), finalResponse()]);
  assert.equal((await recovery.invoke()).retries, 1);
  const outage = harness([503, 503, 503].map(status => Response.json({ error: { status: "UNAVAILABLE" } }, { status })));
  await assert.rejects(outage.invoke(), error => error instanceof GeminiInvestigationError && error.execution.requests === 3 && error.execution.retries === 2 && /temporarily unavailable/.test(error.message));
  assert.equal(outage.requests.length, 3);
  assert.deepEqual(outage.delays, [1000, 2000]);
});

test("a timeout while reading the response body retries without accepting incomplete JSON", async () => {
  const response = Response.json({});
  const timeout = new Error("Private transport error"); timeout.name = "AbortError";
  response.json = async () => { throw timeout; };
  const h = harness([response, toolResponse(), finalResponse()]);
  assert.equal((await h.invoke()).retries, 1);
  assert.equal(h.requests.length, 3);
});

test("credential, schema, and quota errors fail immediately without retries or secret text", async () => {
  for (const status of [400, 401, 403, 429]) {
    const h = harness([Response.json({ error: { message: settings.apiKey } }, { status })]);
    await assert.rejects(h.invoke(), error => error instanceof Error && !error.message.includes(settings.apiKey));
    assert.equal(h.requests.length, 1);
    assert.equal(h.delays.length, 0);
  }
  const h = harness([Response.json({}, { status: 503, headers: { "Retry-After": "60" } })]);
  await assert.rejects(h.invoke());
  assert.equal(h.requests.length, 1, "Never retry sooner than a long provider Retry-After");
});

test("unsupported tools, arguments, and duplicate call IDs cannot execute arbitrary actions", async () => {
  const invalid = [
    [{ type: "function_call", name: "__proto__", id: "a", arguments: {} }],
    [{ type: "function_call", name: "inspect_run", id: "a", arguments: { applyRepair: true } }],
    [{ type: "function_call", name: "inspect_run", id: "a" }, { type: "function_call", name: "trace_feedback", id: "a" }],
  ];
  for (const steps of invalid) {
    const h = harness([Response.json({ status: "requires_action", steps })]);
    await assert.rejects(h.invoke(), /unsupported|duplicate/);
    assert.equal(h.requests.length, 1);
  }
});

test("premature, malformed, truncated, or wrongly ranked conclusions never become successful model reports", async () => {
  const early = harness([finalResponse()]);
  await assert.rejects(early.invoke(), /required evidence/);
  const mismatched = harness([toolResponse(), finalResponse("three-guards")]);
  await assert.rejects(mismatched.invoke(), /disagreed/);
  const malformed = harness([toolResponse(), Response.json({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: "partial JSON" }] }] })]);
  await assert.rejects(malformed.invoke(), /incomplete conclusion/);
  const truncated = harness([toolResponse(), Response.json({ status: "incomplete", steps: [{ type: "model_output", content: [{ type: "text", text: "partial" }] }] })]);
  await assert.rejects(truncated.invoke());
});

test("a slow provider cannot extend the investigation's total time budget", async () => {
  let now = 0;
  let requests = 0;
  await assert.rejects(runGeminiInvestigation(settings, tools, "", "", "two-guards", () => {}, {
    now: () => now, sleep: async ms => { now += ms; }, fetch: async () => { requests++; now += 60000; return Response.json({}, { status: 503 }); },
  }), /temporarily unavailable|time limit/);
  assert.equal(requests, 2);
});
