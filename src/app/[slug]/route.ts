import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { resolveTargetUrl } from "@/lib/routing-engine";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const db = getDb();

  const { rows } = await db.query<Record<string, unknown>>(
    "SELECT * FROM links WHERE slug = ? AND active = 1",
    [slug]
  );
  const link = rows[0];

  if (!link) {
    return NextResponse.json({ error: "Link not found or paused" }, { status: 404 });
  }

  const ua = req.headers.get("user-agent") || "";
  const country =
    req.nextUrl.searchParams.get("country") ||
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "US";
  const lang = req.headers.get("accept-language")?.split(",")[0] || "en-US";
  const referrer = req.headers.get("referer") || "direct";

  const headersMap: Record<string, string | undefined> = {};
  req.headers.forEach((v, k) => {
    headersMap[k.toLowerCase()] = v;
  });

  const outcome = resolveTargetUrl(
    {
      destinationUrl: String(link.destination_url),
      smartRules: JSON.parse(String(link.smart_rules_json || "[]")),
      abEnabled: Boolean(link.ab_enabled),
      abVariants: JSON.parse(String(link.ab_variants_json || "[]")),
      multiShield: JSON.parse(String(link.multishield_json || "{}")),
      deepLink: JSON.parse(String(link.deeplink_json || "{}")),
      utm: JSON.parse(String(link.utm_json || "{}")),
    },
    { userAgent: ua, country, language: lang, referrer, headers: headersMap }
  );

  await db.run(
    `INSERT INTO clicks (id, link_id, workspace_id, variant_id, country, os, device, browser, referrer, blocked, block_reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `clk_${crypto.randomBytes(4).toString("hex")}`,
      String(link.id),
      String(link.workspace_id),
      outcome.variantId,
      country.toUpperCase(),
      outcome.parsed.os,
      outcome.parsed.device,
      outcome.parsed.browser,
      referrer,
      outcome.blocked ? 1 : 0,
      outcome.reason,
      new Date().toISOString(),
    ]
  );

  if (outcome.blocked) {
    if (outcome.targetUrl) {
      return NextResponse.redirect(outcome.targetUrl, 302);
    }
    return new NextResponse(
      `<!doctype html><html><body style="font-family:system-ui;padding:48px;text-align:center"><h2>Access Filtered by MultiShield</h2><p>Reason: ${outcome.reason}</p></body></html>`,
      { status: 403, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const finalUrl = outcome.targetUrl || String(link.destination_url);

  if (outcome.deepLinkUri || outcome.safeInterstitial) {
    const safeEscaped = finalUrl.replace(/"/g, "&quot;");
    const deepEscaped = (outcome.deepLinkUri || "").replace(/"/g, "&quot;");
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Opening link…</title>
  <meta http-equiv="refresh" content="2;url=${safeEscaped}" />
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#fafafa;font-family:system-ui,sans-serif">
  <div style="text-align:center;max-width:380px;padding:24px">
    <p style="font-size:15px;margin:0 0 16px;color:#a1a1aa">Redirecting safely via LinkForge…</p>
    <a href="${safeEscaped}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none;font-weight:500">Continue to destination</a>
  </div>
  <script>
    ${deepEscaped ? `setTimeout(function(){ window.location.href = "${deepEscaped}"; }, 80);` : ""}
    setTimeout(function(){ window.location.replace("${safeEscaped}"); }, 900);
  </script>
</body>
</html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.redirect(finalUrl, 302);
}
