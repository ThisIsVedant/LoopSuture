import { NextResponse } from "next/server";
import { applyRepair } from "@/lib/service";
import { ApplyRepairSchema } from "@/lib/validation";
import { assertId, assertSameOrigin, failure, readBody } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const { id } = await context.params; assertId(id); const body = ApplyRepairSchema.parse(await readBody(request)); return NextResponse.json(await applyRepair(id, body.candidateId, body.revision)); } catch (error) { return failure(error); }
}
