"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Radar, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useWorkspace } from "@/components/WorkspaceContext";

type RadarCheck = {
  id: string;
  target_url: string;
  status_code: number;
  risk_level: string;
  notes: string;
  checked_at: string;
};

export default function ShieldAndRadarPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [checks, setChecks] = useState<RadarCheck[]>([]);
  const [targetUrl, setTargetUrl] = useState("");
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/radar?workspaceId=${encodeURIComponent(activeWorkspaceId)}`);
    if (res.ok) {
      const data = await res.json();
      setChecks(data.checks || []);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    setScanning(true);
    await fetch("/api/radar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: activeWorkspaceId, targetUrl: targetUrl.trim() }),
    });
    setTargetUrl("");
    setScanning(false);
    await load();
  }

  return (
    <AppShell title="MultiShield & Radar">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
              <span>Bot & Crawler Filtering</span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Blocks headless browsers, scrapers, and automated link-preview bots on protected slugs.
            </p>
          </div>
          <div className="rounded-xl border bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <span>VPN & Proxy Inspection</span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Flags Tor/VPN/proxy forwarding headers and routes clean human traffic to your destination.
            </p>
          </div>
          <div className="rounded-xl border bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Radar className="h-4 w-4 text-[var(--warning)]" />
              <span>Radar Ban-Risk Monitor</span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Verifies HTTPS, HTTP status codes, and redirect targets before social campaigns go live.
            </p>
          </div>
        </div>

        <form
          onSubmit={runScan}
          className="flex gap-3 rounded-xl border bg-[var(--surface)] p-4"
        >
          <input
            type="url"
            required
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com/landing — run live Radar health & safety scan"
            className="flex-1 rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={scanning}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            {scanning ? "Scanning…" : "Run Radar Scan"}
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border bg-[var(--surface)]">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-[var(--surface-2)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Target URL</th>
                <th className="px-4 py-3">HTTP</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Findings</th>
                <th className="px-4 py-3">Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {checks.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono">{c.target_url}</td>
                  <td className="tabular-nums px-4 py-3">{c.status_code || "ERR"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium uppercase ${
                        c.risk_level === "low"
                          ? "bg-emerald-500/15 text-[var(--success)]"
                          : c.risk_level === "medium"
                            ? "bg-amber-500/15 text-[var(--warning)]"
                            : "bg-red-500/15 text-[var(--danger)]"
                      }`}
                    >
                      {c.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{c.notes}</td>
                  <td className="tabular-nums px-4 py-3 text-[var(--muted)]">
                    {c.checked_at.slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

