import assert from "node:assert/strict";
import {
  resolveTargetUrl,
  appendTrackingParams,
  computeTrafficQuality,
  buildDeepLinkUri,
} from "../src/lib/routing-engine.ts";

// 1. MultiShield blocks bots
const botRes = resolveTargetUrl(
  {
    destinationUrl: "https://instagram.com/creators",
    smartRules: [],
    abEnabled: false,
    abVariants: [],
    multiShield: { enabled: true, blockBots: true, blockVpns: false, safeInterstitial: false, blockedCountries: [] },
    deepLink: { enabled: true, platform: "instagram" },
  },
  { userAgent: "curl/8.0.1", country: "US", language: "en-US", referrer: "direct", headers: {} }
);
assert.equal(botRes.blocked, true);
assert.equal(botRes.reason, "bot_signature");

// 2. Smart routing matches OS
const iosRes = resolveTargetUrl(
  {
    destinationUrl: "https://example.com/web",
    smartRules: [{ id: "1", field: "os", operator: "equals", value: "iOS", targetUrl: "https://apps.apple.com/1" }],
    abEnabled: false,
    abVariants: [],
    multiShield: { enabled: true, blockBots: true, blockVpns: false, safeInterstitial: false, blockedCountries: [] },
    deepLink: { enabled: false, platform: "auto" },
  },
  { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", country: "US", language: "en-US", referrer: "direct", headers: {} }
);
assert.equal(iosRes.blocked, false);
assert.equal(iosRes.targetUrl, "https://apps.apple.com/1");

// 3. A/B deterministic split
const abRes = resolveTargetUrl(
  {
    destinationUrl: "https://example.com/a",
    smartRules: [],
    abEnabled: true,
    abVariants: [
      { id: "a", label: "A", url: "https://example.com/a", weight: 50 },
      { id: "b", label: "B", url: "https://example.com/b", weight: 50 },
    ],
    multiShield: { enabled: false, blockBots: false, blockVpns: false, safeInterstitial: false, blockedCountries: [] },
    deepLink: { enabled: false, platform: "auto" },
  },
  { userAgent: "Mozilla/5.0", country: "US", language: "en", referrer: "direct", headers: {}, random: 0.9 }
);
assert.equal(abRes.variantId, "b");
assert.equal(abRes.targetUrl, "https://example.com/b");

// 4. DeepLink URI + UTM + Quality Score
assert.equal(buildDeepLinkUri("https://instagram.com/creators", "auto", "iOS"), "instagram://user?username=creators");
assert.equal(appendTrackingParams("https://example.com/", { source: "ig" }), "https://example.com/?utm_source=ig");
assert.equal(computeTrafficQuality(100, 15), 85);

console.log("ALL_ROUTING_TESTS_PASSED");

