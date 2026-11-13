import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") || "ws_main";
  const { rows } = await getDb().query<Record<string, unknown>>(
    "SELECT * FROM integrations WHERE workspace_id = ? ORDER BY created_at ASC",
    [workspaceId]
  );

  const integrations = rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    provider: r.provider,
    label: r.label,
    endpointOrHandle: r.endpoint_or_handle,
    enabled: Boolean(r.enabled),
    config: JSON.parse(String(r.config_json || "{}")),
    createdAt: r.created_at,
  }));

  return NextResponse.json({ integrations });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = `int_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();
  await getDb().run(
    "INSERT INTO integrations (id, workspace_id, provider, label, endpoint_or_handle, enabled, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      body.workspaceId || "ws_main",
      String(body.provider || "webhook"),
      String(body.label || "Custom Webhook"),
      String(body.endpointOrHandle || ""),
      1,
      JSON.stringify(body.config || {}),
      now,
    ]
  );
  return NextResponse.json({ id, ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await getDb().run(
    "UPDATE integrations SET enabled = COALESCE(?, enabled), endpoint_or_handle = COALESCE(?, endpoint_or_handle) WHERE id = ?",
    [
      typeof body.enabled === "boolean" ? (body.enabled ? 1 : 0) : null,
      body.endpointOrHandle ?? null,
      body.id,
    ]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await getDb().run("DELETE FROM integrations WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
