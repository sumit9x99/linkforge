import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";

export type DbInterface = {
  isPg: boolean;
  query: <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows: T[] }>;
  run: (sql: string, params?: unknown[]) => Promise<{ changes: number }>;
};

let pgPool: Pool | null = null;
let sqliteDb: DatabaseSync | null = null;

function getPgPool(): Pool | null {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connStr) return null;
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: connStr,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    });
  }
  return pgPool;
}

function getSqlite(): DatabaseSync {
  if (sqliteDb) return sqliteDb;
  // Fall back to /tmp on Vercel read-only filesystem if not local
  const baseDir =
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? "/tmp"
      : path.join(process.cwd(), "data");
  fs.mkdirSync(baseDir, { recursive: true });
  const db = new DatabaseSync(path.join(baseDir, "linkforge.db"));
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  initSqliteSchema(db);
  seedSqliteIfEmpty(db);
  sqliteDb = db;
  return db;
}

export function getDb(): DbInterface {
  const pool = getPgPool();
  if (pool) {
    return {
      isPg: true,
      async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
        const pgSql = convertPlaceholders(sql);
        const res = await pool.query(pgSql, params as any[]);
        return { rows: res.rows as T[] };
      },
      async run(sql: string, params: unknown[] = []) {
        const pgSql = convertPlaceholders(sql);
        const res = await pool.query(pgSql, params as any[]);
        return { changes: res.rowCount || 0 };
      },
    };
  }

  const sdb = getSqlite();
  return {
    isPg: false,
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const stmt = sdb.prepare(sql);
      const rows = stmt.all(...params) as T[];
      return { rows };
    },
    async run(sql: string, params: unknown[] = []) {
      const stmt = sdb.prepare(sql);
      const res = stmt.run(...params);
      return { changes: res.changes };
    },
  };
}

function convertPlaceholders(sql: string): string {
  let idx = 1;
  return sql.replace(/\?/g, () => `$${idx++}`);
}

function initSqliteSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      custom_domain TEXT NOT NULL DEFAULT 'go.linkforge.local',
      white_label INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      destination_url TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT 'go.linkforge.local',
      smart_rules_json TEXT NOT NULL DEFAULT '[]',
      ab_enabled INTEGER NOT NULL DEFAULT 0,
      ab_variants_json TEXT NOT NULL DEFAULT '[]',
      multishield_json TEXT NOT NULL DEFAULT '{"enabled":true,"blockBots":true,"blockVpns":false,"safeInterstitial":false,"blockedCountries":[]}',
      deeplink_json TEXT NOT NULL DEFAULT '{"enabled":false,"platform":"auto"}',
      utm_json TEXT NOT NULL DEFAULT '{}',
      pixel_id TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS clicks (
      id TEXT PRIMARY KEY,
      link_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      variant_id TEXT,
      country TEXT NOT NULL,
      os TEXT NOT NULL,
      device TEXT NOT NULL,
      browser TEXT NOT NULL,
      referrer TEXT NOT NULL,
      blocked INTEGER NOT NULL DEFAULT 0,
      block_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bio_pages (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      bio TEXT NOT NULL,
      avatar_text TEXT NOT NULL DEFAULT 'LF',
      theme_json TEXT NOT NULL DEFAULT '{"bg":"#0f172a","accent":"#2563eb","style":"clean"}',
      blocks_json TEXT NOT NULL DEFAULT '[]',
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'form',
      fields_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS form_submissions (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS radar_checks (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      target_url TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      notes TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      label TEXT NOT NULL,
      endpoint_or_handle TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
  `);
}

function seedSqliteIfEmpty(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) as count FROM workspaces").get() as { count: number };
  if (row.count > 0) return;

  const now = new Date().toISOString();
  const ws1 = "ws_main";
  const ws2 = "ws_agency";

  db.prepare(
    "INSERT INTO workspaces (id, name, slug, custom_domain, white_label, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(ws1, "Creator Studio", "creator-studio", "go.creatorstudio.to", 1, now);

  db.prepare(
    "INSERT INTO workspaces (id, name, slug, custom_domain, white_label, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(ws2, "Northstar Agency", "northstar", "l.northstar.io", 1, now);

  const insertMember = db.prepare(
    "INSERT INTO team_members (id, workspace_id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insertMember.run("tm_1", ws1, "Alex Rivera", "alex@creatorstudio.to", "Owner", now);
  insertMember.run("tm_2", ws1, "Maya Chen", "maya@creatorstudio.to", "Editor", now);
  insertMember.run("tm_3", ws2, "Jordan Lee", "jordan@northstar.io", "Admin", now);

  const insertLink = db.prepare(`
    INSERT INTO links (
      id, workspace_id, slug, title, destination_url, domain,
      smart_rules_json, ab_enabled, ab_variants_json, multishield_json,
      deeplink_json, utm_json, pixel_id, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLink.run(
    "lnk_ig",
    ws1,
    "ig-drop",
    "Instagram Bio DeepLink",
    "https://instagram.com/creators",
    "go.creatorstudio.to",
    JSON.stringify([
      { id: "r1", field: "country", operator: "equals", value: "FR", targetUrl: "https://instagram.com/creators?hl=fr" },
    ]),
    0,
    "[]",
    JSON.stringify({ enabled: true, blockBots: true, blockVpns: true, safeInterstitial: true, blockedCountries: [] }),
    JSON.stringify({ enabled: true, platform: "instagram" }),
    JSON.stringify({ source: "tiktok", medium: "bio", campaign: "autumn_drop" }),
    "px_meta_9821",
    1,
    now
  );

  insertLink.run(
    "lnk_ab",
    ws1,
    "offer-split",
    "Newsletter Offer A/B Test",
    "https://example.com/offer-a",
    "go.creatorstudio.to",
    "[]",
    1,
    JSON.stringify([
      { id: "var_a", label: "Variant A (Direct)", url: "https://example.com/offer-a", weight: 50 },
      { id: "var_b", label: "Variant B (Video)", url: "https://example.com/offer-b", weight: 50 },
    ]),
    JSON.stringify({ enabled: true, blockBots: true, blockVpns: false, safeInterstitial: false, blockedCountries: [] }),
    JSON.stringify({ enabled: false, platform: "auto" }),
    JSON.stringify({ source: "youtube", medium: "description", campaign: "split_test" }),
    "",
    1,
    now
  );

  insertLink.run(
    "lnk_geo",
    ws1,
    "app-download",
    "Smart OS App Router",
    "https://example.com/web-app",
    "go.creatorstudio.to",
    JSON.stringify([
      { id: "r_ios", field: "os", operator: "equals", value: "iOS", targetUrl: "https://apps.apple.com/app/id000000" },
      { id: "r_and", field: "os", operator: "equals", value: "Android", targetUrl: "https://play.google.com/store/apps/details?id=app.demo" },
    ]),
    0,
    "[]",
    JSON.stringify({ enabled: true, blockBots: true, blockVpns: false, safeInterstitial: false, blockedCountries: [] }),
    JSON.stringify({ enabled: false, platform: "auto" }),
    "{}",
    "",
    1,
    now
  );

  insertLink.run(
    "lnk_ag",
    ws2,
    "vip-roster",
    "Agency Talent Hub",
    "https://example.com/talent",
    "l.northstar.io",
    "[]",
    0,
    "[]",
    JSON.stringify({ enabled: true, blockBots: true, blockVpns: true, safeInterstitial: true, blockedCountries: [] }),
    JSON.stringify({ enabled: true, platform: "telegram" }),
    "{}",
    "",
    1,
    now
  );

  const insertClick = db.prepare(`
    INSERT INTO clicks (id, link_id, workspace_id, variant_id, country, os, device, browser, referrer, blocked, block_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const countries = ["US", "GB", "DE", "FR", "CA", "BR", "JP"];
  const osList = ["iOS", "Android", "macOS", "Windows"];
  const browsers = ["Safari", "Chrome", "Edge", "Firefox"];
  const referrers = ["instagram.com", "tiktok.com", "youtube.com", "x.com", "direct"];

  for (let day = 13; day >= 0; day--) {
    const count = 8 + ((day * 5) % 11);
    for (let i = 0; i < count; i++) {
      const dt = new Date(Date.now() - day * 86400000 - i * 1800000).toISOString();
      const linkPick = i % 3 === 0 ? "lnk_ab" : i % 2 === 0 ? "lnk_ig" : "lnk_geo";
      const os = osList[(day + i) % osList.length];
      const device = os === "iOS" || os === "Android" ? "Mobile" : "Desktop";
      const blocked = i === 0 && day % 2 === 0 ? 1 : 0;
      insertClick.run(
        `clk_${day}_${i}_${crypto.randomBytes(3).toString("hex")}`,
        linkPick,
        ws1,
        linkPick === "lnk_ab" ? (i % 2 === 0 ? "var_a" : "var_b") : null,
        countries[(day + i) % countries.length],
        os,
        device,
        browsers[(day + i) % browsers.length],
        referrers[(day + i) % referrers.length],
        blocked,
        blocked ? "bot_signature" : null,
        dt
      );
    }
  }

  db.prepare(`
    INSERT INTO bio_pages (id, workspace_id, slug, title, bio, avatar_text, theme_json, blocks_json, views, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "bio_1",
    ws1,
    "alex-studio",
    "Alex Rivera",
    "Creator, filmmaker & digital tools. New preset pack and weekly dispatch below.",
    "AR",
    JSON.stringify({ bg: "#0f172a", accent: "#3b82f6", style: "clean" }),
    JSON.stringify([
      { id: "b1", type: "link", label: "Watch New Breakdown (YouTube)", url: "https://youtube.com/@linkforge", badge: "New" },
      { id: "b2", type: "link", label: "Download LUTs & Presets", url: "/ig-drop", badge: "Free" },
      { id: "b3", type: "link", label: "Book 1:1 Creative Review", url: "/offer-split", badge: "" },
      { id: "b4", type: "form", label: "Join the Weekly Dispatch", formId: "frm_1" },
    ]),
    1428,
    now
  );

  db.prepare(
    "INSERT INTO forms (id, workspace_id, title, kind, fields_json, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    "frm_1",
    ws1,
    "Creator Dispatch & Collab Intake",
    "form",
    JSON.stringify([
      { id: "f1", label: "Your Name", type: "text", required: true },
      { id: "f2", label: "Email Address", type: "email", required: true },
      { id: "f3", label: "Primary Platform", type: "select", options: ["Instagram", "TikTok", "YouTube", "X"], required: true },
    ]),
    now
  );

  db.prepare(
    "INSERT INTO form_submissions (id, form_id, payload_json, created_at) VALUES (?, ?, ?, ?)"
  ).run(
    "sub_1",
    "frm_1",
    JSON.stringify({ "Your Name": "Samira Patel", "Email Address": "samira@example.com", "Primary Platform": "Instagram" }),
    now
  );

  db.prepare(
    "INSERT INTO radar_checks (id, workspace_id, target_url, status_code, risk_level, notes, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run("rad_1", ws1, "https://instagram.com/creators", 200, "low", "Clean SSL, zero redirect loops, Instagram-safe.", now);

  const insertInt = db.prepare(
    "INSERT INTO integrations (id, workspace_id, provider, label, endpoint_or_handle, enabled, config_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertInt.run("int_wh", ws1, "webhook", "Click Stream Webhook", "https://hooks.example.com/linkforge", 1, JSON.stringify({ events: ["click", "form_submit"] }), now);
  insertInt.run("int_tg", ws1, "telegram", "Telegram Alerts Bot", "@linkforge_alerts_bot", 1, JSON.stringify({ notifyOnBlocked: true }), now);
  insertInt.run("int_of", ws1, "onlyfans", "OnlyFans Sync", "@creator_of_main", 0, JSON.stringify({ syncMode: "webhook_stub" }), now);
  insertInt.run("int_fv", ws1, "fanvue", "Fanvue Connector", "@creator_fv", 0, JSON.stringify({ syncMode: "webhook_stub" }), now);
  insertInt.run("int_mym", ws1, "mym", "MYM Creator Link", "@creator_mym", 0, JSON.stringify({ syncMode: "webhook_stub" }), now);
}
