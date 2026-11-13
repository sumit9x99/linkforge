"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  Layers,
  Link2,
  Menu,
  Moon,
  Shield,
  Sun,
  Users,
  Webhook,
  Wrench,
  X,
} from "lucide-react";
import { useWorkspace } from "./WorkspaceContext";

const NAV_ITEMS = [
  { href: "/", label: "Links", icon: Link2 },
  { href: "/pages", label: "Bio Pages", icon: Layers },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/forms", label: "Forms & Quizzes", icon: FileText },
  { href: "/shield", label: "Shield & Radar", icon: Shield },
  { href: "/tools", label: "Tools (19)", icon: Wrench },
  { href: "/integrations", label: "API & Integrations", icon: Webhook },
  { href: "/team", label: "Team & Workspaces", icon: Users },
];

export default function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, theme, toggleTheme } =
    useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-[var(--surface-2)] md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect width="24" height="24" rx="6" fill="var(--accent)" />
            <path
              d="M8.5 14.5L14.5 8.5M10 8H16V14"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-base font-semibold tracking-tight">LinkForge</span>
        </div>

        <div className="border-b p-3">
          <label className="sr-only" htmlFor="ws-select">
            Active workspace
          </label>
          <select
            id="ws-select"
            value={activeWorkspaceId}
            onChange={(e) => setActiveWorkspaceId(e.target.value)}
            className="w-full rounded-md border bg-[var(--surface)] px-2.5 py-1.5 text-sm font-medium text-[var(--ink)]"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">{navContent}</div>

        <div className="border-t p-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg border bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
          >
            <span>{theme === "dark" ? "Dark surface" : "Light surface"}</span>
            {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col border-r bg-[var(--surface-2)]">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="font-semibold">LinkForge</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded p-1 text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-[var(--surface)] px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-md border p-1.5 text-[var(--muted)] md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

