import type { Investigation } from "./domain";

export function reuseInvestigation(report: Investigation | undefined, revision: number, modelConfigured: boolean): boolean {
  if (!report || report.revision !== revision) return false;
  // A successful model result is stable. A provider failure remains retryable
  // without requiring a new run or changing its business input.
  return report.mode === "model" || !modelConfigured;
}
