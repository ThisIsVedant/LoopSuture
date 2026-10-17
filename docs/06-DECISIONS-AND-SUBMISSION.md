# Decisions, risks, and submission checklist

## Accepted planning decisions

| Decision | Reason |
| --- | --- |
| Target Track 1 | User's stated objective is the advertised iPhone prize |
| Solo scope | One participant and a four-day event |
| Next.js + TypeScript | User-selected stack; shared language for interface and tools |
| FalkorDB as primary database | Required technology and central connected-data reasoning |
| One investigating agent | Enough to demonstrate tool choice, reasoning, and action |
| Synthetic services first | A reproducible working demo without relying on private SaaS access |
| Fixed repair catalog | Executable, testable operations within the short build window |
| Preservation checks required | Stopping all work is not a successful business repair |

## Implementation choices to resolve at kickoff

- Model provider and model available to the participant; do not block the graph foundation on this choice.
- Exact supported event schema and business field comparison.
- Which repair family is implemented first.
- Bounded candidate search size and ranking weights.
- Per-run simulation/action budgets and investigation call budget.
- Local-first hosting versus a live deployment with an appropriate persistent runtime.
- Whether execution needs a separate TypeScript worker.
- Exact video duration and submission fields shown by the event panel.

## Principal risks

| Risk | Planned response |
| --- | --- |
| Most effort goes into UI before behavior works | Build the event-to-graph vertical slice first |
| Existing work makes the novelty claim too broad | Attribute prior work and describe the specific contribution |
| Guard blocks valid later edits | Test distinct change identifiers from each supported origin |
| Replay passes only because goals are weak | Declare required final state and deliveries before evaluating candidates |
| Causal lineage disappears between systems | Instrument demo adapters explicitly; report incomplete real-world lineage as unsupported |
| Graph becomes decoration | Require graph evidence for investigation and repair eligibility |
| Model invents a repair or a result | Validate operations and compute outcomes deterministically |
| Hosting interrupts a long investigation | Bound operations, persist progress, or use a persistent worker |
| Event timing or submission rules change | Recheck official channels at kickoff |

## Submission checklist

- [ ] Public repository.
- [ ] README with complete setup and reproducible demo instructions.
- [ ] Graph model explanation.
- [ ] Essential Cypher queries or graph algorithms documented.
- [x] Working demo video: `presentation/LoopSuture-demo.mp4`, recorded October 17 with actual graph-backed operations and live Gemini investigations.
- [ ] Live deployment or complete local setup.
- [ ] Track 1 named explicitly.
- [ ] AI assistance disclosure.
- [ ] Data sources and permissions documented; use synthetic/public permitted data.
- [ ] Measured results with scenario scope and verification limits.
- [ ] Existing work acknowledged.
- [ ] Participant can explain the architecture, queries, repair decisions, and verification.
- [ ] Repository, video, and deployment links tested before submission.

Requirements derive from the [official rules](https://www.wemakedevs.org/hackathons/falkordb/rules), checked October 13, 2026. Recheck the final submission interface rather than assuming this list covers every field.

## Completion boundary for this planning task

Deliver these Markdown notes in the requested project folder. Do not initialize an application, install packages, create executable code, register accounts, publish a repository, or deploy during this planning-only task.
