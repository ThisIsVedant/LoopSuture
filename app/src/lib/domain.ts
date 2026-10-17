export type SystemId = "crm" | "support" | "marketing";
export type RepairKind = "none" | "disable" | "deduplicate" | "suppress-noop";
export type ScenarioId = "two-way" | "three-way" | "duplicate" | "healthy-retry";
export interface BusinessValue { name: string; status: string; version: number }
export interface Workflow {
  id: string; name: string; source: SystemId; target: SystemId;
  repair: RepairKind; failuresBeforeSuccess?: number;
}
export interface Scenario {
  id: ScenarioId; name: string; summary: string; systems: SystemId[];
  workflows: Workflow[]; duplicateDeliveries: number; actionBudget: number;
}
export interface InputChange { id: string; origin: SystemId; value: BusinessValue }
export interface ExecutionEvent {
  id: string; sequence: number; rootId: string; parentId: string | null;
  system: SystemId; value: BusinessValue; payloadHash: string; workflowId: string | null;
}
export interface ExecutionAction {
  id: string; sequence: number; eventId: string; rootId: string; workflowId: string;
  source: SystemId; target: SystemId; status: "delivered" | "suppressed" | "retry";
  reason: string; emittedEventId: string | null;
}
export interface Simulation {
  events: ExecutionEvent[]; actions: ExecutionAction[];
  records: Partial<Record<SystemId, BusinessValue>>;
  termination: "drained" | "budget-exhausted"; pendingEvents: number;
  goals: { system: SystemId; passed: boolean }[];
  metrics: { attempted: number; delivered: number; suppressed: number; retries: number; repeated: number; goalsPassed: number; goalsTotal: number };
}
export interface Run {
  id: string; createdAt: string; scenario: Scenario; input: InputChange;
  revision: number; simulation: Simulation; investigation?: Investigation;
  history?: { revision: number; simulation: Simulation; workflows: Workflow[]; investigation?: Investigation }[];
  appliedRepair?: { candidateId: string; workflowId: string; workflowIds: string[]; kind: RepairKind; revision: number };
}
export interface PathEvidence { eventIds: string[]; systems: SystemId[]; workflowIds: string[]; rootId: string }
export interface VerificationProbe {
  origin: SystemId; termination: Simulation["termination"]; passed: boolean;
  delivered: number; goalsPassed: number; goalsTotal: number; repeated: number;
}
export interface Candidate {
  id: string; workflowId: string; workflowIds: string[]; kind: Exclude<RepairKind, "none">; title: string;
  eligible: boolean; reason: string; score: number; baselineReplay: Simulation;
  probes: VerificationProbe[];
}
export interface ToolReceipt { tool: string; detail: string; source: "graph" | "replay" }
export interface Investigation {
  revision: number; status: "repair-found" | "healthy" | "unresolved";
  paths: PathEvidence[]; candidates: Candidate[]; selectedId: string | null;
  explanation: string; mode: "graph" | "model"; receipts: ToolReceipt[];
  modelNote?: string;
  modelProvider?: string;
  modelExecution?: { model: string; requests: number; retries: number; elapsedMs: number };
}
export const SYSTEMS: Record<SystemId, { name: string; subtitle: string; color: string }> = {
  crm: { name: "Customer CRM", subtitle: "Customer records", color: "#b0d494" },
  support: { name: "Support desk", subtitle: "Customer cases", color: "#92c9d6" },
  marketing: { name: "Marketing", subtitle: "Audience profiles", color: "#d8b2e8" },
};
