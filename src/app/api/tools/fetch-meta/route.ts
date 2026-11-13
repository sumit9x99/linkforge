import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rawUrl = String(body.url || "").trim();
  if (!rawUrl) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    const res = await fetch(target.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkForge-Inspector/1.0)" },
    });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const favicon = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i);

    const analyticsDetected: string[] = [];
    if (/googletagmanager\.com|gtag\(/i.test(html)) analyticsDetected.push("Google Analytics / GTM");
    if (/connect\.facebook\.net|fbq\(/i.test(html)) analyticsDetected.push("Meta Pixel");
    if (/analytics\.tiktok\.com|ttq\./i.test(html)) analyticsDetected.push("TikTok Pixel");
    if (/plausible\.io/i.test(html)) analyticsDetected.push("Plausible Analytics");
    if (/static\.hotjar\.com/i.test(html)) analyticsDetected.push("Hotjar");
    if (/clarity\.ms/i.test(html)) analyticsDetected.push("Microsoft Clarity");

    const outgoingLinks = Array.from(html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi))
      .map((m) => m[1])
      .slice(0, 20);

    return NextResponse.json({
      finalUrl: res.url,
      status: res.status,
      title: ogTitle?.[1] || titleMatch?.[1] || "",
      description: descMatch?.[1] || "",
      ogImage: ogImage?.[1] || "",
      favicon: favicon?.[1] ? new URL(favicon[1], res.url).toString() : `${target.origin}/favicon.ico`,
      analyticsDetected,
      outgoingLinks,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch URL" },
      { status: 502 }
    );
  }
}

