"use client";
import { useEffect, useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";
import { type Run, type ScenarioId } from "@/lib/domain";
import WorkflowGraph from "./workflow-graph";

export default function Workbench() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("three-way");
  const [run, setRun] = useState<Run | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scenario = SCENARIOS.find(item => item.id === scenarioId)!;
  useEffect(() => { fetch("/api/health").then(response => response.json()).then(data => setConnected(data.graph === "connected")).catch(() => setConnected(false)); }, []);
  async function execute() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The operation could not complete.");
      setRun(data);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "The operation could not complete."); }
    finally { setBusy(false); }
  }
  return <main className="page-content">
    <h1>Keep the workflow.<br /><span>Cut the loop.</span></h1>
    <p>{connected ? "FalkorDB connected" : "Graph unavailable"}</p>
    <section className="scenario-strip"><label htmlFor="scenario">Scenario</label><select id="scenario" value={scenarioId} disabled={busy} onChange={event => { setScenarioId(event.target.value as ScenarioId); setRun(null); }}>{SCENARIOS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="button button-dark" disabled={busy || !connected} onClick={execute}>Run scenario</button></section>
    {error && <p role="alert">{error}</p>}
    {run && <section aria-label="Run measurements"><p>{run.simulation.termination === "budget-exhausted" ? "Bound reached" : "Completed"}</p><p>{run.simulation.metrics.attempted} action attempts · {run.simulation.metrics.repeated} repeated effects · {run.simulation.metrics.goalsPassed}/{run.simulation.metrics.goalsTotal} delivery goals</p></section>}
    <section className="panel"><h2>Workflow graph</h2><div className="graph-canvas"><WorkflowGraph scenario={scenario} run={run} /></div></section>
    <section className="panel timeline-panel"><h2>Event timeline</h2>{run?.simulation.actions.map(action => <div className="event-row" key={action.id}><strong>{action.workflowId}</strong><span>{action.status}</span><p>{action.reason}</p></div>)}</section>
  </main>;
}
