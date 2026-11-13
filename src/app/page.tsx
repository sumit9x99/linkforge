"use client";

import React, { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  ExternalLink,
  Plus,
  QrCode,
  Search,
  Shield,
  Split,
  Trash2,
  Zap,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { useWorkspace } from "@/components/WorkspaceContext";
import type { AbVariant, SmartRule } from "@/lib/routing-engine";

type LinkRow = {
  id: string;
  slug: string;
  title: string;
  destinationUrl: string;
  domain: string;
  smartRules: SmartRule[];
  abEnabled: boolean;
  abVariants: AbVariant[];
  multiShield: {
    enabled: boolean;
    blockBots: boolean;
    blockVpns: boolean;
    safeInterstitial: boolean;
    blockedCountries: string[];
  };
  deepLink: { enabled: boolean; platform: string };
  utm: Record<string, string>;
  pixelId: string;
  active: boolean;
  totalClicks: number;
  blockedClicks: number;
};

export default function LinksPage() {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{ slug: string; url: string } | null>(null);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [deepLinkEnabled, setDeepLinkEnabled] = useState(false);
  const [deepLinkPlatform, setDeepLinkPlatform] = useState("auto");
  const [abEnabled, setAbEnabled] = useState(false);
  const [variantBUrl, setVariantBUrl] = useState("");
  const [blockBots, setBlockBots] = useState(true);
  const [blockVpns, setBlockVpns] = useState(false);
  const [safeInterstitial, setSafeInterstitial] = useState(false);
  const [smartField, setSmartField] = useState<"country" | "os" | "device">("os");
  const [smartValue, setSmartValue] = useState("");
  const [smartTarget, setSmartTarget] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [pixelId, setPixelId] = useState("");

  const loadLinks = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/links?workspaceId=${encodeURIComponent(activeWorkspaceId)}`);
    if (res.ok) {
      const data = await res.json();
      setLinks(data.links || []);
    }
    setLoading(false);
  }, [activeWorkspaceId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const smartRules =
      smartValue.trim() && smartTarget.trim()
        ? [
            {
              id: `r_${Date.now()}`,
              field: smartField,
              operator: "equals",
              value: smartValue.trim(),
              targetUrl: smartTarget.trim(),
            },
          ]
        : [];
    const abVariants =
      abEnabled && variantBUrl.trim()
        ? [
            { id: "var_a", label: "Variant A", url: destinationUrl.trim(), weight: 50 },
            { id: "var_b", label: "Variant B", url: variantBUrl.trim(), weight: 50 },
          ]
        : [];

    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: activeWorkspaceId,
        title: title.trim() || slug.trim() || "Untitled Link",
        slug: slug.trim(),
        destinationUrl: destinationUrl.trim(),
        domain: activeWorkspace?.custom_domain || "go.linkforge.local",
        smartRules,
        abEnabled,
        abVariants,
        multiShield: {
          enabled: blockBots || blockVpns || safeInterstitial,
          blockBots,
          blockVpns,
          safeInterstitial,
          blockedCountries: [],
        },
        deepLink: { enabled: deepLinkEnabled, platform: deepLinkPlatform },
        utm: { source: utmSource.trim(), campaign: utmCampaign.trim() },
        pixelId: pixelId.trim(),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create link");
      return;
    }

    setTitle("");
    setSlug("");
    setDestinationUrl("");
    setVariantBUrl("");
    setSmartValue("");
    setSmartTarget("");
    setUtmSource("");
    setUtmCampaign("");
    setPixelId("");
    setShowCreate(false);
    await loadLinks();
  }

  async function toggleActive(link: LinkRow) {
    await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !link.active }),
    });
    await loadLinks();
  }

  async function deleteLink(id: string) {
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    await loadLinks();
  }

  function copyShortUrl(link: LinkRow) {
    const url = `${window.location.origin}/${link.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function openQr(link: LinkRow) {
    const fullUrl = `${window.location.origin}/${link.slug}`;
    const dataUrl = await QRCode.toDataURL(fullUrl, { width: 240, margin: 2 });
    setQrData({ slug: link.slug, url: dataUrl });
  }

  const filtered = links.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.slug.toLowerCase().includes(search.toLowerCase()) ||
      l.destinationUrl.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell
      title="Links"
      actions={
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          <Plus className="h-4 w-4" />
          <span>{showCreate ? "Close Editor" : "New Link"}</span>
        </button>
      }
    >
      <div className="mx-auto max-w-6xl space-y-5">
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="space-y-4 rounded-xl border bg-[var(--surface)] p-5"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-sm font-semibold">Create Smart Link</h2>
              {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summer Launch"
                  className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  Custom Slug (optional)
                </label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="summer-launch"
                  className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  Destination URL *
                </label>
                <input
                  type="url"
                  required
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://instagram.com/yourhandle"
                  className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={deepLinkEnabled}
                    onChange={(e) => setDeepLinkEnabled(e.target.checked)}
                  />
                  <span>Native DeepLink</span>
                </label>
                {deepLinkEnabled && (
                  <select
                    value={deepLinkPlatform}
                    onChange={(e) => setDeepLinkPlatform(e.target.value)}
                    className="w-full rounded-lg border bg-[var(--bg)] px-2.5 py-1.5 text-xs"
                  >
                    <option value="auto">Auto-detect app</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="x">X / Twitter</option>
                    <option value="telegram">Telegram</option>
                    <option value="snapchat">Snapchat</option>
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={abEnabled}
                    onChange={(e) => setAbEnabled(e.target.checked)}
                  />
                  <span>50/50 A/B Split Test</span>
                </label>
                {abEnabled && (
                  <input
                    type="url"
                    value={variantBUrl}
                    onChange={(e) => setVariantBUrl(e.target.value)}
                    placeholder="Variant B URL (https://...)"
                    className="w-full rounded-lg border bg-[var(--bg)] px-2.5 py-1.5 text-xs"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold">MultiShield Protection</span>
                <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={blockBots}
                      onChange={(e) => setBlockBots(e.target.checked)}
                    />
                    <span>Bots</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={blockVpns}
                      onChange={(e) => setBlockVpns(e.target.checked)}
                    />
                    <span>VPNs</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={safeInterstitial}
                      onChange={(e) => setSafeInterstitial(e.target.checked)}
                    />
                    <span>Safe Interstitial</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t pt-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  Smart Route Rule (optional)
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={smartField}
                    onChange={(e) =>
                      setSmartField(e.target.value as "country" | "os" | "device")
                    }
                    className="rounded-lg border bg-[var(--bg)] px-2 py-1.5 text-xs"
                  >
                    <option value="os">OS</option>
                    <option value="country">Country</option>
                    <option value="device">Device</option>
                  </select>
                  <input
                    value={smartValue}
                    onChange={(e) => setSmartValue(e.target.value)}
                    placeholder="iOS / FR"
                    className="w-24 rounded-lg border bg-[var(--bg)] px-2 py-1.5 text-xs"
                  />
                  <input
                    value={smartTarget}
                    onChange={(e) => setSmartTarget(e.target.value)}
                    placeholder="Override URL"
                    className="min-w-0 flex-1 rounded-lg border bg-[var(--bg)] px-2 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    UTM Source
                  </label>
                  <input
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                    placeholder="instagram"
                    className="w-full rounded-lg border bg-[var(--bg)] px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    UTM Campaign
                  </label>
                  <input
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="launch"
                    className="w-full rounded-lg border bg-[var(--bg)] px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  Retargeting Pixel ID
                </label>
                <input
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="px_meta_1234"
                  className="w-full rounded-lg border bg-[var(--bg)] px-2.5 py-1.5 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border px-3.5 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Create Link
              </button>
            </div>
          </form>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter links by title, slug, or destination…"
              className="w-full rounded-lg border bg-[var(--surface)] py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <span className="tabular-nums text-xs text-[var(--muted)]">
            {filtered.length} link{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {qrData && (
          <div className="flex items-center justify-between rounded-xl border bg-[var(--surface)] p-4">
            <div className="flex items-center gap-4">
              <img
                src={qrData.url}
                alt={`QR code for ${qrData.slug}`}
                className="h-24 w-24 rounded-lg border bg-white p-1"
              />
              <div>
                <p className="text-sm font-semibold">QR Code for /{qrData.slug}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Ready for print, packaging, or Instagram stories.
                </p>
                <a
                  href={qrData.url}
                  download={`qr-${qrData.slug}.png`}
                  className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Download PNG
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQrData(null)}
              className="rounded-lg border px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Close
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border bg-[var(--surface)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-[var(--surface-2)] text-xs font-medium text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3">Capabilities</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Blocked</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-[var(--muted)]">
                    Loading links…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                    No links match your filter. Create a new link above to start routing traffic.
                  </td>
                </tr>
              ) : (
                filtered.map((link) => (
                  <tr key={link.id} className="hover:bg-[var(--surface-2)]/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{link.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-[var(--accent)]">
                        <span>/{link.slug}</span>
                        <span className="text-[var(--muted)]">→</span>
                        <span className="max-w-xs truncate text-[var(--muted)]">
                          {link.destinationUrl}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {link.deepLink?.enabled && (
                          <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[var(--ink)]">
                            <Zap className="h-3 w-3 text-[var(--accent)]" />
                            DeepLink
                          </span>
                        )}
                        {link.abEnabled && (
                          <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[var(--ink)]">
                            <Split className="h-3 w-3 text-[var(--warning)]" />
                            A/B
                          </span>
                        )}
                        {link.smartRules?.length > 0 && (
                          <span className="rounded border px-1.5 py-0.5 text-[var(--ink)]">
                            {link.smartRules.length} Route
                          </span>
                        )}
                        {link.multiShield?.enabled && (
                          <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[var(--success)]">
                            <Shield className="h-3 w-3" />
                            Shield
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right font-medium">
                      {link.totalClicks}
                    </td>
                    <td className="tabular-nums px-4 py-3 text-right text-[var(--muted)]">
                      {link.blockedClicks}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(link)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          link.active
                            ? "bg-emerald-500/15 text-[var(--success)]"
                            : "bg-zinc-500/15 text-[var(--muted)]"
                        }`}
                      >
                        {link.active ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => copyShortUrl(link)}
                          title="Copy short URL"
                          className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-4 w-4 text-[var(--success)]" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openQr(link)}
                          title="Generate QR Code"
                          className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <a
                          href={`/${link.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Test redirect"
                          className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => deleteLink(link.id)}
                          title="Delete link"
                          className="rounded p-1.5 text-[var(--muted)] hover:bg-red-500/10 hover:text-[var(--danger)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
