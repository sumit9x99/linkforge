import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") || "ws_main";
  const db = getDb();

  const { rows } = await db.query<Record<string, unknown>>(
    `SELECT l.*,
      (SELECT COUNT(*) FROM clicks c WHERE c.link_id = l.id) as total_clicks,
      (SELECT COUNT(*) FROM clicks c WHERE c.link_id = l.id AND c.blocked = 1) as blocked_clicks
     FROM links l WHERE l.workspace_id = ? ORDER BY l.created_at DESC`,
    [workspaceId]
  );

  const links = rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    slug: r.slug,
    title: r.title,
    destinationUrl: r.destination_url,
    domain: r.domain,
    smartRules: JSON.parse(String(r.smart_rules_json || "[]")),
    abEnabled: Boolean(r.ab_enabled),
    abVariants: JSON.parse(String(r.ab_variants_json || "[]")),
    multiShield: JSON.parse(String(r.multishield_json || "{}")),
    deepLink: JSON.parse(String(r.deeplink_json || "{}")),
    utm: JSON.parse(String(r.utm_json || "{}")),
    pixelId: r.pixel_id || "",
    active: Boolean(r.active),
    totalClicks: Number(r.total_clicks || 0),
    blockedClicks: Number(r.blocked_clicks || 0),
    createdAt: r.created_at,
  }));

  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const destinationUrl = String(body.destinationUrl || "").trim();
  if (!destinationUrl) {
    return NextResponse.json({ error: "Destination URL is required" }, { status: 400 });
  }

  const rawSlug = String(body.slug || "").trim();
  const slug =
    rawSlug.replace(/[^a-zA-Z0-9_-]/g, "") || crypto.randomBytes(3).toString("hex");
  const id = `lnk_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();

  try {
    await db.run(
      `INSERT INTO links (
        id, workspace_id, slug, title, destination_url, domain,
        smart_rules_json, ab_enabled, ab_variants_json, multishield_json,
        deeplink_json, utm_json, pixel_id, active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.workspaceId || "ws_main",
        slug,
        String(body.title || slug).trim(),
        destinationUrl,
        String(body.domain || "go.linkforge.local"),
        JSON.stringify(body.smartRules || []),
        body.abEnabled ? 1 : 0,
        JSON.stringify(body.abVariants || []),
        JSON.stringify(
          body.multiShield || {
            enabled: true,
            blockBots: true,
            blockVpns: false,
            safeInterstitial: false,
            blockedCountries: [],
          }
        ),
        JSON.stringify(body.deepLink || { enabled: false, platform: "auto" }),
        JSON.stringify(body.utm || {}),
        String(body.pixelId || ""),
        1,
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
