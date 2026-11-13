import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import BioPageClient from "@/components/BioPageClient";

export const instant = false;

export default async function PublicBioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const db = getDb();

  const { rows } = await db.query<Record<string, unknown>>(
    "SELECT * FROM bio_pages WHERE slug = ?",
    [slug]
  );
  const row = rows[0];

  if (!row) return notFound();

  await db.run("UPDATE bio_pages SET views = views + 1 WHERE id = ?", [String(row.id)]);

  const { rows: forms } = await db.query<Record<string, unknown>>(
    "SELECT * FROM forms WHERE workspace_id = ?",
    [String(row.workspace_id)]
  );

  const pageData = {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    bio: String(row.bio),
    avatarText: String(row.avatar_text),
    theme: JSON.parse(String(row.theme_json || "{}")),
    blocks: JSON.parse(String(row.blocks_json || "[]")),
    views: Number(row.views || 0) + 1,
  };

  const parsedForms = forms.map((f) => ({
    id: String(f.id),
    title: String(f.title),
    kind: String(f.kind),
    fields: JSON.parse(String(f.fields_json || "[]")),
  }));

  return <BioPageClient page={pageData} forms={parsedForms} />;
}
