# Verification plan and demo notes

## What verification means

Replay checks establish observed behavior for a declared scenario, input sequence, configuration, and action/time horizon. They do not prove that arbitrary production workflows are safe. A terminated run is successful only if its required outcomes also completed.

## Core scenarios

| Scenario | Fault or control | Required outcome |
| --- | --- | --- |
| Two-system feedback | Mirrored writes regenerate the same change | Repetition ends and a fresh edit from either system still reaches the other |
| Three-system feedback | A change returns through multiple workflows | The return path is identified and required destinations remain updated |
| Duplicate delivery | The same event is delivered several times | Its intended side effect occurs once; a distinct later event still executes |
| Healthy retry | A temporary failure clears within a bounded retry policy | Work completes without an unnecessary repair |
| Healthy fresh edit | A customer is edited again after repair | A new business version reaches all declared destinations |
| No valid repair | Every supported candidate violates a required outcome | The investigation remains unresolved with evidence |

The first MVP can defer more complex overlapping loops, but it must not claim to resolve them until tested.

## Required checks

- [ ] Causal ancestry comes from recorded parent/action links, not timestamps alone.
- [ ] A cyclic but healthy workflow is not automatically labelled faulty.
- [ ] Safety-budget exhaustion is distinguishable from natural termination.
- [ ] Two different edits to the same record are not deduplicated together.
- [ ] Suppressing unchanged writes still permits meaningful value changes.
- [ ] A candidate that loses required deliveries is rejected.
- [ ] Baseline and candidate replays use equal initial state and inputs.
- [ ] Candidate state and evidence do not leak into other runs.
- [ ] A workflow revision changed after replay cannot receive an outdated patch.
- [ ] Failed repair application is reported as failure, not resolution.
- [ ] Graph unavailability prevents an unsupported diagnosis or repair authorization.
- [ ] Model failure preserves the run and reports an interrupted investigation.
- [ ] Agent explanations reference paths and measurements that actually exist.
- [ ] Clean setup and reset reproduce the demonstration.

## Baselines

Compare the faulty original with three meaningful alternatives where supported:

1. Stop all affected workflows: repetition ends, but required deliveries may fail.
2. Add a blanket rate limit: repetition may slow without removing feedback.
3. Apply the selected targeted repair: measure both repetition and delivery goals.

These comparisons are demonstration baselines, not published competitor benchmarks.

## Measurement definitions

| Measure | Definition |
| --- | --- |
| Actions per originating change | Actual attempted side effects attributed to one input change |
| Repeated effects | Re-execution of an intended operation for an already handled change |
| Goal completion | Declared delivery goals met divided by goals checked |
| Termination | Natural queue drain within the declared execution horizon |
| Repair size | Configuration entries altered |
| Diagnosis/replay duration | Observed elapsed time for each stage |
| Model cost | Actual calls and usage if provider reporting is available |

Do not equate zero queued events with successful delivery. Do not present fixture counts or estimated savings as field results.

## Proposed demo sequence

Target approximately three minutes; verify actual video requirements in the submission panel.

1. **Problem:** explain that one customer edit should update the connected services once.
2. **Fault:** introduce the edit and show the repeating causal path and growing action count.
3. **Investigation:** show the agent calling graph tools and explaining the returned evidence.
4. **Tradeoff:** show one candidate rejected because it blocks a required update.
5. **Repair:** show the selected configuration change and actual replay outcomes.
6. **Preservation:** introduce a new edit from the opposite system and watch it propagate normally.
7. **Receipt:** show the repair revision, path evidence, goals checked, and declared limitations.

Suggested pitch: "LoopSuture traces why automations repeatedly trigger each other, applies a targeted repair, and checks that the useful workflow still completes."

## Presentation requirements

The interface should prioritize the user's question: what happened, why, what changed, and whether the workflow now works. Expose queries in an expandable evidence panel. Clearly label synthetic services, AI-generated explanations, and replay observations. Capture an authentic working run rather than a prerecorded animation standing in for execution.
