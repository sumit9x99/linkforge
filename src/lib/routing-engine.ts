export type SmartRule = {
  id: string;
  field: "country" | "os" | "device" | "language" | "referrer";
  operator: "equals" | "contains";
  value: string;
  targetUrl: string;
};

export type AbVariant = {
  id: string;
  label: string;
  url: string;
  weight: number;
};

export type MultiShieldConfig = {
  enabled: boolean;
  blockBots: boolean;
  blockVpns: boolean;
  safeInterstitial: boolean;
  blockedCountries: string[];
  fallbackUrl?: string;
};

export type DeepLinkConfig = {
  enabled: boolean;
  platform: "auto" | "instagram" | "tiktok" | "youtube" | "x" | "telegram" | "snapchat";
};

export type UtmConfig = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

export type RequestContext = {
  userAgent: string;
  country: string;
  language: string;
  referrer: string;
  headers: Record<string, string | undefined>;
  random?: number;
};

export type LinkConfig = {
  destinationUrl: string;
  smartRules: SmartRule[];
  abEnabled: boolean;
  abVariants: AbVariant[];
  multiShield: MultiShieldConfig;
  deepLink: DeepLinkConfig;
  utm?: UtmConfig;
};

const BOT_UA_RE =
  /(bot|crawler|spider|headless|puppeteer|playwright|selenium|curl|wget|python-requests|go-http-client|slurp|bingpreview|facebookexternalhit|bytespider)/i;

const VPN_HEADER_KEYS = ["x-vpn-exit", "x-tor-exit", "via", "forwarded"];

