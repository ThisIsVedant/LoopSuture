import { z } from "zod";
export const CreateRunSchema = z.object({
  scenarioId: z.enum(["two-way", "three-way", "duplicate", "healthy-retry"]),
  origin: z.enum(["crm", "support", "marketing"]).optional(),
  value: z.object({ name: z.string().trim().min(1).max(100), status: z.enum(["new", "qualified", "customer"]), version: z.number().int().min(1).max(100000) }).optional(),
});
export const ApplyRepairSchema = z.object({ candidateId: z.string().min(1).max(150), revision: z.number().int().min(0) });
export const FreshEditSchema = z.object({ origin: z.enum(["crm", "support", "marketing"]), status: z.enum(["new", "qualified", "customer"]) });
export function validRunId(id: string): boolean { return /^[a-f0-9-]{36}$/.test(id); }
