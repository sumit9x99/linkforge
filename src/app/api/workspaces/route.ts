import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const { rows: workspaces } = await db.query(
    "SELECT * FROM workspaces ORDER BY created_at ASC"
  );
  const { rows: members } = await db.query(
    "SELECT * FROM team_members ORDER BY created_at ASC"
  );
  return NextResponse.json({ workspaces, members });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const now = new Date().toISOString();

  if (body.type === "member") {
    const id = `tm_${crypto.randomBytes(4).toString("hex")}`;
    await db.run(
      "INSERT INTO team_members (id, workspace_id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        body.workspaceId,
        String(body.name || "").trim(),
        String(body.email || "").trim(),
        body.role || "Editor",
        now,
      ]
    );
    return NextResponse.json({ id, ok: true }, { status: 201 });
  }

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Workspace name required" }, { status: 400 });
  const slug =
    String(body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `ws-${Date.now()}`;
  const id = `ws_${crypto.randomBytes(4).toString("hex")}`;
  const customDomain = String(body.customDomain || `${slug}.linkforge.local`).trim();

  await db.run(
    "INSERT INTO workspaces (id, name, slug, custom_domain, white_label, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, name, slug, customDomain, body.whiteLabel ? 1 : 0, now]
  );

  return NextResponse.json({ id, name, slug, custom_domain: customDomain }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.run(
    "UPDATE workspaces SET name = COALESCE(?, name), custom_domain = COALESCE(?, custom_domain), white_label = COALESCE(?, white_label) WHERE id = ?",
    [
      body.name ?? null,
      body.customDomain ?? null,
      typeof body.whiteLabel === "boolean" ? (body.whiteLabel ? 1 : 0) : null,
      body.id,
    ]
  );
  return NextResponse.json({ ok: true });
}
