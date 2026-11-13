import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") || "ws_main";
  const db = getDb();
  const { rows } = await db.query<Record<string, unknown>>(
    "SELECT * FROM bio_pages WHERE workspace_id = ? ORDER BY created_at DESC",
    [workspaceId]
  );

  const pages = rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    slug: r.slug,
    title: r.title,
    bio: r.bio,
    avatarText: r.avatar_text,
    theme: JSON.parse(String(r.theme_json || "{}")),
    blocks: JSON.parse(String(r.blocks_json || "[]")),
    views: Number(r.views || 0),
    createdAt: r.created_at,
  }));
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const id = `bio_${crypto.randomBytes(4).toString("hex")}`;
  const slug =
    String(body.slug || body.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "") || `page-${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await db.run(
      `INSERT INTO bio_pages (id, workspace_id, slug, title, bio, avatar_text, theme_json, blocks_json, views, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.workspaceId || "ws_main",
        slug,
        String(body.title || "Untitled Page").trim(),
        String(body.bio || "").trim(),
        String(body.avatarText || "LF").slice(0, 2).toUpperCase(),
        JSON.stringify(body.theme || { bg: "#0f172a", accent: "#2563eb", style: "clean" }),
        JSON.stringify(body.blocks || []),
        0,
        now,
      ]
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Slug already exists" },
      { status: 409 }
    );
  }
  return NextResponse.json({ id, slug, ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.run(
    `UPDATE bio_pages SET
      title = COALESCE(?, title),
      bio = COALESCE(?, bio),
      avatar_text = COALESCE(?, avatar_text),
      theme_json = COALESCE(?, theme_json),
      blocks_json = COALESCE(?, blocks_json)
     WHERE id = ?`,
    [
      body.title ?? null,
      body.bio ?? null,
      body.avatarText ?? null,
      body.theme ? JSON.stringify(body.theme) : null,
      body.blocks ? JSON.stringify(body.blocks) : null,
      body.id,
    ]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await getDb().run("DELETE FROM bio_pages WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
