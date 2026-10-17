# LoopSuture

A Next.js + TypeScript workbench that investigates runaway synthetic automations using FalkorDB, compares supported repairs, and checks that useful deliveries survive.

## Run locally

Requires Node.js 20.9+, pnpm, and Docker Desktop with its Linux engine running.

```powershell
pnpm install
docker compose up -d
pnpm dev
```

Open http://localhost:3025. FalkorDB uses localhost:6388; its browser is available at http://localhost:3088. Database ports are bound to this computer only. If a manually started `loopsuture-falkordb` container already exists, start that container instead of creating a second one. The named volume preserves its database across restarts.

The application defaults to these local database settings. Copy `.env.example` to `.env.local` to change them. Never commit credentials.

## Working capabilities

- Executable two-system feedback, three-system feedback, duplicate-delivery, and healthy-retry scenarios.
- Distinct user-change identity, parent event links, business-value versions, and an explicit 48-action bound.
- FalkorDB storage for runs, revision-scoped topology, actual event ancestry, and actions.
- Graph investigation that retrieves return paths and repeated successful effects.
- Supported disable, deduplication, and unchanged-write repair candidates.
- Fixed required delivery goals plus fresh-edit checks from every supported origin.
- Verified repair application with revision checks, followed by actual fresh edits.
- Persistent run history, exportable JSON reports, and an interactive React Flow workbench.

## Optional model investigation

Without a model key, the app explicitly uses deterministic graph analysis. Gemini uses Google's stateless Interactions API. Add these settings to the ignored `.env.local` file, then restart the server:

```dotenv
LLM_PROVIDER=gemini
LLM_API_KEY=your-private-google-ai-studio-key
LLM_MODEL=gemini-3.1-flash-lite
LLM_REASONING_EFFORT=low
LLM_FALLBACK_MODEL=gemini-3.5-flash-lite
```

OpenAI or compatible providers use the Chat Completions tool protocol; set `LLM_PROVIDER=openai` or `compatible`, `LLM_API_KEY`, `LLM_MODEL`, and optionally `LLM_BASE_URL`. Gemini credentials always go to Google's endpoint. Keys remain on the server and are never sent to the browser.

The model must request inspect/trace/evaluate evidence before its explanation is labelled as model mode. Its structured conclusion must name the same repair as the verified ranking, or the application retains graph mode. It cannot authorize an ineligible patch or execute arbitrary code. Gemini uses the stable `v1/interactions` endpoint and the documented text/JSON response format.

Temporary server failures and network/body timeouts get up to two retries with exponential backoff. A configured fallback model starts a fresh conversation, including fresh evidence requests; signed steps never cross models. The whole investigation is capped at 120 seconds and nine HTTP requests, with a 25-second limit per request. With fallback enabled, the primary gets at most 60 seconds. A long `Retry-After` stops retries rather than ignoring Google's delay. Quota, authentication, schema, and contradictory-conclusion errors do not trigger retries or fallback.

Requests use `store=false` and preserve signed steps for stateless continuation. Successful model reports are reused without extra inference. Failed reports and reports created before a key was configured can be retried on the same run using the interface button. Only synthetic run evidence is sent by the current demo. Both configured models have a free tier according to [Google's pricing](https://ai.google.dev/gemini-api/docs/pricing); availability and limits depend on the Google project.

Model integration is optional and requires a separately supplied credential. Do not claim model behavior was tested unless a configured provider was exercised. Provider failure leaves the deterministic evidence report available.

## Verification

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
# With pnpm dev already running:
pnpm test:api
# With a configured provider; exercises actual inference and can consume quota:
pnpm test:model
# Retry one saved failed run without recreating the scenario:
pnpm test:model --resume=your-run-id
```

Unit tests verify the simulator's delivery and identity semantics. API tests execute the complete workflow against the running application and real FalkorDB, including rejected candidates, stale revisions, fresh edits, and saved history.

## Graph model and essential queries

`Run` owns revision-scoped `System` and `Workflow` nodes. Actual `Event` instances are linked through `CAUSED`. Each event `TRIGGERED` an `Action`, which `USED_WORKFLOW` and may have `EMITTED` another event. Workflow topology and execution ancestry are separate: topology may cycle; event ancestry consists of distinct instances.

Investigation uses two essential graph operations:

1. Traverse `CAUSED` paths from the root event to later events with equal originating change, system, and business payload. Return event and system paths.
2. Group successful action nodes by workflow and originating change to identify repeated effects, including duplicate webhooks that have no topology cycle.

The exact Cypher is in `src/lib/graph.ts`. Workflow configuration for replay is queried from graph nodes rather than selected from a scenario-specific diagnosis table. All queries use parameters. Earlier revision evidence is retained. An incomplete projection is not marked ready, and graph failure prevents investigation and repair application.

## Scope and limitations

This is a local synthetic demonstration, not a native integration with a real CRM or messaging platform. It performs actual in-process event propagation and configuration changes. Checks cover declared inputs and a bounded execution horizon; they do not prove arbitrary production safety or globally optimal repair.

The application supports one server process; its per-run locks are in-process. Durable distributed locking, authentication, rate limiting, arbitrary integration support, and deployment hardening are future work. Keep the default local binding for development. Prior failures are contained; disabling a connection may halt feedback but is rejected when declared deliveries fail.

## Event context and attribution

Target: Graph Hacks Track 1. Planning documents are in `../docs`.

Loop prevention and graph-based detection already exist. Related work includes [Zapier's prevention guidance](https://help.zapier.com/hc/en-us/articles/8496232045453-Zap-is-stuck-in-a-loop), [IAL-Scan](https://arxiv.org/abs/2607.01641), and [Prova](https://prova.cobound.dev/blog/how-prova-detects-coordination-loops). Our proposed contribution is connected investigation, constrained repair comparison, and delivery-preservation checks in one workbench.

AI assistance: Codex assisted with planning, implementation, and verification. The participant must review and understand the submitted code. No prize outcome or worldwide originality is guaranteed.
