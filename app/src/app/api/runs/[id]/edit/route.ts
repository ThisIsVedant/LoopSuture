import { NextResponse } from "next/server";
import { freshEdit } from "@/lib/service";
import { FreshEditSchema } from "@/lib/validation";
import { assertId, assertSameOrigin, failure, readBody } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { assertSameOrigin(request); const { id } = await context.params; assertId(id); const body = FreshEditSchema.parse(await readBody(request)); return NextResponse.json(await freshEdit(id, body.origin, body.status)); } catch (error) { return failure(error); }
}
