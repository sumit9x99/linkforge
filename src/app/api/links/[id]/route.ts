import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();
  const db = getDb();

  const { rows } = await db.query("SELECT id FROM links WHERE id = ?", [id]);
  if (!rows.length) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  await db.run(
    `UPDATE links SET
      title = COALESCE(?, title),
      destination_url = COALESCE(?, destination_url),
      smart_rules_json = COALESCE(?, smart_rules_json),
      ab_enabled = COALESCE(?, ab_enabled),
      ab_variants_json = COALESCE(?, ab_variants_json),
      multishield_json = COALESCE(?, multishield_json),
      deeplink_json = COALESCE(?, deeplink_json),
      utm_json = COALESCE(?, utm_json),
      pixel_id = COALESCE(?, pixel_id),
      active = COALESCE(?, active)
    WHERE id = ?`,
    [
      body.title ?? null,
      body.destinationUrl ?? null,
      body.smartRules ? JSON.stringify(body.smartRules) : null,
      typeof body.abEnabled === "boolean" ? (body.abEnabled ? 1 : 0) : null,
      body.abVariants ? JSON.stringify(body.abVariants) : null,
      body.multiShield ? JSON.stringify(body.multiShield) : null,
      body.deepLink ? JSON.stringify(body.deepLink) : null,
      body.utm ? JSON.stringify(body.utm) : null,
      body.pixelId ?? null,
      typeof body.active === "boolean" ? (body.active ? 1 : 0) : null,
      id,
    ]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const db = getDb();
  await db.run("DELETE FROM links WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
