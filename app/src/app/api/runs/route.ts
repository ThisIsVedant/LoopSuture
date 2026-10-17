import { NextResponse } from "next/server";
import { listRuns } from "@/lib/graph";
import { createRun } from "@/lib/service";
import { CreateRunSchema } from "@/lib/validation";
import { assertSameOrigin, failure, readBody } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() { try { return NextResponse.json({ runs: await listRuns() }); } catch (error) { return failure(error); } }
export async function POST(request: Request) {
  try { assertSameOrigin(request); const body = CreateRunSchema.parse(await readBody(request)); return NextResponse.json(await createRun(body.scenarioId, body.origin, body.value), { status: 201 }); }
  catch (error) { return failure(error); }
}
