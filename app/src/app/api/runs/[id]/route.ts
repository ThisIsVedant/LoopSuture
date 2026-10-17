import { NextResponse } from "next/server";
import { requireRun } from "@/lib/service";
import { assertId, failure } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; assertId(id); return NextResponse.json(await requireRun(id)); } catch (error) { return failure(error); }
}
