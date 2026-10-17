"use client";
import { useMemo } from "react";
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, type NodeProps, type Node, type Edge } from "@xyflow/react";
import { Database, Headphones, Send, ArrowUpRight } from "lucide-react";
import { SYSTEMS, type Run, type Scenario, type SystemId } from "@/lib/domain";
import "@xyflow/react/dist/style.css";

type SystemNode = Node<{ system: SystemId; deliveries: number; record: string; active: boolean }, "system">;
const icons = { crm: Database, support: Headphones, marketing: Send };
function ServiceNode({ data }: NodeProps<SystemNode>) {
  const system = SYSTEMS[data.system];
  const Icon = icons[data.system];
  return <div className="service-node">
    <Handle type="target" position={Position.Left} />
    <div className="service-top"><span className="service-icon" style={{ background: system.color }}><Icon size={19} strokeWidth={1.7} /></span><span className="service-tag">DEMO SERVICE</span><ArrowUpRight size={14} /></div>
    <h3>{system.name}</h3><p>{system.subtitle}</p>
    <div className="service-bottom"><span className={`service-dot ${data.active ? "active" : ""}`} />{data.active ? data.record : "Waiting for an edit"}<strong>{data.deliveries}</strong></div>
    <Handle type="source" position={Position.Right} />
  </div>;
}
const nodeTypes = { system: ServiceNode };
export default function WorkflowGraph({ scenario, run }: { scenario: Scenario; run: Run | null }) {
  const { nodes, edges } = useMemo(() => {
    const three = scenario.systems.length === 3;
    const positions: Record<SystemId, { x: number; y: number }> = three
      ? { crm: { x: 15, y: 140 }, support: { x: 340, y: 20 }, marketing: { x: 340, y: 265 } }
      : { crm: { x: 10, y: 110 }, support: { x: 340, y: 110 }, marketing: { x: 340, y: 110 } };
    const nodes: SystemNode[] = scenario.systems.map((system) => ({ id: system, type: "system", position: positions[system], data: {
      system, deliveries: run?.simulation.actions.filter((a) => a.target === system && a.status === "delivered").length ?? 0,
      record: run?.simulation.records[system] ? `Version ${run.simulation.records[system]!.version} · ${run.simulation.records[system]!.status}` : "Waiting", active: Boolean(run?.simulation.records[system]),
    } }));
    const looping = run?.simulation.termination === "budget-exhausted";
    const edges: Edge[] = scenario.workflows.map((workflow) => {
      const patched = workflow.repair !== "none";
      return { id: workflow.id, source: workflow.source, target: workflow.target, type: "smoothstep", animated: Boolean(looping && !patched),
        label: patched ? workflow.repair === "disable" ? "Disabled" : "Guard installed" : workflow.name.replace("Sync ", ""),
        style: { stroke: patched ? "#2e7560" : looping ? "#c58439" : "#b4b9ac", strokeWidth: 1.7, strokeDasharray: workflow.repair === "disable" ? "5 5" : undefined },
        markerEnd: { type: MarkerType.ArrowClosed, color: patched ? "#2e7560" : looping ? "#c58439" : "#b4b9ac" },
        labelStyle: { fontSize: 10, fill: patched ? "#2e7560" : "#73796a" }, labelBgStyle: { fill: "#f8f9f4" }, labelBgPadding: [8, 5] as [number, number],
      };
    });
    return { nodes, edges };
  }, [scenario, run]);
  return <ReactFlow key={scenario.id} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.15 }} minZoom={0.5} maxZoom={1.7} nodesDraggable={false} nodesConnectable={false} colorMode="light">
    <Background color="#d8ddd1" gap={22} size={1} /><Controls showInteractive={false} />
  </ReactFlow>;
}
