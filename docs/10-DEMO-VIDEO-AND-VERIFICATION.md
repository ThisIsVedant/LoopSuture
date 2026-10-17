# Demo video and fresh verification

Recorded October 17, 2026, for the participant's review. Target: Graph Hacks Track 1, Agents That Act on Connected Data.

## Fresh live results

The previous healthy-model availability blocker was resolved during this recording session. Both actual investigations completed in model mode using `gemini-3.1-flash-lite`, with inspect/trace/evaluate evidence tools requested and strict selected-candidate validation enabled.

| Check | Observed result |
| --- | --- |
| Faulty three-system baseline | 48 attempts, 45 repeated effects, 3/3 required destinations |
| Live loop investigation | Correct two-workflow no-op guard selected; two HTTP requests, zero retries, 5,812 ms |
| Selected repair | `crm-support+marketing-crm:suppress-noop` |
| Applied repair | Three attempts, zero repeated effects, 3/3 destinations; natural drain |
| Fresh marketing edit | Four attempts, zero repeats, 3/3 destinations; distinct change/version |
| Healthy retry control | Two retries, zero repeated effects, 2/2 destinations |
| Live healthy investigation | Healthy; no repair selected; two HTTP requests, zero retries, 4,532 ms |
| Unit suite repeated during recording | 30 passed, zero failed |

Three-system run: `7eda491a-5e75-4d96-88d4-28097a46b6c7`. Healthy run: `dd7f20d6-5fe3-42d0-bcb5-4d18e076c161`. The recording journal retains the actual API responses, stage times, candidate checks, and execution metadata. These IDs identify real local graph-backed runs; the footage does not mock API responses or fabricate application state.

## Video content

Completed artifact: `presentation/LoopSuture-demo.mp4`. Duration: 3 minutes 21 seconds. Format: 1920×1080, 24 fps, H.264 + 48 kHz AAC, about 7.6 MB. Captions, script, cover, editable production source, and quality reports accompany it. Full-file decoding passed; twelve encoded chapter frames were inspected.

The presentation covers the user problem, actual faulty execution, model tools and graph evidence, rejected repair alternatives, the selected repair, preservation of new customer edits, healthy retries, architecture, exportable evidence, automated checks, and honest limitations. App footage is edited for pace and held at readable verified results. Authored graphics explain observations rather than substituting for execution.

The business services are synthetic. FalkorDB is real and central. Results are fixture observations within a 48-action horizon, not a universal production-safety guarantee. Native SaaS adapters, public deployment hardening, and submission publication remain separate work.

## Review and submission

The video is AI-assisted and includes synthetic narration. The participant must review it, understand the architecture/queries/repair decisions, and ensure meaningful personal contribution before submission.

No video, repository, or submission was published by this task. The public rules require a working demo video but do not state a duration; verify any extra restrictions in the private submission panel.

Official rules: https://www.wemakedevs.org/hackathons/falkordb/rules
