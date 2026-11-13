"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useWorkspace } from "@/components/WorkspaceContext";

export default function TeamAndWorkspacesPage() {
  const {
    workspaces,
    members,
    activeWorkspaceId,
    activeWorkspace,
    setActiveWorkspaceId,
    refreshWorkspaces,
  } = useWorkspace();

  const [wsName, setWsName] = useState("");
  const [wsDomain, setWsDomain] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Editor");
  const [domainEdit, setDomainEdit] = useState("");

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!wsName.trim()) return;
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: wsName.trim(),
        customDomain: wsDomain.trim() || undefined,
        whiteLabel: true,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setWsName("");
      setWsDomain("");
      await refreshWorkspaces();
      setActiveWorkspaceId(created.id);
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!memberName.trim() || !memberEmail.trim()) return;
    await fetch("/api/workspaces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "member",
        workspaceId: activeWorkspaceId,
        name: memberName.trim(),
        email: memberEmail.trim(),
        role: memberRole,
      }),
    });
    setMemberName("");
    setMemberEmail("");
    await refreshWorkspaces();
  }

  async function saveDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace || !domainEdit.trim()) return;
    await fetch("/api/workspaces", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: activeWorkspace.id, customDomain: domainEdit.trim() }),
    });
    setDomainEdit("");
    await refreshWorkspaces();
  }

  const wsMembers = members.filter((m) => m.workspace_id === activeWorkspaceId);

  return (
    <AppShell title="Team, Workspaces & Custom Domains">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold">Create Workspace (Unlimited)</h2>
            <form onSubmit={createWorkspace} className="space-y-3">
              <input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="Workspace name (e.g. Client Brand)"
                required
                className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
              />
              <input
                value={wsDomain}
                onChange={(e) => setWsDomain(e.target.value)}
                placeholder="Custom domain (e.g. go.brand.com)"
                className="w-full rounded-lg border bg-[var(--bg)] px-3 py-2 font-mono text-sm"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Workspace</span>
              </button>
            </form>

            <div className="border-t pt-4">
              <div className="mb-2 text-xs font-semibold text-[var(--muted)]">
                Active Domain & White Label
              </div>
              <form onSubmit={saveDomain} className="flex gap-2">
                <input
                  value={domainEdit}
                  onChange={(e) => setDomainEdit(e.target.value)}
                  placeholder={activeWorkspace?.custom_domain || "go.linkforge.local"}
                  className="flex-1 rounded-lg border bg-[var(--bg)] px-3 py-1.5 font-mono text-xs"
                />
                <button
                  type="submit"
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-2)]"
                >
                  Update Domain
                </button>
              </form>
              <div className="mt-2 text-xs text-[var(--muted)]">
                All {workspaces.length} workspaces include unlimited links, custom domains, and
                white-label bio pages.
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold">
              Team Members ({wsMembers.length})
            </h2>
            <form onSubmit={addMember} className="grid gap-2 sm:grid-cols-[1fr_1fr_110px_auto]">
              <input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Name"
                required
                className="rounded-lg border bg-[var(--bg)] px-2.5 py-1.5 text-xs"
              />
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="Email"
                required
                className="rounded-lg border bg-[var(--bg)] px-2.5 py-1.5 text-xs"
              />
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="rounded-lg border bg-[var(--bg)] px-2 py-1.5 text-xs"
              >
                <option value="Owner">Owner</option>
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Analyst">Analyst</option>
              </select>
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Invite
              </button>
            </form>

            <div className="divide-y rounded-lg border">
              {wsMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2.5 text-xs">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-[var(--muted)]">{m.email}</div>
                  </div>
                  <span className="rounded border px-2 py-0.5 font-medium">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

