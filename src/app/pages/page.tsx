"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useWorkspace } from "@/components/WorkspaceContext";

type BioBlock = {
  id: string;
  type: "link" | "form";
  label: string;
  url?: string;
  badge?: string;
  formId?: string;
};

type BioPage = {
  id: string;
  slug: string;
  title: string;
  bio: string;
  avatarText: string;
  theme: { bg: string; accent: string };
  blocks: BioBlock[];
  views: number;
};

export default function BioPagesBuilder() {
  const { activeWorkspaceId } = useWorkspace();
  const [pages, setPages] = useState<BioPage[]>([]);
  const [selected, setSelected] = useState<BioPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const loadPages = useCallback(async () => {
    const res = await fetch(`/api/pages?workspaceId=${encodeURIComponent(activeWorkspaceId)}`);
    if (!res.ok) return;
    const data = await res.json();
    const list: BioPage[] = data.pages || [];
    setPages(list);
    if (list.length > 0) {
      setSelected((prev) => list.find((p) => p.id === prev?.id) || list[0]);
    } else {
      setSelected(null);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  async function createPage() {
    const slug = `bio-${Math.random().toString(36).slice(2, 6)}`;
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: activeWorkspaceId,
        title: "New Bio Page",
        slug,
        bio: "Links, offers, and updates in one fast page.",
        avatarText: "LF",
        theme: { bg: "#09090b", accent: "#2563eb" },
        blocks: [{ id: "b1", type: "link", label: "Primary Link", url: "https://example.com", badge: "" }],
      }),
    });
    if (res.ok) await loadPages();
  }

  async function saveSelected() {
    if (!selected) return;
    setSaving(true);
    await fetch("/api/pages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(selected),
    });
    setSaving(false);
    setSavedMsg("Saved");
    setTimeout(() => setSavedMsg(""), 1500);
    await loadPages();
  }

  async function deletePage(id: string) {
    await fetch(`/api/pages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadPages();
  }

  function addLinkBlock() {
    if (!selected) return;
    setSelected({
      ...selected,
      blocks: [
        ...selected.blocks,
        { id: `b_${Date.now()}`, type: "link", label: "New Button", url: "https://example.com", badge: "" },
      ],
    });
  }

  return (
    <AppShell
      title="Bio & Landing Pages"
      actions={
        <button
          type="button"
          onClick={createPage}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          <Plus className="h-4 w-4" />
          <span>New Bio Page</span>
        </button>
      }
    >
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[260px_1fr_340px]">
        {/* Page list */}
        <div className="space-y-2">
          {pages.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                selected?.id === p.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "bg-[var(--surface)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{p.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePage(p.id);
                  }}
                  className="text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-xs text-[var(--muted)]">
                <span>/p/{p.slug}</span>
                <span className="tabular-nums">{p.views} views</span>
              </div>
            </div>
          ))}
        </div>

        {/* Editor */}
        {selected ? (
          <div className="space-y-4 rounded-xl border bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Page Editor</h2>
                <a
                  href={`/p/${selected.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-[var(--accent)] hover:underline"
                >
                  <span>/p/{selected.slug}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <button
                type="button"
                onClick={saveSelected}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savedMsg || (saving ? "Saving…" : "Save Changes")}</span>
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Custom Slug (/p/…)</label>
                <div className="flex items-center rounded-lg border bg-[var(--bg)] px-2.5 py-2 font-mono text-xs">
                  <span className="text-[var(--muted)]">/p/</span>
                  <input
                    value={selected.slug}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                    placeholder="vip"
                    className="w-full bg-transparent font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Display Title</label>
                <input
                  value={selected.title}
                  onChange={(e) => setSelected({ ...selected, title: e.target.value })}
                  className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Avatar Initials</label>
                <input
                  value={selected.avatarText}
                  maxLength={2}
                  onChange={(e) => setSelected({ ...selected, avatarText: e.target.value })}
                  className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Bio</label>
              <textarea
                rows={2}
                value={selected.bio}
                onChange={(e) => setSelected({ ...selected, bio: e.target.value })}
                className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Background Color</label>
                <input
                  type="color"
                  value={selected.theme.bg || "#09090b"}
                  onChange={(e) =>
                    setSelected({ ...selected, theme: { ...selected.theme, bg: e.target.value } })
                  }
                  className="h-9 w-full cursor-pointer rounded-lg border bg-[var(--bg)] p-1"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--muted)]">Accent Color</label>
                <input
                  type="color"
                  value={selected.theme.accent || "#2563eb"}
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      theme: { ...selected.theme, accent: e.target.value },
                    })
                  }
                  className="h-9 w-full cursor-pointer rounded-lg border bg-[var(--bg)] p-1"
                />
              </div>
            </div>

            <div className="space-y-2.5 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Blocks ({selected.blocks.length})</span>
                <button
                  type="button"
                  onClick={addLinkBlock}
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-[var(--surface-2)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Link Block</span>
                </button>
              </div>

              {selected.blocks.map((block, idx) => (
                <div key={block.id} className="space-y-2 rounded-lg border bg-[var(--bg)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={block.label}
                      onChange={(e) => {
                        const next = [...selected.blocks];
                        next[idx] = { ...block, label: e.target.value };
                        setSelected({ ...selected, blocks: next });
                      }}
                      placeholder="Button label"
                      className="flex-1 rounded border bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSelected({
                          ...selected,
                          blocks: selected.blocks.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {block.type === "link" && (
                    <div className="flex gap-2">
                      <input
                        value={block.url || ""}
                        onChange={(e) => {
                          const next = [...selected.blocks];
                          next[idx] = { ...block, url: e.target.value };
                          setSelected({ ...selected, blocks: next });
                        }}
                        placeholder="https://..."
                        className="flex-1 rounded border bg-[var(--surface)] px-2.5 py-1.5 font-mono text-xs"
                      />
                      <input
                        value={block.badge || ""}
                        onChange={(e) => {
                          const next = [...selected.blocks];
                          next[idx] = { ...block, badge: e.target.value };
                          setSelected({ ...selected, blocks: next });
                        }}
                        placeholder="Badge"
                        className="w-20 rounded border bg-[var(--surface)] px-2 py-1.5 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
            Create a Bio Page to start editing.
          </div>
        )}

        {/* Live phone preview */}
        {selected && (
          <div className="rounded-2xl border p-3 bg-[var(--surface)]">
            <div
              className="min-h-[520px] rounded-xl p-5 text-white"
              style={{ background: selected.theme.bg || "#09090b" }}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: selected.theme.accent || "#2563eb" }}
                >
                  {selected.avatarText}
                </div>
                <div className="text-base font-semibold">{selected.title}</div>
                <p className="mt-1 text-xs text-zinc-300">{selected.bio}</p>
              </div>
              <div className="mt-5 space-y-2.5">
                {selected.blocks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <span>{b.label}</span>
                      {b.badge && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px]"
                          style={{ background: selected.theme.accent || "#2563eb" }}
                        >
                          {b.badge}
                        </span>
                      )}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

