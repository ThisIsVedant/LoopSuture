# LoopSuture

**Find runaway automation loops, compare repairs, and check that useful work still completes.**

LoopSuture is a Next.js and TypeScript workbench backed by FalkorDB. It follows a change across connected systems, identifies repeated effects, and evaluates targeted workflow guards before applying a repair. Optional Gemini investigation explains the graph and replay evidence through constrained tools.

Built for **Graph Hacks — Track 1: Agents That Act on Connected Data**. The current application runs locally with synthetic CRM, support, and marketing services. Their event propagation and configuration changes execute in the application; FalkorDB stores and queries the resulting evidence.

## What it does

- Runs three-system feedback, two-system feedback, duplicate-webhook, and healthy-retry scenarios.
- Tracks originating changes, business-value versions, parent events, successful effects, and retries.
- Uses graph queries to find causal return paths and repeated successful effects.
- Compares disabling workflows, deduplicating changes, and suppressing unchanged writes, including combinations of guards.
- Rejects repairs that break required deliveries or fail fresh-edit checks.
- Applies a verified repair with revision checks, then executes new edits against the repaired configuration.
- Saves run history and exports JSON evidence reports from an interactive graph workbench.

## Run locally

Requires **Node.js 20.9+**, **pnpm** (the project pins `11.0.9`), and **Docker Desktop with its Linux engine running**.

From the repository root:

```powershell
cd app
pnpm install --frozen-lockfile
docker compose up -d
pnpm dev
```

Open [LoopSuture](http://127.0.0.1:3025). FalkorDB listens on `127.0.0.1:6388`; its [database browser](http://127.0.0.1:3088) uses port `3088`. The database ports are bound to this computer, and a named Docker volume preserves saved runs across restarts.

Default database settings work without an environment file. To change them or enable a model, copy [app/.env.example](app/.env.example) to `app/.env.local`. If a manually created `loopsuture-falkordb` container already exists, start that container instead of creating another with the same name.

### Optional Gemini investigation

Add these values to `app/.env.local` and restart the server:

```dotenv
LLM_PROVIDER=gemini
LLM_API_KEY=your-private-google-ai-studio-key
LLM_MODEL=gemini-3.1-flash-lite
LLM_REASONING_EFFORT=low
LLM_FALLBACK_MODEL=gemini-3.5-flash-lite
```

Credentials stay on the server. Environment files containing secrets are ignored by Git; the credential-free `.env.example` is included.

Without a key, the application labels its investigation as deterministic **graph mode**. To produce a model-mode report, Gemini must request run inspection, causal tracing, and repair evaluation, then return a conclusion consistent with the verified candidate ranking. The model cannot authorize an ineligible repair.

Temporary provider failures receive bounded retries and an optional fresh investigation with the fallback model. The investigation has a 120-second overall limit and a nine-request cap. If it fails, graph evidence remains available and the same run can be retried. Successful model reports are cached. See the [application README](app/README.md) for provider configuration and recovery details.

## Try the demo flow

1. Run the three-system feedback scenario and inspect its repeated effects.
2. Investigate the run; follow the causal graph and compare the 17 evaluated repair candidates.
3. Review why candidates fail delivery or fresh-edit checks, then apply the selected repair.
4. Send a fresh marketing edit and verify that all required destinations receive it without repeated effects.
5. Run the healthy-retry control and confirm that it needs no repair.

Observed results from the October 17, 2026 verification session:

| Scenario | Observed execution | Repeated effects | Required destinations |
| --- | --- | --- | --- |
| Faulty three-system baseline | 48 attempted actions; action bound reached | 45 | 3/3 |
| Applied repair | 3 attempted actions; queue drained | 0 | 3/3 |
| Fresh marketing edit | 4 attempted actions; queue drained | 0 | 3/3 |
| Healthy-retry control | 2 retries; queue drained | 0 | 2/2 |

The selected repair suppresses unchanged writes on two workflows. Both the loop investigation and healthy-control investigation completed with live Gemini on October 17. These are measured synthetic fixture results within a bounded execution horizon, not a general production-safety guarantee. See [fresh verification evidence](docs/10-DEMO-VIDEO-AND-VERIFICATION.md).

## Architecture and graph model

The Next.js interface displays the execution graph, investigation, candidates, and receipts. Server-side handlers coordinate the simulator, FalkorDB queries, repair evaluation, and optional model tools. The simulator executes the supported service behaviors in-process.

`Run` owns revision-scoped `System` and `Workflow` nodes. Actual `Event` instances connect through `CAUSED`. An event `TRIGGERED` an `Action`, which `USED_WORKFLOW` and may have `EMITTED` another event. Workflow topology can contain cycles; event ancestry records distinct execution instances.

Two essential graph operations drive investigation:

1. Traverse `CAUSED` paths to later events with the same originating change, system, and business payload, returning the event and system paths.
2. Group successful actions by workflow and originating change to identify repeated effects, including duplicate webhooks without a topology cycle.

The parameterized Cypher and graph projection are in [app/src/lib/graph.ts](app/src/lib/graph.ts). Replay configuration comes from graph nodes. Incomplete graph projections are not marked ready, and a database failure prevents investigation or repair application. The graph supplies operational evidence for repair decisions.

## Verification

Run from `app/`:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

With the application and FalkorDB running:

```powershell
pnpm test:api
# Requires a configured model provider and consumes its allowance:
pnpm test:model
# Browser flows require Google Chrome:
pnpm exec playwright test
```

The 30-test unit suite passed during the October 17 recording session. Type checking, linting, production build, API integration, browser flows, database recovery, and provider-failure recovery also have recorded passing checks; see [implementation status](docs/07-IMPLEMENTATION-STATUS.md) for their scope. Live loop and healthy-control model investigations passed on October 17.

## Documentation

- [Application setup and operational details](app/README.md)
- [Current implementation status](docs/07-IMPLEMENTATION-STATUS.md)
- [Latest demo verification](docs/10-DEMO-VIDEO-AND-VERIFICATION.md)
- [Gemini reliability design and earlier checks](docs/09-GEMINI-RELIABILITY.md)
- [Product requirements](docs/01-PRD.md)
- [Architecture notes](docs/02-ARCHITECTURE.md)
- [Research, related work, and differentiation](docs/05-RESEARCH.md)
- [Submission checklist and decisions](docs/06-DECISIONS-AND-SUBMISSION.md)

The original planning documents describe intended scope; implementation status records what currently works. Presentation recordings and production assets are maintained locally and excluded from this repository through `/presentation/` in the root `.gitignore`.

## Scope and limitations

The current demo uses synthetic service adapters and one application server process with in-process locks. Native SaaS integrations, durable distributed execution, authentication, rate limiting, and public deployment hardening remain future work. Repair checks cover declared goals, supported origins, evaluated candidates, and a bounded execution horizon. They do not establish global optimality or arbitrary production correctness.

Loop prevention and graph-based diagnosis have prior art. The project explores combining connected investigation, constrained repair comparison, and delivery-preservation checks in one workbench; it makes no claim of worldwide originality or a guaranteed prize outcome.

## Event context and AI assistance

Event: [Graph Hacks: Context for AI Agents](https://www.wemakedevs.org/hackathons/falkordb). Target: Track 1, Agents That Act on Connected Data.

See the [event rules](https://www.wemakedevs.org/hackathons/falkordb/rules) for submission requirements.

**AI assistance:** Codex assisted with planning, implementation, verification, and demo materials. Demo narration is synthetic. The participant must review and understand the code, graph queries, and repair decisions and ensure meaningful personal contribution before submission.
