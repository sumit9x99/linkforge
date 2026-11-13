import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { computeTrafficQuality } from "@/lib/routing-engine";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") || "ws_main";
  const db = getDb();

  const { rows: totalRows } = await db.query<{ total: number; blocked: number | null }>(
    `SELECT COUNT(*) as total,
      SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as blocked
     FROM clicks WHERE workspace_id = ?`,
    [workspaceId]
  );

  const totals = totalRows[0] || { total: 0, blocked: 0 };
  const totalClicks = Number(totals.total || 0);
  const blockedClicks = Number(totals.blocked || 0);
  const qualityScore = computeTrafficQuality(totalClicks, blockedClicks);

  const dailySql = db.isPg
    ? `SELECT to_char(created_at, 'YYYY-MM-DD') as day,
        COUNT(*) as total,
        SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as blocked
       FROM clicks WHERE workspace_id = $1
       GROUP BY day ORDER BY day ASC LIMIT 14`
    : `SELECT substr(created_at, 1, 10) as day,
        COUNT(*) as total,
        SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as blocked
       FROM clicks WHERE workspace_id = ?
       GROUP BY day ORDER BY day ASC LIMIT 14`;

  const { rows: daily } = await db.query(dailySql, [workspaceId]);

  const { rows: byCountry } = await db.query(
    `SELECT country as name, COUNT(*) as count
     FROM clicks WHERE workspace_id = ?
     GROUP BY country ORDER BY count DESC LIMIT 8`,
    [workspaceId]
  );

  const { rows: byOs } = await db.query(
    `SELECT os as name, COUNT(*) as count
     FROM clicks WHERE workspace_id = ?
     GROUP BY os ORDER BY count DESC`,
    [workspaceId]
  );

  const { rows: byReferrer } = await db.query(
    `SELECT referrer as name, COUNT(*) as count
     FROM clicks WHERE workspace_id = ?
     GROUP BY referrer ORDER BY count DESC LIMIT 6`,
    [workspaceId]
  );

  const { rows: abBreakdown } = await db.query(
    `SELECT l.title as link_title, c.variant_id as variant_id, COUNT(*) as clicks
     FROM clicks c JOIN links l ON l.id = c.link_id
     WHERE c.workspace_id = ? AND c.variant_id IS NOT NULL
     GROUP BY l.title, c.variant_id`,
    [workspaceId]
  );

  const { rows: recentEvents } = await db.query(
    `SELECT c.*, l.slug as link_slug
     FROM clicks c JOIN links l ON l.id = c.link_id
     WHERE c.workspace_id = ?
     ORDER BY c.created_at DESC LIMIT 20`,
    [workspaceId]
  );

  return NextResponse.json({
    totalClicks,
    cleanClicks: totalClicks - blockedClicks,
    blockedClicks,
    qualityScore,
    daily,
    byCountry,
    byOs,
    byReferrer,
    abBreakdown,
    recentEvents,
  });
}
