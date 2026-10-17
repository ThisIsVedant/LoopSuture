"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, CircleDot, Command, GitBranch, Layers, LoaderCircle, Network, Play, RotateCcw, Search, ShieldCheck, Sparkles, TriangleAlert, X, Zap } from "lucide-react";
import { SCENARIOS } from "@/lib/scenarios";
import { SYSTEMS, type Run, type ScenarioId, type SystemId } from "@/lib/domain";
import WorkflowGraph from "./workflow-graph";

type RecentRun = { id: string; scenarioName: string; createdAt: string; revision: number; termination: string };
export default function Workbench() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("three-way");
  const [run, setRun] = useState<Run | null>(null);
  const [health, setHealth] = useState("checking");
  const [model, setModel] = useState("not-configured");
  const [modelProvider, setModelProvider] = useState("Model");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<RecentRun[]>([]);
  const [tab, setTab] = useState<"timeline" | "evidence" | "history">("timeline");
  const [freshOrigin, setFreshOrigin] = useState<SystemId>("support");
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const scenario = run?.scenario ?? SCENARIOS.find((item) => item.id === scenarioId)!;
  const investigation = run?.investigation;
  const selected = investigation?.candidates.find((item) => item.id === investigation.selectedId);
  const repaired = Boolean(run?.appliedRepair);
  const looping = run?.simulation.termination === "budget-exhausted";
  const baseline = run?.history?.[0]?.simulation;
  const metrics = run?.simulation.metrics;
  const compactCandidates = investigation ? [
    ...(selected ? [selected] : []),
    ...investigation.candidates.filter((candidate) => !candidate.eligible).slice(0, 3),
    ...investigation.candidates.filter((candidate) => candidate.eligible && candidate.id !== selected?.id).slice(0, 1),
  ] : [];
  const visibleCandidates = showAllCandidates ? investigation?.candidates ?? [] : compactCandidates;

  useEffect(() => {
    let active = true;
    fetch("/api/health").then((response) => response.json()).then((data) => { if (active) { setHealth(data.graph); setModel(data.model); setModelProvider(data.modelProvider ?? "Model"); } }).catch(() => { if (active) setHealth("unavailable"); });
    fetch("/api/runs").then((response) => response.json()).then((data) => { if (active) setRecent(data.runs ?? []); }).catch(() => {});
    const saved = localStorage.getItem("loopsuture:last-run");
    if (saved) fetch(`/api/runs/${saved}`).then(async (response) => { if (response.ok) { const item = await response.json() as Run; if (active) { setRun(item); setScenarioId(item.scenario.id); setFreshOrigin(item.scenario.systems[item.scenario.systems.length - 1]); } } }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function operation(label: string, url: string, body?: unknown, method = "POST") {
    setBusy(label); setError("");
    try {
      const response = await fetch(url, { method, ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The operation could not complete.");
      const item = data as Run;
      setRun(item); setScenarioId(item.scenario.id); setFreshOrigin(item.scenario.systems[item.scenario.systems.length - 1]);
      localStorage.setItem("loopsuture:last-run", item.id);
      setHealth("connected");
      const list = await fetch("/api/runs").then((result) => result.json()); setRecent(list.runs ?? []);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Something went wrong."); }
    finally { setBusy(""); }
  }
  function chooseScenario(id: ScenarioId) { setScenarioId(id); setRun(null); setError(""); localStorage.removeItem("loopsuture:last-run"); }
  function downloadReport() {
    if (!run) return;
    const report = { product: "LoopSuture", environment: "Synthetic demonstration services", exportedAt: new Date().toISOString(), limitation: "Observed checks within a 48-action horizon; not a universal production safety proof.", run };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `loopsuture-${run.id.slice(0,8)}.json`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><span className="brand-icon"><GitBranch size={24} /></span><span>LoopSuture<span className="brand-period">.</span></span></Link>
      <div className="workspace-label">WORKSPACE <span>01</span></div>
      <button className="workspace-switch" onClick={() => { document.getElementById("scenarios")?.scrollIntoView({ behavior: "smooth" }); }}><span className="workspace-avatar">L</span><span>Demo environment<small>Local workbench</small></span><ChevronDown size={14} /></button>
      <div className="nav-label">OPERATIONS</div>
      <nav><button className="nav-item selected" onClick={() => setTab("timeline")}><Network size={17} />Workbench<span className="nav-dot" /></button><button className={`nav-item ${tab === "history" ? "nav-sub-selected" : ""}`} onClick={() => setTab("history")}><Activity size={17} />Run history<span className="nav-count">{recent.length}</span></button><button className="nav-item" onClick={() => setTab("evidence")}><ShieldCheck size={17} />Evidence</button></nav>
      <div className="sidebar-note"><span className="note-icon"><Layers size={18} /></span><h3>Connected, not repeated.</h3><p>Follow the cause. Preserve the outcome.</p><span className="powered">POWERED BY FALKORDB <ArrowUpRight size={12} /></span></div>
      <div className="sidebar-footer"><span className="user-avatar">SO</span><div>Solo workspace<small>Graph Hacks · Track 01</small></div><CircleDot size={15} /></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><span className="breadcrumb-muted">Workspace</span><span className="breadcrumb-slash">/</span><span>Workbench</span></div><div className="topbar-right"><span className={`connection ${health === "connected" ? "connected" : ""}`}><span />{health === "connected" ? "FalkorDB connected" : health === "checking" ? "Connecting graph" : "Graph unavailable"}</span><span className="demo-pill">SYNTHETIC DEMO</span></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span /> AUTOMATION REPAIR WORKBENCH</div><h1>Keep the workflow.<br /><span>Cut the loop.</span></h1><p>Trace the feedback. Test the smallest supported change.<br />Make sure the useful work still gets done.</p></div><div className="heading-side"><span className="small-overline">ONE CHANGE. MANY CONNECTIONS.</span><div className="orbit-mark"><GitBranch size={57} strokeWidth={1.1} /><span className="orbit-point" /></div></div></div>

        <section className="scenario-strip" id="scenarios"><div className="scenario-select"><span className="small-overline">01 / CHOOSE A SCENARIO</span><label className="sr-only" htmlFor="scenario">Scenario</label><div className="select-wrap"><select id="scenario" value={scenarioId} disabled={Boolean(busy)} onChange={(event) => chooseScenario(event.target.value as ScenarioId)}>{SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></div><p>{scenario.summary}</p></div><div className="scenario-actions"><button className="button button-subtle" disabled={Boolean(busy)} onClick={() => chooseScenario(scenarioId)} title="Start a clean scenario"><RotateCcw size={15} />Reset view</button><button className="button button-dark" disabled={Boolean(busy) || health !== "connected"} onClick={() => operation("Running scenario", "/api/runs", { scenarioId })}>{busy === "Running scenario" ? <LoaderCircle className="spin" size={16} /> : <Play size={15} fill="currentColor" />}Run scenario</button></div></section>

        {error && <div className="error-banner" role="alert"><TriangleAlert size={17} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
        {busy && <div className="busy-banner" role="status"><LoaderCircle size={15} className="spin" />{busy}… recording actual events and evidence.</div>}

        <section className="metrics-grid" aria-label="Run measurements">
          <Metric label="ACTION ATTEMPTS" value={metrics?.attempted} note={baseline ? `${baseline.metrics.attempted} before repair` : "Measured execution steps"} icon={<Zap size={17} />} />
          <Metric label="REPEATED EFFECTS" value={metrics?.repeated} note={baseline ? `${baseline.metrics.repeated} before repair` : "Same change, same side effect"} icon={<RotateCcw size={17} />} warn={Boolean(metrics?.repeated)} />
          <Metric label="DELIVERY GOALS" value={metrics ? `${metrics.goalsPassed}/${metrics.goalsTotal}` : undefined} note="Required destination states" icon={<CheckCircle2 size={17} />} />
          <Metric label="RUN OUTCOME" value={run ? looping ? "Bound reached" : "Completed" : undefined} note={run ? looping ? "Stopped at the 48-action safety limit" : "Queue drained naturally" : "No scenario executed yet"} icon={<Activity size={17} />} text />
        </section>

        <div className="workbench-grid">
          <section className="panel graph-panel"><div className="panel-header"><div><span className="small-overline">02 / FOLLOW THE CONNECTIONS</span><h2>Workflow graph</h2></div><span className={`status-pill ${run ? looping ? "amber" : "green" : "neutral"}`}><span />{run ? looping ? "Feedback active" : repaired ? "Repair active" : "Run complete" : "Scenario topology"}</span></div><div className="graph-canvas"><WorkflowGraph scenario={scenario} run={run} /></div><div className="graph-footer"><span><i className="legend-line" />{run ? "Recorded workflow activity" : "Configured connections"}</span><span><i className="legend-dot" />{scenario.systems.length} services · {scenario.workflows.length} workflows</span></div></section>

          <section className="panel investigator-panel"><div className="panel-header"><div><span className="small-overline">03 / INVESTIGATE & REPAIR</span><h2>Find a way through</h2></div><span className="investigator-symbol"><Sparkles size={18} /></span></div>
            {!investigation ? <div className="investigator-empty"><div className="empty-symbol"><Search size={29} strokeWidth={1.4} /></div><h3>{run ? "Trace the cause." : "Start with one edit."}</h3><p>{run ? "Read the causal paths in FalkorDB, then compare repairs against the work that must still happen." : "Run a scenario to see how a single customer change moves through connected services."}</p><div className="investigation-steps"><span><Check size={13} />Recorded event lineage</span><span><Check size={13} />Isolated repair replays</span><span><Check size={13} />Fresh-edit preservation checks</span></div><button className="button button-dark full-width" disabled={!run || Boolean(busy)} onClick={() => run && operation("Investigating graph", `/api/runs/${run.id}/investigate`)}>{busy === "Investigating graph" ? <LoaderCircle size={15} className="spin" /> : <Search size={15} />}Investigate this run<ArrowRight size={15} /></button><span className="mode-note">{model === "configured" ? `${modelProvider} API configured` : "Graph analysis · no model key configured"}</span></div>
            : <div className="investigation-result"><div className={`result-tag ${investigation.status === "unresolved" ? "amber-text" : ""}`}><ShieldCheck size={15} />{investigation.status === "healthy" ? "Healthy repetition" : investigation.status === "repair-found" ? repaired ? "Verified repair installed" : "Verified candidate found" : "No safe candidate found"}</div><p className="explanation">{investigation.explanation}</p>{investigation.modelNote && <p className="mode-note">{investigation.modelNote}</p>}
              {investigation.mode === "graph" && model === "configured" && investigation.revision === run?.revision && <button className="button button-subtle full-width" disabled={Boolean(busy)} onClick={() => run && operation(`Investigating with ${modelProvider}`, `/api/runs/${run.id}/investigate`)}>{busy ? <LoaderCircle size={15} className="spin" /> : <RotateCcw size={15} />}{investigation.modelNote ? "Retry" : "Run"} {modelProvider} investigation</button>}
              {selected && <div className="selected-candidate"><span className="small-overline">SELECTED CHANGE</span><h3>{selected.kind === "suppress-noop" ? "Skip unchanged writes" : "Deduplicate this change"}</h3><p>{selected.workflowIds.length === 1 ? scenario.workflows.find((item) => item.id === selected.workflowId)?.name : `${selected.workflowIds.length} workflow guards · ${selected.workflowIds.join(", ")}`}</p><div className="candidate-checks"><span><CheckCircle2 size={13} />Delivery goals pass</span><span><CheckCircle2 size={13} />{selected.probes.length} fresh origins pass</span></div></div>}
              {selected && !repaired && <button className="button button-green full-width" disabled={Boolean(busy)} onClick={() => run && operation("Applying verified repair", `/api/runs/${run.id}/repair`, { candidateId: selected.id, revision: run.revision })}><ShieldCheck size={15} />Apply verified repair<ArrowRight size={15} /></button>}
              {repaired && <div className="fresh-edit"><label htmlFor="fresh-origin">Test a new customer edit</label><div className="fresh-edit-controls"><select id="fresh-origin" value={freshOrigin} disabled={Boolean(busy)} onChange={(event) => setFreshOrigin(event.target.value as SystemId)}>{scenario.systems.map((system) => <option key={system} value={system}>{SYSTEMS[system].name}</option>)}</select><button className="button button-dark" disabled={Boolean(busy)} onClick={() => run && operation("Checking a fresh edit", `/api/runs/${run.id}/edit`, { origin: freshOrigin, status: run.input.value.status === "qualified" ? "customer" : "qualified" })}><Play size={14} />Send edit</button></div></div>}
              <span className="mode-note">{investigation.mode === "model" ? `${investigation.modelProvider ?? "Model"} investigation with verified tools` : "Deterministic graph analysis"} · revision {investigation.revision}</span>
            </div>}
            {repaired && !investigation && <div className="fresh-edit standalone"><label htmlFor="fresh-origin-again">Send another distinct edit</label><div className="fresh-edit-controls"><select id="fresh-origin-again" value={freshOrigin} disabled={Boolean(busy)} onChange={(event) => setFreshOrigin(event.target.value as SystemId)}>{scenario.systems.map((system) => <option key={system} value={system}>{SYSTEMS[system].name}</option>)}</select><button className="button button-dark" disabled={Boolean(busy)} onClick={() => run && operation("Checking a fresh edit", `/api/runs/${run.id}/edit`, { origin: freshOrigin, status: run.input.value.status === "qualified" ? "customer" : "qualified" })}><Play size={14} />Send edit</button></div></div>}
          </section>
        </div>

        {investigation && investigation.candidates.length > 0 && <section className="panel candidates-panel"><div className="panel-header"><div><span className="small-overline">COMPARE THE TRADEOFFS</span><h2>Stopping the loop is only half the job.</h2></div><span className="muted">{investigation.candidates.length} candidates evaluated</span></div><div className="candidate-table"><div className="table-heading"><span>SUPPORTED CHANGE</span><span>DELIVERY CHECKS</span><span>DECISION</span></div>{visibleCandidates.map((candidate) => <div className="candidate-row" key={candidate.id}><div><strong>{candidate.title}</strong><p>{candidate.reason}</p></div><span>{candidate.baselineReplay.metrics.goalsPassed}/{candidate.baselineReplay.metrics.goalsTotal} original · {candidate.probes.filter((p) => p.passed).length}/{candidate.probes.length} fresh</span><span className={`decision ${candidate.eligible ? "accepted" : "rejected"}`}>{candidate.eligible ? <Check size={13} /> : <X size={13} />}{candidate.id === selected?.id ? "Selected" : candidate.eligible ? "Eligible" : "Rejected"}</span></div>)}</div>{investigation.candidates.length > compactCandidates.length && <button className="button button-subtle candidate-toggle" onClick={() => setShowAllCandidates((value) => !value)}>{showAllCandidates ? "Show the key tradeoffs" : `Show all ${investigation.candidates.length} candidates`}<ChevronDown size={13} /></button>}</section>}

        <section className="panel timeline-panel"><div className="timeline-header"><div className="tabs"><button className={tab === "timeline" ? "active" : ""} onClick={() => setTab("timeline")}><Activity size={15} />Event timeline</button><button className={tab === "evidence" ? "active" : ""} onClick={() => setTab("evidence")}><GitBranch size={15} />Graph evidence</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><Layers size={15} />Run history</button></div><button className="export-button" disabled={!run} onClick={downloadReport}><ArrowDownToLine size={14} />Export report</button></div>
          {tab === "timeline" && (run ? <div className="timeline-body"><div className="timeline-caption"><span>RUN {run.id.slice(0,8).toUpperCase()} · REVISION {run.revision}</span><span>{run.simulation.actions.length} recorded actions · originating change {run.input.id.slice(0,8)}</span></div><div className="timeline-scroll">{run.simulation.actions.map((action) => <div className="event-row" key={action.id}><span className="event-sequence">{String(action.sequence + 1).padStart(2,"0")}</span><span className={`event-state ${action.status}`}><span /></span><div><strong>{SYSTEMS[action.source].name}<ArrowRight size={12} />{SYSTEMS[action.target].name}</strong><p>{action.reason}</p></div><span className="event-workflow">{action.workflowId}</span><span className="event-label">{action.status}</span></div>)}</div></div> : <div className="timeline-empty"><Activity size={23} strokeWidth={1.4} /><div><h3>Your evidence starts here.</h3><p>Execute a scenario to record real actions in the demonstration environment.</p></div><span className="empty-shortcut"><Command size={13} />RUN SCENARIO</span></div>)}
          {tab === "evidence" && <div className="evidence-body"><p className="muted">{investigation ? "Paths returned from FalkorDB's recorded event ancestry. A graph cycle alone is not a diagnosis." : "Investigate a run to retrieve its causal paths and replay evidence."}</p>{investigation?.paths.map((path, index) => <div className="evidence-path" key={index}><span>PATH {index+1}</span><strong>{path.systems.map((system) => SYSTEMS[system].name).join(" → ")}</strong><code>{path.eventIds.join(" → ")}</code></div>)}{investigation?.receipts.map((receipt, index) => <div className="receipt-row" key={index}><span className="receipt-source">{receipt.source}</span><strong>{receipt.tool}</strong><p>{receipt.detail}</p></div>)}{investigation && <details className="query-details"><summary>View the essential graph query</summary><pre>{`MATCH p=(a:Event {runId: $id, revision: $revision})\n  -[:CAUSED*1..9]->(b:Event {runId: $id, revision: $revision})\nWHERE a.sequence = 0 AND a.rootId = b.rootId\n  AND a.system = b.system AND a.payloadHash = b.payloadHash\nRETURN [n IN nodes(p) | n.id], [n IN nodes(p) | n.system]`}</pre></details>}</div>}
          {tab === "history" && <div className="history-body">{recent.length ? recent.map((item) => <button className="history-row" disabled={Boolean(busy)} key={item.id} onClick={() => operation("Loading saved run", `/api/runs/${item.id}`, undefined, "GET")}><span className="history-icon"><Layers size={16} /></span><span><strong>{item.scenarioName}</strong><small>{item.id.slice(0,8)} · revision {item.revision} · {new Date(item.createdAt).toLocaleString()}</small></span><span className={`status-pill ${item.termination === "drained" ? "green" : "amber"}`}>{item.termination === "drained" ? "Completed" : "Bound reached"}</span><ArrowUpRight size={15} /></button>) : <p className="muted">No saved runs yet. Run your first scenario to create persistent evidence.</p>}</div>}
        </section>
        <footer className="page-footer"><span><span className="footer-dot" />Connected data. Explainable action.</span><span>Checks are scoped to synthetic scenarios and a bounded replay horizon.</span></footer>
      </div>
    </main>
  </div>;
}
function Metric({ label, value, note, icon, warn, text }: { label: string; value?: string | number; note: string; icon: React.ReactNode; warn?: boolean; text?: boolean }) {
  return <div className={`metric ${warn ? "warning" : ""}`}><div className="metric-label">{label}{icon}</div><div className={`metric-value ${text ? "metric-text" : ""}`}>{value ?? "—"}</div><p>{note}</p></div>;
}
