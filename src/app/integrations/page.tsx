"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useWorkspace } from "@/components/WorkspaceContext";

type IntegrationRow = {
  id: string;
  provider: string;
  label: string;
  endpointOrHandle: string;
  enabled: boolean;
};

export default function IntegrationsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [items, setItems] = useState<IntegrationRow[]>([]);
  const [provider, setProvider] = useState("webhook");
  const [label, setLabel] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [mcpTestResult, setMcpTestResult] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/integrations?workspaceId=${encodeURIComponent(activeWorkspaceId)}`
    );
    if (res.ok) {
      const data = await res.json();
      setItems(data.integrations || []);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addIntegration(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !endpoint.trim()) return;
    await fetch("/api/integrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: activeWorkspaceId,
        provider,
        label: label.trim(),
        endpointOrHandle: endpoint.trim(),
      }),
    });
    setLabel("");
    setEndpoint("");
    await load();
  }

  async function toggle(item: IntegrationRow) {
    await fetch("/api/integrations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, enabled: !item.enabled }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/integrations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  async function pingMcp() {
    const res = await fetch("/api/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    const data = await res.json();
    setMcpTestResult(JSON.stringify(data, null, 2));
  }

  return (
    <AppShell title="API, Webhooks, MCP & Creator Integrations">
      <div className="mx-auto max-w-6xl space-y-6">
        <form
          onSubmit={addIntegration}
          className="grid gap-3 rounded-xl border bg-[var(--surface)] p-4 md:grid-cols-[160px_1fr_1.4fr_auto]"
        >
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="webhook">Webhook</option>
            <option value="telegram">Telegram Bot</option>
            <option value="onlyfans">OnlyFans</option>
            <option value="fanvue">Fanvue</option>
            <option value="mym">MYM</option>
          </select>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Integration label"
            required
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
          />
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="Webhook URL or @handle"
            required
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 font-mono text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            <span>Connect</span>
          </button>
        </form>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border bg-[var(--surface)] p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.label}</span>
                  <span className="rounded border px-1.5 py-0.5 text-[10px] uppercase text-[var(--muted)]">
                    {item.provider}
                  </span>
                </div>
                <div className="mt-1 truncate font-mono text-xs text-[var(--muted)]">
                  {item.endpointOrHandle}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.enabled
                      ? "bg-emerald-500/15 text-[var(--success)]"
                      : "bg-zinc-500/15 text-[var(--muted)]"
                  }`}
                >
                  {item.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="p-1 text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-[var(--surface)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">AI Control (MCP Endpoint)</h2>
              <button
                type="button"
                onClick={pingMcp}
                className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-[var(--surface-2)]"
              >
                Test tools/list
              </button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Connect Claude, ChatGPT, or Gemini to <code className="font-mono">/api/mcp</code> via
              JSON-RPC 2.0 (<code className="font-mono">list_links</code>,{" "}
              <code className="font-mono">create_link</code>,{" "}
              <code className="font-mono">get_analytics</code>).
            </p>
            {mcpTestResult && (
              <pre className="max-h-48 overflow-auto rounded-lg border bg-[var(--bg)] p-3 font-mono text-[11px]">
                {mcpTestResult}
              </pre>
            )}
          </div>

          <div className="rounded-xl border bg-[var(--surface)] p-4 space-y-2">
            <h2 className="text-sm font-semibold">REST API</h2>
            <pre className="overflow-auto rounded-lg border bg-[var(--bg)] p-3 font-mono text-[11px] text-[var(--muted)]">
{`GET  /api/links?workspaceId=${activeWorkspaceId}
POST /api/links { destinationUrl, slug, deepLink, abEnabled }
GET  /api/analytics?workspaceId=${activeWorkspaceId}
POST /api/radar { targetUrl }`}
            </pre>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

