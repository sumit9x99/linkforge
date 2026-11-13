import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") || "ws_main";
  const db = getDb();
  const { rows } = await db.query<Record<string, unknown>>(
    "SELECT * FROM forms WHERE workspace_id = ? ORDER BY created_at DESC",
    [workspaceId]
  );

  const { rows: subs } = await db.query<Record<string, unknown>>(
    `SELECT fs.* FROM form_submissions fs
     JOIN forms f ON f.id = fs.form_id
     WHERE f.workspace_id = ? ORDER BY fs.created_at DESC LIMIT 50`,
    [workspaceId]
  );

  const forms = rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    title: r.title,
    kind: r.kind,
    fields: JSON.parse(String(r.fields_json || "[]")),
    createdAt: r.created_at,
  }));

  const submissions = subs.map((s) => ({
    id: s.id,
    formId: s.form_id,
    payload: JSON.parse(String(s.payload_json || "{}")),
    createdAt: s.created_at,
  }));

  return NextResponse.json({ forms, submissions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const now = new Date().toISOString();

  if (body.action === "submit") {
    const id = `sub_${crypto.randomBytes(4).toString("hex")}`;
    await db.run(
      "INSERT INTO form_submissions (id, form_id, payload_json, created_at) VALUES (?, ?, ?, ?)",
      [id, body.formId, JSON.stringify(body.payload || {}), now]
    );
    return NextResponse.json({ id, ok: true }, { status: 201 });
  }

  const id = `frm_${crypto.randomBytes(4).toString("hex")}`;
  await db.run(
    "INSERT INTO forms (id, workspace_id, title, kind, fields_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      id,
      body.workspaceId || "ws_main",
      String(body.title || "Untitled Form").trim(),
      body.kind === "quiz" ? "quiz" : "form",
      JSON.stringify(body.fields || []),
      now,
    ]
  );
  return NextResponse.json({ id, ok: true }, { status: 201 });
}
