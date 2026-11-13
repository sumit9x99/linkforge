"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useWorkspace } from "@/components/WorkspaceContext";

type FormItem = {
  id: string;
  title: string;
  kind: string;
  fields: Array<{ id: string; label: string; type: string; required?: boolean }>;
};

type Submission = {
  id: string;
  formId: string;
  payload: Record<string, string>;
  createdAt: string;
};

export default function FormsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"form" | "quiz">("form");
  const [fieldsText, setFieldsText] = useState("Full Name, Email Address, Primary Channel");

  const load = useCallback(async () => {
    const res = await fetch(`/api/forms?workspaceId=${encodeURIComponent(activeWorkspaceId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setForms(data.forms || []);
    setSubmissions(data.submissions || []);
  }, [activeWorkspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createForm(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const fields = fieldsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label, idx) => ({
        id: `f_${idx}`,
        label,
        type: /email/i.test(label) ? "email" : "text",
        required: true,
      }));

    await fetch("/api/forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: activeWorkspaceId, title: title.trim(), kind, fields }),
    });
    setTitle("");
    await load();
  }

  return (
    <AppShell title="Forms & Quizzes">
      <div className="mx-auto max-w-6xl space-y-6">
        <form
          onSubmit={createForm}
          className="grid gap-3 rounded-xl border bg-[var(--surface)] p-4 md:grid-cols-[1fr_140px_1.5fr_auto]"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Form or quiz title…"
            required
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "form" | "quiz")}
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="form">Lead Form</option>
            <option value="quiz">Quiz</option>
          </select>
          <input
            value={fieldsText}
            onChange={(e) => setFieldsText(e.target.value)}
            placeholder="Comma-separated fields"
            className="rounded-lg border bg-[var(--bg)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            <span>Create</span>
          </button>
        </form>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Active Forms ({forms.length})</h2>
            {forms.map((f) => (
              <div key={f.id} className="rounded-xl border bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{f.title}</span>
                  <span className="rounded border px-2 py-0.5 text-[11px] uppercase text-[var(--muted)]">
                    {f.kind}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.fields.map((fld) => (
                    <span
                      key={fld.id}
                      className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--muted)]"
                    >
                      {fld.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border bg-[var(--surface)]">
            <div className="border-b px-4 py-3 text-sm font-semibold">
              Submissions ({submissions.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-[var(--surface-2)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-2.5">Form ID</th>
                  <th className="px-4 py-2.5">Captured Fields</th>
                  <th className="px-4 py-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 font-mono text-[var(--accent)]">{s.formId}</td>
                    <td className="px-4 py-2.5">
                      {Object.entries(s.payload)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </td>
                    <td className="tabular-nums px-4 py-2.5 text-[var(--muted)]">
                      {s.createdAt.slice(0, 16).replace("T", " ")}
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

