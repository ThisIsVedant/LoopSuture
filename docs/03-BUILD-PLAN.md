# Build plan

## Before the event

- Review the concept and choose the initial demonstration story.
- Read the official rules and FalkorDB documentation.
- Keep advance work to research notes and conceptual graph sketches.
- Confirm registration and the submission workflow manually.

Main implementation starts October 15, 2026, after 12:01 AM IST. All dates below use Asia/Calcutta.

## October 15 — executable foundation

Goal: one legitimate edit produces actual events that can be inspected through FalkorDB.

- Initialize Next.js and TypeScript during the event.
- Establish a reproducible application/FalkorDB startup.
- Implement a small deterministic event engine and reset mechanism.
- Add three synthetic services and the two-system loop fixture.
- Persist topology, event lineage, and actions in FalkorDB.
- Display the run timeline and graph evidence.

Exit check: reproduce the faulty run, trace its event ancestry through the graph, and reproduce it after reset. No AI diagnosis is required to complete this first milestone.

## October 16 — investigation and first repair

Goal: the agent diagnoses the two-system loop, proposes a supported repair, and produces replay evidence.

- Add bounded graph investigation tools.
- Connect one tool-calling model.
- Implement the first repair family and its applicability checks.
- Replay candidates with isolated state and fixed inputs.
- Define required business outcomes.
- Add a candidate that stops repetition but fails a delivery goal.

Exit check: the agent rejects the harmful candidate and selects an eligible alternative using observed results. The selection must not be hard-coded to a scenario ID.

## October 17 — preservation and presentation

Goal: verify repairs across the selected fault scenarios and healthy controls.

- Add three-system and duplicate-delivery fixtures.
- Add healthy bounded retry and fresh-edit controls.
- Check new edits from each supported origin after repair.
- Record graph evidence, configuration revision, and measured outcomes.
- Complete the graph, timeline, comparison, and report panels.
- Check that reset and scenario switching do not mix run data.

Exit check: all mandatory checks in the verification document pass, or limitations are explicitly reduced in scope and documented.

## October 18 — submission readiness

Goal: a stable, understandable submission before 11:59 PM IST.

- Freeze new feature work early.
- Perform a clean startup following only the README.
- Complete deployment if practical; retain complete local instructions.
- Record the working demo and prepare a backup recording.
- Document the graph model, essential queries, and measured results.
- Include AI assistance disclosure and confirm participant understanding.
- Verify links and upload the required submission materials with a substantial deadline buffer.

## Priorities if time becomes tight

1. Protect the end-to-end investigation, repair, and preservation check.
2. Protect accurate graph evidence and honest scenario labels.
3. Keep two fault fixtures and the healthy controls before adding breadth.
4. Defer real integrations, login, extra agents, and elaborate animation.
5. Use complete local setup plus a working demo if deployment cannot be completed reliably.

## First implementation slice

After kickoff: start services, load one scenario, execute one input, write its causal events to FalkorDB, retrieve the path, and show it in the workbench. Build this before expanding the UI or introducing the model.
