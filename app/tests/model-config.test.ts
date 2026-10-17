import assert from "node:assert/strict";
import test from "node:test";
import { functionTool, readModelSettings } from "../src/lib/model-config";

test("switching to Gemini cannot send its credential to a stale OpenAI endpoint", () => {
  const settings = readModelSettings({ LLM_PROVIDER: "gemini", LLM_API_KEY: "test-credential", LLM_MODEL: "gemini-3.1-flash-lite", LLM_BASE_URL: "https://api.openai.com/v1" });
  assert.equal(settings?.baseUrl, "https://generativelanguage.googleapis.com/v1");
  assert.equal(settings?.label, "Gemini");
});
test("zero-argument tools use the provider's supported schema", () => {
  assert.equal("parameters" in functionTool("trace_feedback", "gemini").function, false);
  assert.equal("parameters" in functionTool("trace_feedback", "openai").function, true);
});
test("incomplete settings stay in deterministic graph mode", () => {
  assert.equal(readModelSettings({ LLM_API_KEY: "test-credential" }), null);
  assert.equal(readModelSettings({ LLM_MODEL: "test-model" }), null);
});
