"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  custom_domain: string;
  white_label: number;
};

export type TeamMember = {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  role: string;
};

type WorkspaceContextValue = {
  workspaces: Workspace[];
  members: TeamMember[];
  activeWorkspaceId: string;
  activeWorkspace: Workspace | undefined;
  setActiveWorkspaceId: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  theme: "light" | "dark";
  toggleTheme: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("ws_main");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("lf_theme") as "light" | "dark" | null;
    const initial = saved || "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("lf_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    const res = await fetch("/api/workspaces");
    if (!res.ok) return;
    const data = await res.json();
    setWorkspaces(data.workspaces || []);
    setMembers(data.members || []);
  }, []);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        members,
        activeWorkspaceId: activeWorkspace?.id || activeWorkspaceId,
        activeWorkspace,
        setActiveWorkspaceId,
        refreshWorkspaces,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

