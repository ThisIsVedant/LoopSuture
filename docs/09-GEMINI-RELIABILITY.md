# Gemini investigation reliability

This document describes the final recovery implementation and distinguishes fault simulation from actual provider checks.

Update October 17: the previously blocked healthy live check completed successfully while recording the presentation. Both actual Gemini scenarios and the repair/fresh-edit flow passed. See [fresh video verification](10-DEMO-VIDEO-AND-VERIFICATION.md) for run IDs and measurements. The older availability results below remain a historical record.

## Changes

- Use Google's stable `v1/interactions` endpoint.
- Correct structured output to `type: text`, `mime_type: application/json`, and a nested `schema`. The older direct object schema was incorrect.
- Require all three evidence tools before accepting a structured conclusion.
- Reject a conclusion whose selected candidate ID disagrees with graph/replay ranking.
- Retry transient HTTP 408/500/502/503/504 and network/response-body timeouts with exponential backoff.
- At most three attempts per interaction, nine HTTP requests per investigation, 25 seconds per request, and 120 seconds overall. With fallback configured, the primary model has at most 60 seconds.
- Respect short `Retry-After` delays. A delay over five seconds stops same-request retries instead of retrying early.
- Do not retry or fail over on quota, authentication, invalid request, malformed output, unsupported tool calls, or contradictory conclusions.
- Optional fallback from `gemini-3.1-flash-lite` to `gemini-3.5-flash-lite`, both listed with a free tier by Google. A fallback starts a new conversation and retrieves all evidence again. Signed steps never cross model boundaries.
- Publish evidence receipts only from the model that completes successfully. Exported execution metadata records the actual model, aggregate request/retry counts, and elapsed time.
- Permit failed investigations and older graph-only reports to upgrade on the same run/revision. The interface provides a retry/run Gemini button. Successful model reports are cached without additional inference.
- Keep graph/replay evidence available if all provider attempts fail. Model mode is assigned only after evidence and conclusion validation succeed.

## Automated fault checks

Thirty unit tests passed, including simulator tests. The Gemini transport tests inject failures and verify exact stateless continuation, signed-step preservation, final JSON format, safe tool handling, malformed/incomplete/wrongly ranked output rejection, bounded retries, response-body timeouts, fallback context isolation, and total time bounds. These are simulated provider tests, not evidence that Google's service is always available.

One browser test passed for the same-run retry control using a simulated provider failure/recovery and actual app/FalkorDB run creation. Earlier desktop/mobile integration checks are recorded in the implementation status.

TypeScript, ESLint, and production build passed.

## Actual Google checks

The corrected stable endpoint produced valid structured JSON with a null candidate for a minimal probe.

Actual three-system investigation: run `ba3ec830-1265-4f7a-b034-38888f465fb9` completed in model mode. Gemini requested inspect/trace/evaluate evidence and named the verified `crm-support+marketing-crm:suppress-noop` repair. Its execution took 27,323 ms, with two HTTP requests and zero retries. Repair application eliminated repeated effects; a fresh marketing edit drained and preserved every required destination.

The healthy-run investigation encountered real Google high-demand/timeouts. Retrying saved run `a2c129f3-988e-4bc9-b095-a61006684656` exercised the new same-run path, but bounded retries and both configured models still failed to complete. The final report retained healthy graph mode with no repair selected. A separate minimal Gemini 3.5 Flash-Lite probe also timed out, confirming that the remaining provider failure is not limited to the app's healthy fixture. A full healthy live model pass remains unverified and is never inferred from a local fault test.

Provider availability is the outstanding external blocker. An additional minimal Gemini 3.6 Flash availability probe returned HTTP 429 with `too_many_requests`; it was not configured as a fallback and was not retried. The active configuration remains 3.1 Flash-Lite with 3.5 Flash-Lite fallback. No billing settings were changed. Successful model and failed provider attempts export request/retry/time metadata without exposing credentials or raw provider responses.

## Reproduce

With the app running and the private provider configuration in place:

```powershell
pnpm test
pnpm test:model
pnpm test:model --resume=a2c129f3-988e-4bc9-b095-a61006684656
pnpm exec playwright test tests/browser/gemini-retry.spec.ts
```

Actual model checks consume provider allowance. No billing settings were changed. API credentials remain in the ignored server environment file and are never included in reports or test output.

## References

- [Stable Interactions API and text response formats](https://ai.google.dev/api/interactions-api-v1)
- [Google retry guidance](https://ai.google.dev/gemini-api/docs/troubleshooting)
- [Free-tier model pricing](https://ai.google.dev/gemini-api/docs/pricing)
