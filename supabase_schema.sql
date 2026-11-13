CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  custom_domain TEXT NOT NULL DEFAULT 'go.linkforge.local',
  white_label INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clicks (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  variant_id TEXT,
  country TEXT NOT NULL,
  os TEXT NOT NULL,
  device TEXT NOT NULL,
  browser TEXT NOT NULL,
  referrer TEXT NOT NULL,
  blocked INTEGER NOT NULL DEFAULT 0,
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bio_pages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  bio TEXT NOT NULL,
  avatar_text TEXT NOT NULL DEFAULT 'LF',
  theme_json TEXT NOT NULL DEFAULT '{"bg":"#0f172a","accent":"#2563eb","style":"clean"}',
  blocks_json TEXT NOT NULL DEFAULT '[]',
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forms (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'form',
  fields_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radar_checks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  notes TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  endpoint_or_handle TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial workspace if empty
INSERT INTO workspaces (id, name, slug, custom_domain, white_label, created_at)
VALUES ('ws_main', 'Creator Studio', 'creator-studio', 'go.creatorstudio.to', 1, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO team_members (id, workspace_id, name, email, role, created_at)
VALUES ('tm_1', 'ws_main', 'Alex Rivera', 'alex@creatorstudio.to', 'Owner', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO bio_pages (id, workspace_id, slug, title, bio, avatar_text, theme_json, blocks_json, views, created_at)
VALUES (
  'bio_1', 'ws_main', 'alex-studio', 'Alex Rivera',
  'Creator, filmmaker & digital tools. New preset pack and weekly dispatch below.',
  'AR',
  '{"bg":"#0f172a","accent":"#3b82f6","style":"clean"}',
  '[{"id":"b1","type":"link","label":"Watch New Breakdown (YouTube)","url":"https://youtube.com/@linkforge","badge":"New"},{"id":"b2","type":"link","label":"Download LUTs & Presets","url":"/ig-drop","badge":"Free"},{"id":"b3","type":"link","label":"Book 1:1 Creative Review","url":"/offer-split","badge":""}]',
  1428, NOW()
)
ON CONFLICT (id) DO NOTHING;

