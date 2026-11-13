"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useWorkspace } from "@/components/WorkspaceContext";

const TOOLS = [
  { id: "shortener", name: "Link Shortener" },
  { id: "qr", name: "QR Code Generator" },
  { id: "utm", name: "UTM Builder" },
  { id: "cleaner", name: "URL Cleaner" },
  { id: "preview", name: "Link Preview Checker" },
  { id: "metadata", name: "Metadata Checker" },
  { id: "favicon", name: "Favicon Generator" },
  { id: "form", name: "Form Maker" },
  { id: "quiz", name: "Quiz Maker" },
  { id: "ig-bio", name: "Instagram Bio Generator" },
  { id: "ig-comment", name: "Instagram Comment Generator" },
  { id: "ig-story", name: "Instagram Story Maker" },
  { id: "bio-scanner", name: "Link-in-Bio Scanner" },
  { id: "analytics-check", name: "Analytics Checker" },
  { id: "pixel", name: "Pixel Helper" },
  { id: "qr-resolve", name: "QR / Short URL Resolver" },
  { id: "sizes", name: "Social Media Image Sizes" },
  { id: "ua", name: "What's My User-Agent" },
  { id: "wa-qr", name: "WhatsApp QR Code" },
] as const;

type ToolId = (typeof TOOLS)[number]["id"];

const IMAGE_SIZES = [
  { platform: "Instagram", format: "Feed Portrait", size: "1080 × 1350", ratio: "4:5" },
  { platform: "Instagram", format: "Stories & Reels", size: "1080 × 1920", ratio: "9:16" },
  { platform: "TikTok", format: "Video / Cover", size: "1080 × 1920", ratio: "9:16" },
  { platform: "YouTube", format: "Thumbnail", size: "1280 × 720", ratio: "16:9" },
  { platform: "X / Twitter", format: "Post Image", size: "1600 × 900", ratio: "16:9" },
  { platform: "LinkedIn", format: "Link Share", size: "1200 × 627", ratio: "1.91:1" },
  { platform: "Threads", format: "Carousel", size: "1080 × 1350", ratio: "4:5" },
];

