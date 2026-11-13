"use client";

import React, { useState } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

type BioBlock = {
  id: string;
  type: "link" | "form";
  label: string;
  url?: string;
  badge?: string;
  formId?: string;
};

type FormDef = {
  id: string;
  title: string;
  kind: string;
  fields: Array<{
    id: string;
    label: string;
    type: string;
    options?: string[];
    required?: boolean;
  }>;
};

export default function BioPageClient({
  page,
  forms,
}: {
  page: {
    id: string;
    slug: string;
    title: string;
    bio: string;
    avatarText: string;
    theme: { bg?: string; accent?: string };
    blocks: BioBlock[];
    views: number;
  };
  forms: FormDef[];
}) {
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});

  const accent = page.theme.accent || "#2563eb";
  const bg = page.theme.bg || "#09090b";

  async function submitForm(e: React.FormEvent, formId: string) {
    e.preventDefault();
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "submit", formId, payload: values[formId] || {} }),
    });
    if (res.ok) {
      setSubmitted((prev) => ({ ...prev, [formId]: true }));
    }
  }

  return (
    <div
      className="min-h-screen px-4 py-12 text-white"
      style={{ background: bg }}
    >
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ background: accent }}
          >
            {page.avatarText}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-2 max-w-sm text-sm text-zinc-300">{page.bio}</p>
        </div>

        <div className="space-y-3">
          {page.blocks.map((block) => {
            if (block.type === "link") {
              return (
                <a
                  key={block.id}
                  href={block.url || "#"}
                  className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm font-medium transition hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <span>{block.label}</span>
                    {block.badge && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: accent }}
                      >
                        {block.badge}
                      </span>
                    )}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-zinc-400" />
                </a>
              );
            }

            const form = forms.find((f) => f.id === block.formId);
            if (!form) return null;

            return (
              <div
                key={block.id}
                className="rounded-xl border border-white/15 bg-white/5 p-4"
              >
                <h2 className="mb-3 text-sm font-semibold">{block.label || form.title}</h2>
                {submitted[form.id] ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Response saved. Thank you.</span>
                  </div>
                ) : (
                  <form onSubmit={(e) => submitForm(e, form.id)} className="space-y-2.5">
                    {form.fields.map((field) => (
                      <div key={field.id}>
                        <label className="mb-1 block text-xs text-zinc-300">
                          {field.label}
                        </label>
                        {field.type === "select" ? (
                          <select
                            required={field.required}
                            onChange={(e) =>
                              setValues((prev) => ({
                                ...prev,
                                [form.id]: { ...prev[form.id], [field.label]: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                          >
                            <option value="">Select…</option>
                            {(field.options || []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || "text"}
                            required={field.required}
                            onChange={(e) =>
                              setValues((prev) => ({
                                ...prev,
                                [form.id]: { ...prev[form.id], [field.label]: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                          />
                        )}
                      </div>
                    ))}
                    <button
                      type="submit"
                      className="mt-2 w-full rounded-lg px-4 py-2 text-sm font-medium text-white"
                      style={{ background: accent }}
                    >
                      Submit
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