export function parseUserAgent(ua: string): { os: string; device: string; browser: string } {
  const lower = ua.toLowerCase();
  let os = "Other";
  if (/iphone|ipad|ipod/.test(lower)) os = "iOS";
  else if (/android/.test(lower)) os = "Android";
  else if (/windows/.test(lower)) os = "Windows";
  else if (/mac os x|macintosh/.test(lower)) os = "macOS";
  else if (/linux/.test(lower)) os = "Linux";

  const device = /mobile|iphone|android.*mobile/.test(lower)
    ? "Mobile"
    : /ipad|tablet/.test(lower)
      ? "Tablet"
      : "Desktop";

  let browser = "Other";
  if (/edg\//.test(lower)) browser = "Edge";
  else if (/chrome\//.test(lower) && !/chromium/.test(lower)) browser = "Chrome";
  else if (/safari\//.test(lower) && !/chrome/.test(lower)) browser = "Safari";
  else if (/firefox\//.test(lower)) browser = "Firefox";

  return { os, device, browser };
}

export function evaluateMultiShield(
  shield: MultiShieldConfig,
  ctx: RequestContext
): { blocked: boolean; reason: string | null } {
  if (!shield.enabled) return { blocked: false, reason: null };

  if (shield.blockBots && BOT_UA_RE.test(ctx.userAgent)) {
    return { blocked: true, reason: "bot_signature" };
  }

  if (shield.blockVpns) {
    const hasProxyHeader = VPN_HEADER_KEYS.some((k) => {
      const val = ctx.headers[k];
      return Boolean(val && /tor|vpn|proxy/i.test(val));
    });
    if (hasProxyHeader) {
      return { blocked: true, reason: "vpn_proxy_header" };
    }
  }

  const countryUpper = ctx.country.toUpperCase();
  if (shield.blockedCountries.map((c) => c.toUpperCase()).includes(countryUpper)) {
    return { blocked: true, reason: `geo_blocked:${countryUpper}` };
  }

  return { blocked: false, reason: null };
}

export function matchSmartRoute(
  rules: SmartRule[],
  ctx: RequestContext,
  parsed: { os: string; device: string }
): SmartRule | null {
  for (const rule of rules) {
    let actual = "";
    if (rule.field === "country") actual = ctx.country;
    else if (rule.field === "os") actual = parsed.os;
    else if (rule.field === "device") actual = parsed.device;
    else if (rule.field === "language") actual = ctx.language;
    else if (rule.field === "referrer") actual = ctx.referrer;

    const a = actual.toLowerCase();
    const v = rule.value.toLowerCase();
    if (rule.operator === "equals" && a === v) return rule;
    if (rule.operator === "contains" && v && a.includes(v)) return rule;
  }
  return null;
}

export function pickAbVariant(variants: AbVariant[], rand = Math.random()): AbVariant | null {
  if (!variants.length) return null;
  const total = variants.reduce((sum, v) => sum + Math.max(0, v.weight), 0);
  if (total <= 0) return variants[0];
  let cursor = rand * total;
  for (const variant of variants) {
    cursor -= Math.max(0, variant.weight);
    if (cursor <= 0) return variant;
  }
  return variants[variants.length - 1];
}

export function buildDeepLinkUri(
  targetUrl: string,
  platform: DeepLinkConfig["platform"],
  os: string
): string | null {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const path = parsed.pathname.replace(/^\/+/, "");
  const effective =
    platform !== "auto"
      ? platform
      : host.includes("instagram.com")
        ? "instagram"
        : host.includes("tiktok.com")
          ? "tiktok"
          : host.includes("youtube.com") || host === "youtu.be"
            ? "youtube"
            : host.includes("x.com") || host.includes("twitter.com")
              ? "x"
              : host.includes("t.me") || host.includes("telegram.me")
                ? "telegram"
                : host.includes("snapchat.com")
                  ? "snapchat"
                  : null;

  if (!effective) return null;
  const handle = path.split("/")[0] || "";

  switch (effective) {
    case "instagram":
      return handle ? `instagram://user?username=${encodeURIComponent(handle)}` : "instagram://app";
    case "tiktok":
      return handle ? `snssdk1233://user/profile/${encodeURIComponent(handle.replace(/^@/, ""))}` : "snssdk1233://";
    case "youtube":
      return os === "Android"
        ? `vnd.youtube://${parsed.hostname}${parsed.pathname}${parsed.search}`
        : `youtube://${parsed.hostname}${parsed.pathname}${parsed.search}`;
    case "x":
      return handle ? `twitter://user?screen_name=${encodeURIComponent(handle)}` : "twitter://";
    case "telegram":
      return handle ? `tg://resolve?domain=${encodeURIComponent(handle)}` : "tg://";
    case "snapchat":
      return handle ? `snapchat://add/${encodeURIComponent(handle)}` : "snapchat://";
    default:
      return null;
  }
}

export function appendTrackingParams(rawUrl: string, utm?: UtmConfig): string {
  if (!utm) return rawUrl;
  try {
    const u = new URL(rawUrl);
    if (utm.source) u.searchParams.set("utm_source", utm.source);
    if (utm.medium) u.searchParams.set("utm_medium", utm.medium);
    if (utm.campaign) u.searchParams.set("utm_campaign", utm.campaign);
    if (utm.term) u.searchParams.set("utm_term", utm.term);
    if (utm.content) u.searchParams.set("utm_content", utm.content);
    return u.toString();
  } catch {
    return rawUrl;
  }
}

export function resolveTargetUrl(link: LinkConfig, ctx: RequestContext) {
  const parsed = parseUserAgent(ctx.userAgent);
  const shieldResult = evaluateMultiShield(link.multiShield, ctx);

  if (shieldResult.blocked) {
    return {
      blocked: true,
      reason: shieldResult.reason,
      targetUrl: link.multiShield.fallbackUrl || null,
      variantId: null,
      deepLinkUri: null,
      parsed,
      safeInterstitial: false,
    };
  }

  let targetUrl = link.destinationUrl;
  let variantId: string | null = null;

  const matchedRule = matchSmartRoute(link.smartRules, ctx, parsed);
  if (matchedRule) {
    targetUrl = matchedRule.targetUrl;
  } else if (link.abEnabled && link.abVariants.length > 0) {
    const picked = pickAbVariant(link.abVariants, ctx.random);
    if (picked) {
      targetUrl = picked.url;
      variantId = picked.id;
    }
  }

  targetUrl = appendTrackingParams(targetUrl, link.utm);
  const deepLinkUri = link.deepLink.enabled
    ? buildDeepLinkUri(targetUrl, link.deepLink.platform, parsed.os)
    : null;

  return {
    blocked: false,
    reason: null,
    targetUrl,
    variantId,
    deepLinkUri,
    parsed,
    safeInterstitial: link.multiShield.enabled && link.multiShield.safeInterstitial,
  };
}

export function computeTrafficQuality(total: number, blocked: number): number {
  if (total <= 0) return 100;
  const cleanRatio = Math.max(0, total - blocked) / total;
  return Math.round(cleanRatio * 100);
}

