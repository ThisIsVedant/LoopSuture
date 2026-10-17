import { NextResponse } from "next/server";
import { investigate } from "@/lib/service";
import { assertId, assertSameOrigin, failure } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const { id } = await context.params; assertId(id); return NextResponse.json(await investigate(id)); } catch (error) { return failure(error); }
}
