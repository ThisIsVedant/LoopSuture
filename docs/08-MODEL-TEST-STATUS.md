# Model connection test status

Historical provider checks.

Latest update October 17: both live model scenarios now pass, including the healthy retry control. See [demo video and fresh verification](10-DEMO-VIDEO-AND-VERIFICATION.md).

The latest implementation and checks supersede this earlier test record: see [Gemini reliability verification](09-GEMINI-RELIABILITY.md). The corrected stable API now passes the actual loop/ranked-repair/fresh-edit workflow. Thirty unit tests and the browser retry control pass. The healthy live model check is still interrupted by Google's availability failures.

## Configuration

The participant authorized testing with a Google AI Studio key. The private key is stored only in `app/.env.local`, excluded by `.gitignore`. It is absent from source, documentation, and test output. No billing settings were changed. The active model is `gemini-3.1-flash-lite` with low thinking effort.

Gemini uses Google's Interactions API with `store=false`. Full signed model steps are preserved for stateless tool continuation. The server exposes only model configuration metadata to the browser. Requests use synthetic scenario evidence.

## Observed results

- Google authentication/model catalog: HTTP 200.
- Gemini 3.8 Flash and 3.5 Flash-Lite: high-demand HTTP 503 responses; some requests timed out.
- Gemini 2.5 Flash-Lite: HTTP 404, unavailable to new users.
- Gemini 3.1 Flash-Lite: successful basic inference and tool requests.
- Initial complete app investigations: three-way feedback and healthy retries both completed in model mode and requested inspect/trace/evaluate evidence.
- Applying the verified repair after the initial feedback investigation eliminated repeats; a fresh marketing edit drained and preserved all required deliveries.
- Reviewing the initial explanation exposed an incorrect preference for a broader eligible repair. The evidence payload now includes scores, authoritative selection, rejection reasons, and ranking rules. A structured conclusion must match the verified selected candidate ID or the app retains graph mode.
- Revalidation with the stricter conclusion check encountered a temporary Google high-demand failure after all evidence tools completed. The report honestly retained graph mode.

The final stricter live-test rerun also failed when the first tool request timed out. The current integration's recommendation check passes local tests, but a complete live run after that check was added remains unverified because of provider availability. Earlier successful model runs are not presented as a passing test of the stricter final implementation.

## Local verification

TypeScript, ESLint, production build, and 18 unit tests passed. Tests include provider endpoint isolation, sanitized quota/high-demand errors, malformed conclusions, rejection of a model-selected repair that disagrees with ranking, and simulator delivery/identity behavior.

Run `pnpm test:model` with the local app running to exercise both actual model investigations and verified repair/fresh-edit checks. This deliberately fails if the app falls back to graph mode. It consumes provider allowance.

## Previous OpenAI attempt

The earlier OpenAI project key authenticated, but inference returned HTTP 429 with `credit_balance_exhausted` / `insufficient_quota`. It is no longer the active provider. API key billing and ChatGPT subscription access are separate integrations.

## Operational limits and sources

Google free-tier availability and quotas vary by model/project. High demand can interrupt a valid key's requests; the app reports failure and retains deterministic graph evidence. No successful inference is inferred from authentication alone. Rotate credentials pasted into chat and replace the private environment value.

- [Google Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview)
- [Function calling and stateless continuation](https://ai.google.dev/gemini-api/docs/function-calling)
- [Model pricing and free tier](https://ai.google.dev/gemini-api/docs/pricing)
