import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const rpc = await req.json();
  const db = getDb();
  const id = rpc.id ?? null;

  if (rpc.method === "tools/list") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          { name: "list_links", description: "List all links in a workspace" },
          { name: "create_link", description: "Create a new short link or DeepLink" },
          { name: "get_analytics", description: "Fetch workspace click and quality summary" },
        ],
      },
    });
  }

  if (rpc.method === "tools/call") {
    const name = rpc.params?.name;
    const args = rpc.params?.arguments || {};
    const workspaceId = String(args.workspaceId || "ws_main");

    if (name === "list_links") {
      const { rows: links } = await db.query(
        "SELECT id, slug, title, destination_url, active FROM links WHERE workspace_id = ?",
        [workspaceId]
      );
      return NextResponse.json({ jsonrpc: "2.0", id, result: { links } });
    }

    if (name === "create_link") {
      const slug = String(args.slug || crypto.randomBytes(3).toString("hex"));
      const linkId = `lnk_${crypto.randomBytes(4).toString("hex")}`;
      await db.run(
        "INSERT INTO links (id, workspace_id, slug, title, destination_url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [
          linkId,
          workspaceId,
          slug,
          String(args.title || slug),
          String(args.destinationUrl || "https://example.com"),
          new Date().toISOString(),
        ]
      );
      return NextResponse.json({ jsonrpc: "2.0", id, result: { id: linkId, slug } });
    }

    if (name === "get_analytics") {
      const { rows } = await db.query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN blocked=1 THEN 1 ELSE 0 END) as blocked FROM clicks WHERE workspace_id = ?",
        [workspaceId]
      );
      return NextResponse.json({ jsonrpc: "2.0", id, result: rows[0] || { total: 0, blocked: 0 } });
    }
  }

  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found" },
  });
}