export default function ToolsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [activeTool, setActiveTool] = useState<ToolId>("shortener");
  const [copied, setCopied] = useState(false);

  // Shared inputs
  const [inputUrl, setInputUrl] = useState("https://example.com/?utm_source=ig&fbclid=12345");
  const [slug, setSlug] = useState("");
  const [shortResult, setShortResult] = useState("");
  const [qrImg, setQrImg] = useState("");

  // UTM
  const [utmSource, setUtmSource] = useState("instagram");
  const [utmMedium, setUtmMedium] = useState("bio");
  const [utmCampaign, setUtmCampaign] = useState("spring_launch");

  // Meta fetch
  const [metaResult, setMetaResult] = useState<Record<string, unknown> | null>(null);
  const [metaError, setMetaError] = useState("");
  const [fetching, setFetching] = useState(false);

  // Favicon
  const [favText, setFavText] = useState("LF");
  const [favBg, setFavBg] = useState("#2563eb");

  // Form / Quiz quick maker
  const [formTitle, setFormTitle] = useState("");
  const [formSaved, setFormSaved] = useState("");

  // IG Bio / Comment / Story
  const [niche, setNiche] = useState("Creator & Filmmaker");
  const [cta, setCta] = useState("Grab free LUTs below");
  const [storyText, setStoryText] = useState("New drop is live");
  const [storyBg, setStoryBg] = useState("#0f172a");

  // WhatsApp
  const [waPhone, setWaPhone] = useState("15551234567");
  const [waMsg, setWaMsg] = useState("Hi! Saw your link.");

  // Pixel
  const [pixelId, setPixelId] = useState("123456789012345");

  // User agent
  const [uaInfo, setUaInfo] = useState({ ua: "", lang: "", screen: "" });

  useEffect(() => {
    setUaInfo({
      ua: navigator.userAgent,
      lang: navigator.language,
      screen: `${window.innerWidth} × ${window.innerHeight}`,
    });
  }, []);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function createShortLink() {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: activeWorkspaceId,
        title: `Tool Link (${slug || "auto"})`,
        slug,
        destinationUrl: inputUrl,
      }),
    });
    const data = await res.json();
    if (res.ok) setShortResult(`${window.location.origin}/${data.slug}`);
    else setShortResult(data.error || "Error");
  }

  async function generateQr(text: string) {
    const url = await QRCode.toDataURL(text, { width: 256, margin: 2 });
    setQrImg(url);
  }

  async function inspectMeta() {
    setFetching(true);
    setMetaError("");
    setMetaResult(null);
    const res = await fetch("/api/tools/fetch-meta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: inputUrl }),
    });
    const data = await res.json();
    if (res.ok) setMetaResult(data);
    else setMetaError(data.error || "Failed to inspect URL");
    setFetching(false);
  }

  function cleanUrl(raw: string): string {
    try {
      const u = new URL(raw);
      const strip = ["fbclid", "gclid", "igshid", "mc_cid", "mc_eid", "ref"];
      Array.from(u.searchParams.keys()).forEach((k) => {
        if (k.startsWith("utm_") || strip.includes(k)) u.searchParams.delete(k);
      });
      return u.toString();
    } catch {
      return "Enter a valid URL starting with https://";
    }
  }

  function buildUtmUrl(): string {
    try {
      const u = new URL(inputUrl.split("?")[0]);
      if (utmSource) u.searchParams.set("utm_source", utmSource);
      if (utmMedium) u.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) u.searchParams.set("utm_campaign", utmCampaign);
      return u.toString();
    } catch {
      return "Enter a valid base URL";
    }
  }

  async function createQuickForm(kind: "form" | "quiz") {
    if (!formTitle.trim()) return;
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: activeWorkspaceId,
        title: formTitle.trim(),
        kind,
        fields:
          kind === "quiz"
            ? [{ id: "q1", label: "What is your main goal?", type: "text", required: true }]
            : [
                { id: "f1", label: "Name", type: "text", required: true },
                { id: "f2", label: "Email", type: "email", required: true },
              ],
      }),
    });
    if (res.ok) {
      setFormSaved(`Created ${kind} "${formTitle.trim()}" — view in Forms & Quizzes.`);
      setFormTitle("");
    }
  }

  const waUrl = `https://wa.me/${waPhone.replace(/\D/g, "")}?text=${encodeURIComponent(waMsg)}`;
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="${favBg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-family="system-ui" font-weight="700" font-size="28">${favText.slice(0, 2)}</text></svg>`;

  return (
    <AppShell title="Utilities & Creator Tools (19)">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-1 rounded-xl border bg-[var(--surface)] p-2">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTool(t.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                activeTool === t.id
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="rounded-xl border bg-[var(--surface)] p-6 space-y-4">
          <h2 className="text-base font-semibold">
            {TOOLS.find((t) => t.id === activeTool)?.name}
          </h2>

          {activeTool === "shortener" && (
            <div className="space-y-3">
              <input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Optional custom slug"
                  className="flex-1 rounded-lg border bg-[var(--bg)] px-3 py-2 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={createShortLink}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                >
                  Shorten
                </button>
              </div>
              {shortResult && (
                <div className="flex items-center justify-between rounded-lg border bg-[var(--bg)] p-3 font-mono text-xs">
                  <span>{shortResult}</span>
                  <button type="button" onClick={() => copy(shortResult)}>
                    {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTool === "qr" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="flex-1 rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => generateQr(inputUrl)}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                >
                  Generate QR
                </button>
              </div>
              {qrImg && (
                <div className="flex items-center gap-4">
                  <img src={qrImg} alt="QR preview" className="h-36 w-36 rounded-lg border bg-white p-2" />
                  <a href={qrImg} download="linkforge-qr.png" className="text-xs font-medium text-[var(--accent)] hover:underline">
                    Download PNG
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTool === "utm" && (
            <div className="space-y-3">
              <input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="utm_source" className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-xs" />
                <input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="utm_medium" className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-xs" />
                <input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="utm_campaign" className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-xs" />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-[var(--bg)] p-3 font-mono text-xs">
                <span className="truncate">{buildUtmUrl()}</span>
                <button type="button" onClick={() => copy(buildUtmUrl())}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {activeTool === "cleaner" && (
            <div className="space-y-3">
              <input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
              />
              <div className="flex items-center justify-between rounded-lg border bg-[var(--bg)] p-3 font-mono text-xs">
                <span className="truncate">{cleanUrl(inputUrl)}</span>
                <button type="button" onClick={() => copy(cleanUrl(inputUrl))}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {(activeTool === "preview" ||
            activeTool === "metadata" ||
            activeTool === "bio-scanner" ||
            activeTool === "analytics-check" ||
            activeTool === "qr-resolve") && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={inspectMeta}
                  disabled={fetching}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                >
                  {fetching ? "Inspecting…" : "Inspect"}
                </button>
              </div>
              {metaError && <p className="text-xs text-[var(--danger)]">{metaError}</p>}
              {metaResult && (
                <pre className="max-h-72 overflow-auto rounded-lg border bg-[var(--bg)] p-3 font-mono text-xs">
                  {JSON.stringify(metaResult, null, 2)}
                </pre>
              )}
            </div>
          )}

          {activeTool === "favicon" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input value={favText} maxLength={2} onChange={(e) => setFavText(e.target.value)} className="w-24 rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm" />
                <input type="color" value={favBg} onChange={(e) => setFavBg(e.target.value)} className="h-10 w-16 rounded border bg-[var(--bg)] p-1" />
              </div>
              <div className="flex items-center gap-4">
                <div dangerouslySetInnerHTML={{ __html: faviconSvg }} />
                <a
                  href={`data:image/svg+xml;utf8,${encodeURIComponent(faviconSvg)}`}
                  download="favicon.svg"
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Download favicon.svg
                </a>
              </div>
            </div>
          )}

          {(activeTool === "form" || activeTool === "quiz") && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={activeTool === "quiz" ? "Quiz title…" : "Lead form title…"}
                  className="flex-1 rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => createQuickForm(activeTool === "quiz" ? "quiz" : "form")}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                >
                  Save {activeTool === "quiz" ? "Quiz" : "Form"}
                </button>
              </div>
              {formSaved && <p className="text-xs text-[var(--success)]">{formSaved}</p>}
            </div>
          )}

          {activeTool === "ig-bio" && (
            <div className="space-y-3">
              <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Role / Niche" className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm" />
              <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Call to action" className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm" />
              <textarea
                readOnly
                rows={4}
                value={`${niche}\nSharing daily breakdowns & templates\n${cta} ↓`}
                className="w-full rounded-lg border bg-[var(--bg)] p-3 text-sm"
              />
            </div>
          )}

          {activeTool === "ig-comment" && (
            <div className="space-y-2 text-xs">
              <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Post topic" className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm" />
              {[
                `Clean execution on ${niche} — saving this for our next shoot.`,
                `That pacing on ${niche} hits right. Which setup did you run?`,
                `Appreciate the breakdown on ${niche}, straight to the point.`,
              ].map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-[var(--bg)] p-3">
                  <span>{c}</span>
                  <button type="button" onClick={() => copy(c)}><Copy className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {activeTool === "ig-story" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={storyText} onChange={(e) => setStoryText(e.target.value)} className="flex-1 rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm" />
                <input type="color" value={storyBg} onChange={(e) => setStoryBg(e.target.value)} className="h-10 w-16 rounded border bg-[var(--bg)] p-1" />
              </div>
              <div
                className="flex h-64 w-36 items-center justify-center rounded-xl p-4 text-center text-sm font-semibold text-white"
                style={{ background: storyBg }}
              >
                {storyText}
              </div>
            </div>
          )}

          {activeTool === "pixel" && (
            <div className="space-y-3">
              <input value={pixelId} onChange={(e) => setPixelId(e.target.value)} className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 font-mono text-sm" />
              <pre className="overflow-auto rounded-lg border bg-[var(--bg)] p-3 font-mono text-xs">
                {`<!-- LinkForge Retargeting Pixel -->\n<script>window.lfPixelId="${pixelId}";</script>`}
              </pre>
            </div>
          )}

          {activeTool === "sizes" && (
            <table className="w-full text-left text-xs">
              <thead className="border-b text-[var(--muted)]">
                <tr>
                  <th className="py-2">Platform</th>
                  <th className="py-2">Format</th>
                  <th className="py-2">Dimensions</th>
                  <th className="py-2">Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {IMAGE_SIZES.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium">{s.platform}</td>
                    <td className="py-2">{s.format}</td>
                    <td className="tabular-nums py-2 font-mono">{s.size}</td>
                    <td className="tabular-nums py-2 text-[var(--muted)]">{s.ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTool === "ua" && (
            <div className="space-y-2 rounded-lg border bg-[var(--bg)] p-4 font-mono text-xs">
              <div><span className="text-[var(--muted)]">User-Agent:</span> {uaInfo.ua}</div>
              <div><span className="text-[var(--muted)]">Language:</span> {uaInfo.lang}</div>
              <div><span className="text-[var(--muted)]">Viewport:</span> {uaInfo.screen}</div>
            </div>
          )}

          {activeTool === "wa-qr" && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="Phone with country code" className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm" />
                <input value={waMsg} onChange={(e) => setWaMsg(e.target.value)} placeholder="Prefilled message" className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm" />
              </div>
              <button
                type="button"
                onClick={() => generateQr(waUrl)}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
              >
                Generate WhatsApp QR
              </button>
              {qrImg && (
                <img src={qrImg} alt="WhatsApp QR" className="h-36 w-36 rounded-lg border bg-white p-2" />
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

