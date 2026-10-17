# Product requirements — LoopSuture

## Product promise

Find why connected automations repeatedly trigger each other, repair the feedback, and demonstrate that required business updates still work.

## Problem and audience

An automation can succeed on every individual step while failing as a whole. Customer management updates support; support updates marketing; marketing updates customer management again. Duplicate records, notifications, and paid tasks accumulate even though each platform reports successful execution.

Initial audience: automation builders and small teams maintaining connected business workflows. The hackathon version is a diagnostic and repair workbench for an instrumented demonstration environment. Real SaaS coverage is future work.

The problem is established in [Zapier's loop documentation](https://help.zapier.com/hc/en-us/articles/8496232045453-Zap-is-stuck-in-a-loop). LoopSuture's proposed contribution is investigation and verified repair across a connected environment.

## Primary user journey

1. Select a scenario or load a supported synthetic workflow definition.
2. Introduce a legitimate customer update.
3. Observe actual event propagation and repeated actions.
4. Ask the agent to investigate the repeated work.
5. Inspect the causal path, evidence, candidate repairs, and rejected alternatives.
6. Let the agent apply a repair within the demonstration environment's authorized repair policy.
7. Introduce new legitimate edits and inspect verification results.
8. Export an incident report with paths, actions, measured outcomes, and limitations.

## Causes in the first version

| Cause | Supported repair family | Preservation requirement |
| --- | --- | --- |
| An action feeds its own triggering chain | Event lineage guard | A fresh user edit must still propagate |
| Repeated webhook delivery | Event-specific deduplication | Distinct later edits must not be mistaken for duplicates |
| Writing unchanged business values triggers another update | Suppress no-op writes | A meaningful value change must still be delivered |

A cycle is a diagnostic lead, not sufficient evidence of failure. Legitimate retries and bounded iteration are healthy controls. If lineage is incomplete, the agent should identify missing evidence rather than invent a causal link.

## Must-have scope

- Three synthetic services representing customer management, support, and marketing.
- Instrumented events with stable identifiers, originating change identifiers, parent links, and business payload versions.
- FalkorDB-backed workflow relationships, causal event paths, and investigation evidence.
- One tool-using investigating agent.
- A bounded set of repair operations, with explicit applicability checks.
- Isolated replay of candidate repairs using the same starting state and input sequence.
- Verification of termination, delivery goals, and fresh edits after repair.
- A graph view, readable event timeline, candidate comparison, and outcome report.
- Reproducible reset and local startup; live deployment if time permits.

## Optional scope, after the core passes

- Import a small documented workflow JSON format.
- Downloadable incident report.
- One real integration using public or synthetic data, if access and time permit.
- Additional overlapping-loop fixtures.

## Outside the first version

- Automatic support for arbitrary Zapier, n8n, or enterprise configurations.
- Real customer data, real customer messaging, or real billing operations.
- Multiple coordinating AI agents, user accounts, subscription billing, or fine-tuning.
- General causal discovery from timestamps alone.
- Globally optimal repair or formal verification of arbitrary workflows.
- Automatic deletion of previously created external records.

## Acceptance criteria

| ID | Requirement | Evidence |
| --- | --- | --- |
| P1 | The agent diagnoses a fault through a FalkorDB query | Stored query evidence and returned causal path |
| P2 | Repairs change executable workflow behavior | Configuration revision and observed post-change run |
| P3 | A harmful candidate can be rejected | A candidate stops repetition but fails a required delivery goal |
| P4 | Fresh edits continue to work after repair | Updates initiated from both supported directions reach their required destinations |
| P5 | Healthy repetition is preserved | Bounded retry control completes without unnecessary repair |
| P6 | No eligible repair is handled honestly | An unresolved outcome explains failed checks and missing evidence |
| P7 | Repair results are reproducible | Fixed replay inputs, reset instructions, and recorded configuration versions |
| P8 | FalkorDB is central | Investigation cannot diagnose or authorize a repair when graph evidence is unavailable |

## Success measures

Measure repeated side effects per originating change, required deliveries completed, diagnosis time, replay time, configuration edits, and model calls. Display separate values for the faulty baseline and repaired run. Define the observation horizon for every result. Projected monetary savings are optional and must use a disclosed assumed unit cost.

## Positioning

The intended distinction is the combination of causal graph investigation, constrained repair selection, and outcome-preservation checks. This is a proposed product contribution; existing loop detection, deduplication, and idempotency methods remain prior art.
