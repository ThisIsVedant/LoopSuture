import "server-only";
import { FalkorDB } from "falkordb";
import { createConnection } from "node:net";
import type { Run, Workflow } from "./domain";

const globalGraph = globalThis as unknown as { loopSutureDb?: Promise<FalkorDB> };
function connection() {
  if (!globalGraph.loopSutureDb) {
    const socketOptions = { host: process.env.FALKORDB_HOST ?? "127.0.0.1", port: Number(process.env.FALKORDB_PORT ?? "6388"), connectTimeout: 4000, reconnectStrategy: false as const };
    // Probe before using the client's async factory, whose initial error event cannot
    // be subscribed to until it returns. An unavailable database must fail cleanly.
    globalGraph.loopSutureDb = new Promise<void>((resolve, reject) => {
      const socket = createConnection({ host: socketOptions.host, port: socketOptions.port });
      socket.setTimeout(4000, () => socket.destroy(new Error("Graph connection timed out.")));
      socket.once("error", reject);
      socket.once("connect", () => { socket.end(); resolve(); });
    }).then(() => FalkorDB.connect({
      socket: socketOptions,
      ...(process.env.FALKORDB_PASSWORD ? { password: process.env.FALKORDB_PASSWORD } : {}),
    })).then((db) => { db.on("error", () => { globalGraph.loopSutureDb = undefined; }); return db; }).catch((error) => { globalGraph.loopSutureDb = undefined; throw error; });
  }
  return globalGraph.loopSutureDb;
}
async function graph() { return (await connection()).selectGraph("loopsuture"); }
export async function query(cypher: string, params: Record<string, string | number | boolean> = {}) {
  return (await graph()).query(cypher, { params });
}
export async function checkGraph(): Promise<boolean> { await query("RETURN 1 AS ready"); return true; }

export async function saveRun(run: Run) {
  await query("MERGE (r:Run {id: $id}) SET r.createdAt = $createdAt, r.ready = false", {
    id: run.id, createdAt: run.createdAt, revision: run.revision, snapshot: JSON.stringify(run),
  });
  // Preserve earlier revision evidence. Cleanup is limited to an incomplete projection
  // for this exact run/revision; no unrelated run or baseline is removed.
  await query("MATCH (n) WHERE n.runId = $id AND n.revision = $revision DETACH DELETE n", { id: run.id, revision: run.revision });
  const versionedQuery = (cypher: string, params: Record<string, string | number | boolean>) => query(cypher.replaceAll("runId: $runId", "runId: $runId, revision: $revision"), { ...params, revision: run.revision });
  for (const system of run.scenario.systems) {
    await versionedQuery("MATCH (r:Run {id: $runId}) CREATE (s:System {runId: $runId, id: $id}) CREATE (r)-[:HAS_SYSTEM]->(s)", { runId: run.id, id: system });
  }
  for (const workflow of run.scenario.workflows) {
    await versionedQuery("MATCH (a:System {runId: $runId, id: $source}), (b:System {runId: $runId, id: $target}) CREATE (w:Workflow {runId: $runId, id: $id, name: $name, source: $source, target: $target, repair: $repair, failuresBeforeSuccess: $failures}) CREATE (a)-[:TRIGGERS]->(w) CREATE (w)-[:WRITES_TO]->(b)", {
      runId: run.id, id: workflow.id, name: workflow.name, source: workflow.source, target: workflow.target, repair: workflow.repair, failures: workflow.failuresBeforeSuccess ?? 0,
    });
  }
  for (const event of run.simulation.events) {
    await versionedQuery("CREATE (:Event {runId: $runId, id: $id, sequence: $sequence, rootId: $rootId, system: $system, payloadHash: $hash, workflowId: $workflowId})", {
      runId: run.id, id: event.id, sequence: event.sequence, rootId: event.rootId, system: event.system, hash: event.payloadHash, workflowId: event.workflowId ?? "",
    });
    if (event.parentId) await versionedQuery("MATCH (p:Event {runId: $runId, id: $parent}), (e:Event {runId: $runId, id: $id}) CREATE (p)-[:CAUSED]->(e)", { runId: run.id, parent: event.parentId, id: event.id });
  }
  for (const action of run.simulation.actions) {
    await versionedQuery("MATCH (e:Event {runId: $runId, id: $eventId}), (w:Workflow {runId: $runId, id: $workflowId}) CREATE (a:Action {runId: $runId, id: $id, rootId: $rootId, status: $status, reason: $reason}) CREATE (e)-[:TRIGGERED]->(a) CREATE (a)-[:USED_WORKFLOW]->(w)", {
      runId: run.id, id: action.id, rootId: action.rootId, eventId: action.eventId, workflowId: action.workflowId, status: action.status, reason: action.reason,
    });
    if (action.emittedEventId) await versionedQuery("MATCH (a:Action {runId: $runId, id: $id}), (e:Event {runId: $runId, id: $emitted}) CREATE (a)-[:EMITTED]->(e)", { runId: run.id, id: action.id, emitted: action.emittedEventId });
  }
  await query("MATCH (r:Run {id: $id}) SET r.ready = true, r.revision = $revision, r.snapshot = $snapshot", { id: run.id, revision: run.revision, snapshot: JSON.stringify(run) });
}
export async function updateSnapshot(run: Run) {
  await query("MATCH (r:Run {id: $id}) SET r.revision = $revision, r.snapshot = $snapshot", { id: run.id, revision: run.revision, snapshot: JSON.stringify(run) });
}
export async function loadRun(id: string): Promise<Run | null> {
  const result = await query("MATCH (r:Run {id: $id, ready: true}) RETURN r.snapshot AS snapshot", { id });
  const row = result.data?.[0] as { snapshot?: string } | undefined;
  return row?.snapshot ? JSON.parse(row.snapshot) as Run : null;
}
export async function readWorkflows(id: string, revision: number): Promise<Workflow[]> {
  const result = await query("MATCH (w:Workflow {runId: $id, revision: $revision}) RETURN w.id AS id, w.name AS name, w.source AS source, w.target AS target, w.repair AS repair, w.failuresBeforeSuccess AS failuresBeforeSuccess ORDER BY w.id", { id, revision });
  return (result.data ?? []).map((row) => row as unknown as Workflow);
}
