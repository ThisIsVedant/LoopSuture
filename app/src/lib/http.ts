import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RequestError } from "./service";
import { validRunId } from "./validation";
export function assertId(id: string) { if (!validRunId(id)) throw new RequestError("Invalid run identifier."); }
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  // Next.js may normalize the internal request URL to localhost. Compare the
  // browser's authority with the received Host header, including its port.
  const originUrl = new URL(origin);
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") ?? requestUrl.host;
  if (originUrl.host !== host || originUrl.protocol !== requestUrl.protocol) throw new RequestError("Cross-origin changes are not allowed.", 403);
}
export async function readBody(request: Request) {
  const text = await request.text();
  if (text.length > 10000) throw new RequestError("Request is too large.", 413);
  try { return JSON.parse(text); } catch { throw new RequestError("Request body must be valid JSON."); }
}
export function failure(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues.map((issue) => issue.message).join("; ") }, { status: 400 });
  if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("LoopSuture operation failed:", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json({ error: "The operation could not complete. Check that FalkorDB is running, then retry. No successful repair was recorded." }, { status: 503 });
}
