import { NextResponse } from "next/server";
import { checkGraph } from "@/lib/graph";
import { readModelSettings } from "@/lib/model-config";
export const runtime = "nodejs";
export async function GET() {
  try { await checkGraph(); const settings = readModelSettings(process.env); return NextResponse.json({ graph: "connected", model: settings ? "configured" : "not-configured", modelProvider: settings?.label ?? null, modelName: settings?.model ?? null, reasoningEffort: settings?.reasoningEffort ?? null }); }
  catch { return NextResponse.json({ graph: "unavailable", model: "not-configured" }, { status: 503 }); }
}
