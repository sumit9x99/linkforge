"use client";

import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useWorkspace } from "@/components/WorkspaceContext";

type AnalyticsPayload = {
  totalClicks: number;
  cleanClicks: number;
  blockedClicks: number;
  qualityScore: number;
  daily: Array<{ day: string; total: number; blocked: number }>;
  byCountry: Array<{ name: string; count: number }>;
  byOs: Array<{ name: string; count: number }>;
  byReferrer: Array<{ name: string; count: number }>;
  abBreakdown: Array<{ link_title: string; variant_id: string; clicks: number }>;
  recentEvents: Array<{
    id: string;
    link_slug: string;
    country: string;
    os: string;
    device: string;
    referrer: string;
    blocked: number;
    block_reason: string | null;
    created_at: string;
  }>;
};

export default function AnalyticsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    fetch(`/api/analytics?workspaceId=${encodeURIComponent(activeWorkspaceId)}`)
      .then((r) => r.json())
      .then(setData);
  }, [activeWorkspaceId]);

  const maxDay = Math.max(1, ...(data?.daily.map((d) => d.total) || [1]));

  return (
    <AppShell title="Real-Time Analytics">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-[var(--surface)] p-4">
            <div className="text-xs text-[var(--muted)]">Total Clicks</div>
            <div className="tabular-nums mt-1 text-2xl font-semibold">
              {data?.totalClicks ?? "—"}
            </div>
          </div>
          <div className="rounded-xl border bg-[var(--surface)] p-4">
            <div className="text-xs text-[var(--muted)]">Verified Human Clicks</div>
            <div className="tabular-nums mt-1 text-2xl font-semibold text-[var(--success)]">
              {data?.cleanClicks ?? "—"}
            </div>
          </div>
          <div className="rounded-xl border bg-[var(--surface)] p-4">
            <div className="text-xs text-[var(--muted)]">Blocked by MultiShield</div>
            <div className="tabular-nums mt-1 text-2xl font-semibold text-[var(--danger)]">
              {data?.blockedClicks ?? "—"}
            </div>
          </div>
          <div className="rounded-xl border bg-[var(--surface)] p-4">
            <div className="text-xs text-[var(--muted)]">Traffic Quality Score</div>
            <div className="tabular-nums mt-1 text-2xl font-semibold text-[var(--accent)]">
              {data ? `${data.qualityScore}/100` : "—"}
            </div>
          </div>
        </div>

        {/* 14-day bar chart */}
        <div className="rounded-xl border bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">14-Day Click Volume</h2>
            <span className="text-xs text-[var(--muted)]">Blue: clean · Red: blocked</span>
          </div>
          <div className="flex h-44 items-end gap-2">
            {(data?.daily || []).map((d) => {
              const totalH = Math.round((d.total / maxDay) * 100);
              const blockedH = d.total > 0 ? Math.round((d.blocked / d.total) * 100) : 0;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="flex w-full flex-col justify-end overflow-hidden rounded-t bg-[var(--accent)]"
                    style={{ height: `${Math.max(8, totalH)}%` }}
                    title={`${d.day}: ${d.total} total, ${d.blocked} blocked`}
                  >
                    {blockedH > 0 && (
                      <div
                        className="w-full bg-[var(--danger)]"
                        style={{ height: `${blockedH}%` }}
                      />
                    )}
                  </div>
                  <span className="tabular-nums text-[10px] text-[var(--muted)]">
                    {d.day.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdowns */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Top Countries", rows: data?.byCountry || [] },
            { title: "Operating Systems", rows: data?.byOs || [] },
            { title: "Top Referrers", rows: data?.byReferrer || [] },
          ].map((panel) => (
            <div key={panel.title} className="rounded-xl border bg-[var(--surface)] p-4">
              <h3 className="mb-3 text-sm font-semibold">{panel.title}</h3>
              <div className="space-y-2">
                {panel.rows.map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-xs">
                    <span className="truncate text-[var(--ink)]">{r.name}</span>
                    <span className="tabular-nums font-medium text-[var(--muted)]">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* A/B & Recent Events */}
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border bg-[var(--surface)] p-4">
            <h3 className="mb-3 text-sm font-semibold">A/B Split Performance</h3>
            {data?.abBreakdown?.length ? (
              <div className="space-y-2.5">
                {data.abBreakdown.map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium">{row.link_title}</div>
                      <div className="font-mono text-[var(--muted)]">{row.variant_id}</div>
                    </div>
                    <span className="tabular-nums font-semibold">{row.clicks}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">No A/B variant clicks recorded yet.</p>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border bg-[var(--surface)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-[var(--surface-2)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2.5">Slug</th>
                  <th className="px-3 py-2.5">Country</th>
                  <th className="px-3 py-2.5">OS / Device</th>
                  <th className="px-3 py-2.5">Referrer</th>
                  <th className="px-3 py-2.5">Shield</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.recentEvents || []).map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-3 py-2 font-mono text-[var(--accent)]">/{ev.link_slug}</td>
                    <td className="px-3 py-2">{ev.country}</td>
                    <td className="px-3 py-2">
                      {ev.os} · {ev.device}
                    </td>
                    <td className="px-3 py-2 text-[var(--muted)]">{ev.referrer}</td>
                    <td className="px-3 py-2">
                      {ev.blocked ? (
                        <span className="text-[var(--danger)]">{ev.block_reason || "Blocked"}</span>
                      ) : (
                        <span className="text-[var(--success)]">Clean</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

