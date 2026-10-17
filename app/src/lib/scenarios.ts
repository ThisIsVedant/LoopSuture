import type { Scenario, ScenarioId } from "./domain";
export const SCENARIOS: Scenario[] = [
  { id: "three-way", name: "The runaway handoff", summary: "Three successful automations send the same customer change around in circles.", systems: ["crm", "support", "marketing"], duplicateDeliveries: 1, actionBudget: 48,
    workflows: [
      { id: "crm-support", name: "Sync customer to support", source: "crm", target: "support", repair: "none" },
      { id: "support-marketing", name: "Sync case to audience", source: "support", target: "marketing", repair: "none" },
      { id: "marketing-crm", name: "Sync audience to customer", source: "marketing", target: "crm", repair: "none" },
    ] },
  { id: "two-way", name: "The mirror loop", summary: "Two syncs keep responding to each other's writes, even when nothing changed.", systems: ["crm", "support"], duplicateDeliveries: 1, actionBudget: 48,
    workflows: [
      { id: "crm-support", name: "Sync customer to support", source: "crm", target: "support", repair: "none" },
      { id: "support-crm", name: "Sync support to customer", source: "support", target: "crm", repair: "none" },
    ] },
  { id: "duplicate", name: "The repeated webhook", summary: "One input arrives four times. Its side effect should happen once, while later changes still work.", systems: ["crm", "marketing"], duplicateDeliveries: 4, actionBudget: 48,
    workflows: [{ id: "crm-marketing", name: "Publish customer to audience", source: "crm", target: "marketing", repair: "none" }] },
  { id: "healthy-retry", name: "The healthy retry", summary: "Two temporary failures precede a successful delivery. Repetition here is useful.", systems: ["crm", "support"], duplicateDeliveries: 1, actionBudget: 48,
    workflows: [{ id: "crm-support", name: "Retry customer delivery", source: "crm", target: "support", repair: "none", failuresBeforeSuccess: 2 }] },
];
export function getScenario(id: ScenarioId): Scenario {
  const scenario = SCENARIOS.find((item) => item.id === id);
  if (!scenario) throw new Error("Unknown scenario.");
  return structuredClone(scenario);
}
