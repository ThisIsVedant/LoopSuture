import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "LoopSuture — Automation Repair Workbench", description: "Trace runaway automations, test targeted repairs, and preserve useful work with FalkorDB." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
