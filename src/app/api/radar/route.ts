import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") || "ws_main";
  const { rows: checks } = await getDb().query(
    "SELECT * FROM radar_checks WHERE workspace_id = ? ORDER BY checked_at DESC LIMIT 20",
    [workspaceId]
  );
  return NextResponse.json({ checks });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const targetUrl = String(body.targetUrl || "").trim();
  if (!targetUrl) return NextResponse.json({ error: "targetUrl required" }, { status: 400 });

  let statusCode = 0;
  let riskLevel: "low" | "medium" | "high" = "low";
  let notes = "";

  try {
    const u = new URL(targetUrl);
    if (u.protocol !== "https:") {
      riskLevel = "medium";
      notes = "Non-HTTPS destination may trigger browser or Instagram warnings. ";
    }
    const res = await fetch(u.toString(), {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "LinkForge-Radar/1.0" },
    });
    statusCode = res.status;
    if (statusCode >= 400) {
      riskLevel = "high";
      notes += `Returned HTTP ${statusCode}.`;
    } else {
      notes += `Reachable (HTTP ${statusCode}), final host ${new URL(res.url).hostname}.`;
    }
  } catch (err) {
    riskLevel = "high";
    notes = err instanceof Error ? err.message : "Destination unreachable.";
  }

  const id = `rad_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();
  await getDb().run(
    "INSERT INTO radar_checks (id, workspace_id, target_url, status_code, risk_level, notes, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, body.workspaceId || "ws_main", targetUrl, statusCode, riskLevel, notes.trim(), now]
  );

  return NextResponse.json({
    id,
    target_url: targetUrl,
    status_code: statusCode,
    risk_level: riskLevel,
    notes: notes.trim(),
    checked_at: now,
  });
}
